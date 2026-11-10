import { z } from "zod";
import { DECK_COLORS } from "./defaults";
import {
  BLANK_TOKEN,
  canonicalAnswer,
  countBlanks,
  serializeMatching,
  serializeOrdering,
  serializeWordBank,
} from "./interactive";
import type { Deck, Question } from "./types";
import { createId } from "./id";

export const questionTypes = [
  "flashcard",
  "multiple-choice",
  "true-false",
  "fill-blank",
  "short-answer",
  "ordering",
  "matching",
  "word-bank",
] as const;

export const questionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(questionTypes),
  question: z.string().min(1, "Question text is required"),
  answer: z
    .union([z.string(), z.boolean(), z.number()])
    .optional()
    .transform((v) => (v === undefined ? undefined : String(v))),
  options: z.array(z.string()).optional(),
  explanation: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  concept: z.string().optional(),
  hint: z.string().optional(),
  tags: z.array(z.string()).optional(),
  items: z.array(z.string()).optional(),
  pairs: z.array(z.object({ left: z.string(), right: z.string() })).optional(),
  blanks: z.array(z.string()).optional(),
  wordBank: z.array(z.string()).optional(),
  tutor: z
    .object({
      simple: z.string().optional(),
      mnemonic: z.string().optional(),
      example: z.string().optional(),
      whyWrong: z.array(z.object({ option: z.string().min(1), why: z.string().min(1) })).optional(),
    })
    .optional(),
});

type RawQuestion = z.infer<typeof questionSchema>;

/** Turns a validated raw payload into a Question, collecting per-type problems. */
function buildQuestion(
  q: RawQuestion,
  i: number,
  errors: string[],
  warnings: string[],
  id: string,
): Question {
  let answer = q.answer ?? "";

  switch (q.type) {
    case "multiple-choice": {
      if (!q.options || q.options.length < 2) {
        errors.push(`questions[${i}]: multiple-choice questions need at least 2 answer options.`);
      } else if (!q.options.includes(answer)) {
        errors.push(`questions[${i}]: the correct answer isn't one of the options you listed.`);
      }
      break;
    }
    case "true-false": {
      if (!["true", "false"].includes(answer.toLowerCase())) {
        errors.push(`questions[${i}]: a true/false answer must be exactly "true" or "false".`);
      }
      break;
    }
    case "ordering": {
      if (!q.items || q.items.length < 2) {
        errors.push(
          `questions[${i}]: ordering questions need at least 2 items, listed in the correct order.`,
        );
      } else {
        answer = serializeOrdering(q.items);
      }
      break;
    }
    case "matching": {
      if (!q.pairs || q.pairs.length < 2) {
        errors.push(
          `questions[${i}]: matching questions need at least 2 pairs — each with a question side and an answer side.`,
        );
      } else if (q.pairs.some((p) => !p.left.trim() || !p.right.trim())) {
        errors.push(
          `questions[${i}]: every pair needs both the question side and the answer side filled in.`,
        );
      } else {
        answer = serializeMatching(q.pairs);
      }
      break;
    }
    case "word-bank": {
      const slots = countBlanks(q.question);
      if (!q.blanks || !q.blanks.length) {
        errors.push(
          `questions[${i}]: word-bank questions need the correct word for each ${BLANK_TOKEN} blank.`,
        );
      } else if (slots === 0) {
        errors.push(
          `questions[${i}]: word-bank questions must include at least one ${BLANK_TOKEN} placeholder in the question text.`,
        );
      } else if (slots !== q.blanks.length) {
        errors.push(
          `questions[${i}]: there are ${slots} ${BLANK_TOKEN} blank(s) in the question but ${q.blanks.length} answer word(s).`,
        );
      } else {
        answer = serializeWordBank(q.blanks);
        if (!q.wordBank || q.wordBank.length <= q.blanks.length) {
          warnings.push(
            `questions[${i}]: no extra wrong words in "wordBank" — the blanks will be easy to guess.`,
          );
        }
      }
      break;
    }
    default:
      break;
  }

  if (!answer && q.type !== "ordering" && q.type !== "matching" && q.type !== "word-bank") {
    errors.push(`questions[${i}]: this ${q.type} question is missing its correct answer.`);
  }

  const built: Question = {
    id,
    type: q.type,
    question: q.question,
    answer,
    options: q.options,
    explanation: q.explanation,
    difficulty: q.difficulty,
    concept: q.concept,
    hint: q.hint,
    tags: q.tags,
    tutor: q.tutor,
    items: q.items,
    pairs: q.pairs,
    blanks: q.blanks,
    wordBank: q.wordBank,
  };
  built.answer = canonicalAnswer(built);
  return built;
}

export const deckSchema = z.object({
  title: z.string().min(1, "Deck title is required"),
  subject: z.string().default("General"),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isSTEM: z.boolean().optional(),
  needsEquations: z.boolean().optional(),
  needsGraphs: z.boolean().optional(),
  questions: z.array(questionSchema).min(1, "A deck needs at least one question"),
});

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  deck?: Deck;
}

const uid = () => createId();

export function validateDeckJson(raw: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return {
      ok: false,
      errors: [`That text isn't valid JSON — ${(e as Error).message}`],
      warnings,
    };
  }

  if (Array.isArray(data)) {
    data = { title: "Imported Deck", subject: "General", questions: data };
    warnings.push(
      "You pasted a plain list of questions — we made a new deck named “Imported Deck” for them.",
    );
  }

  const parsed = deckSchema.safeParse(data);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${issue.path.join(".") || "root"}: ${issue.message}`);
    }
    return { ok: false, errors, warnings };
  }

  const questions: Question[] = parsed.data.questions.map((q, i) => {
    if (!q.explanation)
      warnings.push(`questions[${i}]: no explanation given — adding one makes review stronger.`);
    if (!q.concept)
      warnings.push(`questions[${i}]: no topic tag — your weak-topic page has less to work with.`);
    return buildQuestion(q, i, errors, warnings, q.id || uid());
  });

  if (errors.length) return { ok: false, errors, warnings };

  const deck: Deck = {
    id: uid(),
    title: parsed.data.title,
    subject: parsed.data.subject,
    description: parsed.data.description,
    color: DECK_COLORS[Math.floor(Math.random() * DECK_COLORS.length)],
    tags: parsed.data.tags,
    isSTEM: parsed.data.isSTEM,
    needsEquations: parsed.data.needsEquations,
    needsGraphs: parsed.data.needsGraphs,
    createdAt: Date.now(),
    favorite: false,
    questions,
    masteredIds: [],
    bookmarks: [],
    notes: {},
  };

  return { ok: true, errors, warnings: warnings.slice(0, 12), deck };
}

export const SAMPLE_DECK_JSON = `{
  "title": "Cell Biology — Membranes & Transport",
  "subject": "Biology",
  "description": "Core concepts on membrane structure and transport mechanisms.",
  "tags": ["biology", "cells", "exam-prep"],
  "questions": [
    {
      "type": "multiple-choice",
      "question": "Which model best describes the plasma membrane?",
      "options": [
        "Fluid mosaic model",
        "Rigid lattice model",
        "Static bilayer model",
        "Protein shell model"
      ],
      "answer": "Fluid mosaic model",
      "explanation": "Lipids and proteins move laterally, forming a fluid mosaic.",
      "difficulty": "easy",
      "concept": "Membrane structure",
      "hint": "The name describes proteins drifting in a sea of lipid.",
      "tutor": {
        "simple": "The membrane is not a wall. It is a moving soup of fat with protein chunks floating around in it, so it can bend, seal and let things through.",
        "mnemonic": "MOSAIC = Molecules On the Surface And Inside Constantly — the pieces are always shuffling.",
        "example": "Think of oil and water in a jar that never fully settles: the oil slides around, and little protein droplets travel through it.",
        "whyWrong": [
          {
            "option": "Rigid lattice model",
            "why": "A lattice cannot bend, but membranes must flex to pinch off vesicles and let cells change shape."
          },
          {
            "option": "Static bilayer model",
            "why": "A static bilayer denies the lateral movement proved by FRAP experiments, where labelled proteins spread across the membrane."
          },
          {
            "option": "Protein shell model",
            "why": "Proteins are scattered through the bilayer, not a shell around it; the lipid is the continuous part."
          }
        ]
      },
      "tags": ["membranes", "models"]
    },
    {
      "type": "true-false",
      "question": "Facilitated diffusion requires ATP.",
      "answer": "false",
      "explanation": "It is passive; it uses the concentration gradient, not ATP.",
      "difficulty": "medium",
      "concept": "Passive transport",
      "hint": "The word 'facilitated' means helped, not powered.",
      "tutor": {
        "simple": "Facilitated diffusion means a channel protein helps a molecule cross the membrane, but the molecule still goes downhill — following the concentration gradient. No energy is paid.",
        "mnemonic": "Facilitated = helped by a channel. Diffusion = still goes downhill. No ATP paid.",
        "example": "Glucose entering a red blood cell through GLUT1 is facilitated diffusion: the channel helps it cross, but glucose flows from high concentration outside the cell to low concentration inside.",
        "whyWrong": [
          {
            "option": "True",
            "why": "Active transport requires ATP because it works uphill. Facilitated diffusion is passive and always follows the gradient."
          }
        ]
      },
      "tags": ["passive transport", "diffusion"]
    },
    {
      "type": "fill-blank",
      "question": "The sodium-potassium pump moves ___ sodium ions out per cycle.",
      "answer": "3",
      "explanation": "3 Na+ out, 2 K+ in, per ATP hydrolysed.",
      "difficulty": "medium",
      "concept": "Active transport",
      "hint": "Think about why it is called the sodium-potassium pump: how many sodiums versus how many potassiums?",
      "tutor": {
        "simple": "Every time the pump uses one ATP, it moves 3 sodium ions OUT of the cell and 2 potassium ions IN. The numbers are hardwired into the pump's structure.",
        "mnemonic": "3 Na OUT, 2 K IN, per ATP spent.",
        "example": "In each cycle: 3 Na+ leave, 2 K+ enter. The pump is never 1-to-1 — it always favours sodium export.",
        "whyWrong": []
      },
      "tags": ["active transport", "ion pumps"]
    },
    {
      "type": "short-answer",
      "question": "Define osmosis in one sentence.",
      "answer": "The movement of water across a semipermeable membrane from low to high solute concentration.",
      "explanation": "Water follows the solute gradient.",
      "difficulty": "medium",
      "concept": "Osmosis",
      "tutor": {
        "simple": "Osmosis is water moving to the crowded side. The water goes where there is more dissolved stuff, trying to even things out.",
        "mnemonic": "Water follows salt.",
        "example": "Put a raisin in water: the inside is saltier, so water moves in and the raisin plumps up."
      }
    },
    {
      "type": "flashcard",
      "question": "Hypertonic solution",
      "answer": "A solution with higher solute concentration than the cell, causing water to leave the cell.",
      "difficulty": "easy",
      "concept": "Tonicity",
      "hint": "Hyper- means more; tonic means solute concentration.",
      "tutor": {
        "simple": "Hypertonic means the solution around the cell has MORE dissolved stuff than inside the cell. Water always moves toward the higher salt concentration, so water leaves the cell and it shrivels.",
        "mnemonic": "HYPERtonic = solution has a HYPERamount of salt. Water leaves = cell shrinks.",
        "example": "Putting a cell in salt water (hypertonic) makes it shrivel, like a raisin. The water inside moves out toward the salty outside.",
        "whyWrong": []
      },
      "explanation": "Hypertonic solutions have more dissolved particles outside the cell than inside, causing water to move out by osmosis.",
      "tags": ["tonicity", "osmosis"]
    },
    {
      "type": "ordering",
      "question": "Arrange the steps of the sodium-potassium pump cycle.",
      "items": [
        "3 Na+ bind to the pump inside the cell",
        "ATP is hydrolysed and the pump is phosphorylated",
        "The pump changes shape and releases Na+ outside",
        "2 K+ bind and the phosphate is released",
        "The pump returns to its original shape, releasing K+ inside"
      ],
      "explanation": "Each conformational change is driven by phosphorylation then dephosphorylation.",
      "difficulty": "hard",
      "concept": "Active transport",
      "hint": "ATP binding and hydrolysis cause the shape changes; potassium comes in after sodium goes out.",
      "tutor": {
        "simple": "The pump is a shape-shifter. When ATP sticks and breaks, it triggers shape changes that move ions. Sodium escapes on one conformation, potassium enters on the next.",
        "mnemonic": "Bind Na+ → zap ATP → pump flips → Na+ out → K+ in → pump flips back.",
        "example": "Like a turnstile that takes a coin (ATP), rotates (shape change), lets 3 people out one side and 2 people in from the other.",
        "whyWrong": []
      },
      "tags": ["active transport", "mechanism"]
    },
    {
      "type": "matching",
      "question": "Match each transport process with its description.",
      "pairs": [
        { "left": "Osmosis", "right": "Water moves down its own gradient" },
        { "left": "Facilitated diffusion", "right": "Solutes cross via proteins, no ATP" },
        { "left": "Active transport", "right": "Solutes move against a gradient using ATP" },
        { "left": "Endocytosis", "right": "Material enters the cell in a vesicle" }
      ],
      "difficulty": "medium",
      "concept": "Transport mechanisms",
      "explanation": "Each mechanism has a distinct energy requirement and purpose.",
      "hint": "Two are passive, one uses ATP, one uses vesicles. Look for keywords like 'water', 'protein', 'ATP', 'vesicle'.",
      "tutor": {
        "simple": "Osmosis is water following salt. Facilitated diffusion is molecules following their gradient through a channel (passive, no energy). Active transport is molecules being pushed against their gradient (costs ATP). Endocytosis is a vesicle engulfing material (also costs ATP).",
        "mnemonic": "Osmosis = water moves. Facilitated = passive, with help. Active = costs ATP. Endocytosis = vesicle eats.",
        "example": "A cell swelling in pure water is osmosis. Glucose entering through GLUT1 is facilitated diffusion. The Na+ gradient built by the pump is active transport. Eating bacteria is endocytosis.",
        "whyWrong": []
      },
      "tags": ["transport mechanisms", "comparison"]
    },
    {
      "type": "word-bank",
      "question": "In a ___ solution the cell swells, while in a ___ solution it shrinks.",
      "blanks": ["hypotonic", "hypertonic"],
      "wordBank": ["hypotonic", "hypertonic", "isotonic", "amphipathic"],
      "explanation": "Water always moves toward the higher solute concentration.",
      "difficulty": "medium",
      "concept": "Tonicity",
      "hint": "Hypo- means less salt (cell swells as water enters), hyper- means more salt (cell shrinks as water leaves).",
      "tutor": {
        "simple": "Hypotonic = fewer dissolved particles outside, so water enters the cell and it swells. Hypertonic = more dissolved particles outside, so water leaves the cell and it shrinks.",
        "mnemonic": "Hypotonic = cell swells. Hypertonic = cell shrinks. Water always follows the salt.",
        "example": "Put a cell in pure water (hypotonic): it balloons. Put a cell in salt water (hypertonic): it shrivels like a raisin.",
        "whyWrong": []
      },
      "tags": ["tonicity", "osmosis", "solutions"]
    }
  ]
}`;

export const FIELD_DOCS: { field: string; type: string; required: boolean; note: string }[] = [
  { field: "title", type: "string", required: true, note: "Deck name shown in your library." },
  { field: "subject", type: "string", required: false, note: "Used for grouping and filtering." },
  { field: "description", type: "string", required: false, note: "Short summary of the deck." },
  { field: "tags", type: "string[]", required: false, note: "Free-form tags for search." },
  { field: "questions", type: "Question[]", required: true, note: "At least one question." },
  {
    field: "questions[].type",
    type: '"flashcard" | "multiple-choice" | "true-false" | "fill-blank" | "short-answer" | "ordering" | "matching" | "word-bank"',
    required: true,
    note: "Determines how the question is presented.",
  },
  { field: "questions[].question", type: "string", required: true, note: "The prompt shown." },
  {
    field: "questions[].answer",
    type: "string",
    required: true,
    note: 'Correct answer. Must match an option for multiple-choice; "true"/"false" for true-false. Not needed for ordering, matching or word-bank.',
  },
  {
    field: "questions[].options",
    type: "string[]",
    required: false,
    note: "Required for multiple-choice — 2 to 6 entries.",
  },
  {
    field: "questions[].items",
    type: "string[]",
    required: false,
    note: "Required for ordering — the items listed in their correct sequence (they are shuffled for the learner).",
  },
  {
    field: "questions[].pairs",
    type: "{ left: string; right: string }[]",
    required: false,
    note: "Required for matching — 2+ couples; the right-hand answers are shuffled.",
  },
  {
    field: "questions[].blanks",
    type: "string[]",
    required: false,
    note: "Required for word-bank — the correct word for each ___ placeholder, in order.",
  },
  {
    field: "questions[].wordBank",
    type: "string[]",
    required: false,
    note: "Word-bank pool: the blank answers plus distractor words.",
  },
  {
    field: "questions[].explanation",
    type: "string",
    required: false,
    note: "Shown after answering. Strongly recommended.",
  },
  {
    field: "questions[].difficulty",
    type: '"easy" | "medium" | "hard"',
    required: false,
    note: "Defaults to medium. Powers difficulty filters and analytics.",
  },
  {
    field: "questions[].concept",
    type: "string",
    required: false,
    note: "Topic label — powers weak/strong topic analytics.",
  },
  { field: "questions[].hint", type: "string", required: false, note: "Optional nudge." },
];
/* ------------------------------------------------------------------ *
 * Additional questions (question-pack) schema
 * Used when expanding an existing deck instead of creating a new one.
 * ------------------------------------------------------------------ */

export const questionPackSchema = z.object({
  deckTitle: z.string().optional(),
  questions: z.array(questionSchema).min(1, "A question pack needs at least one question"),
});

export interface QuestionsValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  questions?: Question[];
  deckTitle?: string;
}

/** Validates a questions-only JSON payload (object with `questions`, or a bare array). */
export function validateQuestionsJson(
  raw: string,
  existing: Question[] = [],
): QuestionsValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return {
      ok: false,
      errors: [`That text isn't valid JSON — ${(e as Error).message}`],
      warnings,
    };
  }

  if (Array.isArray(data)) data = { questions: data };
  if (data && typeof data === "object" && !("questions" in data)) {
    warnings.push("We couldn't find the list of questions — check the paste starts with them.");
  }

  const parsed = questionPackSchema.safeParse(data);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${issue.path.join(".") || "root"}: ${issue.message}`);
    }
    return { ok: false, errors, warnings };
  }

  const existingText = new Set(existing.map((q) => q.question.trim().toLowerCase()));

  const questions: Question[] = parsed.data.questions.map((q, i) => {
    if (existingText.has(q.question.trim().toLowerCase())) {
      warnings.push(`questions[${i}]: looks like a duplicate of a question already in this deck.`);
    }
    if (!q.explanation)
      warnings.push(`questions[${i}]: no explanation given — adding one makes review stronger.`);
    return buildQuestion(q, i, errors, warnings, uid());
  });

  if (errors.length) return { ok: false, errors, warnings };
  return {
    ok: true,
    errors,
    warnings: warnings.slice(0, 12),
    questions,
    deckTitle: parsed.data.deckTitle,
  };
}

export const SAMPLE_QUESTIONS_JSON = `{
  "deckTitle": "Cell Biology — Membranes & Transport",
  "questions": [
    {
      "type": "multiple-choice",
      "question": "Which transport protein moves ions against their gradient?",
      "options": ["Pump", "Channel", "Carrier (facilitated)", "Aquaporin"],
      "answer": "Pump",
      "explanation": "Pumps hydrolyse ATP to move ions up a gradient.",
      "difficulty": "medium",
      "concept": "Active transport",
      "hint": "Channels let ions fall down their gradient; this one spends energy to push back.",
      "tutor": {
        "simple": "A pump is the only transport protein that pays ATP to shove ions the wrong way — uphill, against their gradient.",
        "mnemonic": "Pumps PUSH and PAY.",
        "example": "The sodium-potassium pump spends one ATP to push 3 Na+ out and 2 K+ in, both against their gradients.",
        "whyWrong": [
          {
            "option": "Channel",
            "why": "Channels are passive pores: ions only flow through them downhill, never against the gradient."
          },
          {
            "option": "Carrier (facilitated)",
            "why": "Carriers change shape but still follow the gradient; no ATP is spent, so they cannot go uphill."
          },
          {
            "option": "Aquaporin",
            "why": "Aquaporins transport water only, and passively at that."
          }
        ]
      },
      "tags": ["transport", "atp"]
    },
    {
      "type": "short-answer",
      "question": "What drives secondary active transport?",
      "answer": "The electrochemical gradient created by primary active transport.",
      "explanation": "It borrows energy stored in an existing ion gradient.",
      "difficulty": "hard",
      "concept": "Active transport",
      "hint": "Think about what primary active transport creates that secondary active transport can use.",
      "tutor": {
        "simple": "Primary active transport uses ATP to build a gradient of ions. Secondary active transport uses that gradient as an energy source, like a power plant using a dam.",
        "mnemonic": "Primary = builds the gradient (costs ATP). Secondary = coasts on it (free energy).",
        "example": "The Na+ gradient the pump builds can then drive glucose INTO a cell via secondary active transport, piggy-backing on the sodium flow.",
        "whyWrong": []
      },
      "tags": ["active transport", "energy"]
    },
    {
      "type": "word-bank",
      "question": "In a ___ solution the cell swells, while in a ___ solution it shrinks.",
      "blanks": ["hypotonic", "hypertonic"],
      "wordBank": ["hypotonic", "hypertonic", "isotonic", "amphipathic"],
      "explanation": "Water always moves toward the higher solute concentration.",
      "difficulty": "medium",
      "concept": "Tonicity",
      "hint": "Hypo- means less dissolved particles outside (water enters), hyper- means more (water leaves).",
      "tutor": {
        "simple": "Hypotonic solution has fewer dissolved particles outside the cell than inside, so water enters and the cell swells. Hypertonic has more outside, so water leaves and the cell shrinks.",
        "mnemonic": "Hypotonic swells. Hypertonic shrinks. Water follows salt.",
        "example": "Red blood cells in pure water swell and burst (hypotonic). Red blood cells in concentrated salt water shrivel (hypertonic).",
        "whyWrong": []
      },
      "tags": ["tonicity", "osmosis"]
    }
  ]
}`;
