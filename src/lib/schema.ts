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
        errors.push(`questions[${i}]: multiple-choice questions need at least 2 options.`);
      } else if (!q.options.includes(answer)) {
        errors.push(`questions[${i}]: answer "${answer}" is not one of the provided options.`);
      }
      break;
    }
    case "true-false": {
      if (!["true", "false"].includes(answer.toLowerCase())) {
        errors.push(`questions[${i}]: true-false answers must be "true" or "false".`);
      }
      break;
    }
    case "ordering": {
      if (!q.items || q.items.length < 2) {
        errors.push(`questions[${i}]: ordering questions need an "items" array with 2+ entries in the correct order.`);
      } else {
        answer = serializeOrdering(q.items);
      }
      break;
    }
    case "matching": {
      if (!q.pairs || q.pairs.length < 2) {
        errors.push(`questions[${i}]: matching questions need a "pairs" array with 2+ {left, right} entries.`);
      } else if (q.pairs.some((p) => !p.left.trim() || !p.right.trim())) {
        errors.push(`questions[${i}]: every matching pair needs a non-empty "left" and "right".`);
      } else {
        answer = serializeMatching(q.pairs);
      }
      break;
    }
    case "word-bank": {
      const slots = countBlanks(q.question);
      if (!q.blanks || !q.blanks.length) {
        errors.push(`questions[${i}]: word-bank questions need a "blanks" array with the correct word for each ${BLANK_TOKEN}.`);
      } else if (slots === 0) {
        errors.push(`questions[${i}]: word-bank questions must contain at least one ${BLANK_TOKEN} placeholder in the question text.`);
      } else if (slots !== q.blanks.length) {
        errors.push(`questions[${i}]: found ${slots} ${BLANK_TOKEN} placeholder(s) but ${q.blanks.length} blank answer(s).`);
      } else {
        answer = serializeWordBank(q.blanks);
        if (!q.wordBank || q.wordBank.length <= q.blanks.length) {
          warnings.push(`questions[${i}]: no distractor words in "wordBank" — the blanks will be easy to guess.`);
        }
      }
      break;
    }
    default:
      break;
  }

  if (!answer && q.type !== "ordering" && q.type !== "matching" && q.type !== "word-bank") {
    errors.push(`questions[${i}]: an "answer" is required for ${q.type} questions.`);
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
  questions: z.array(questionSchema).min(1, "A deck needs at least one question"),
});

export type ParsedDeck = z.infer<typeof deckSchema>;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  deck?: Deck;
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function validateDeckJson(raw: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return {
      ok: false,
      errors: [`Invalid JSON syntax: ${(e as Error).message}`],
      warnings,
    };
  }

  if (Array.isArray(data)) {
    data = { title: "Imported Deck", subject: "General", questions: data };
    warnings.push("Received a bare question array — wrapped it into a deck named “Imported Deck”.");
  }

  const parsed = deckSchema.safeParse(data);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${issue.path.join(".") || "root"}: ${issue.message}`);
    }
    return { ok: false, errors, warnings };
  }

  const questions: Question[] = parsed.data.questions.map((q, i) => {
    if (!q.explanation) warnings.push(`questions[${i}]: no explanation provided.`);
    if (!q.concept) warnings.push(`questions[${i}]: no concept tag — topic analytics will be thin.`);
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
      "concept": "Membrane structure"
    },
    {
      "type": "true-false",
      "question": "Facilitated diffusion requires ATP.",
      "answer": "false",
      "explanation": "It is passive; it uses the concentration gradient, not ATP.",
      "difficulty": "medium",
      "concept": "Passive transport"
    },
    {
      "type": "fill-blank",
      "question": "The sodium-potassium pump moves ___ sodium ions out per cycle.",
      "answer": "3",
      "explanation": "3 Na+ out, 2 K+ in, per ATP hydrolysed.",
      "difficulty": "medium",
      "concept": "Active transport"
    },
    {
      "type": "short-answer",
      "question": "Define osmosis in one sentence.",
      "answer": "The movement of water across a semipermeable membrane from low to high solute concentration.",
      "explanation": "Water follows the solute gradient.",
      "difficulty": "medium",
      "concept": "Osmosis"
    },
    {
      "type": "flashcard",
      "question": "Hypertonic solution",
      "answer": "A solution with higher solute concentration than the cell, causing water to leave the cell.",
      "difficulty": "easy",
      "concept": "Tonicity"
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
      "concept": "Active transport"
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
      "concept": "Transport mechanisms"
    },
    {
      "type": "word-bank",
      "question": "In a ___ solution the cell swells, while in a ___ solution it shrinks.",
      "blanks": ["hypotonic", "hypertonic"],
      "wordBank": ["hypotonic", "hypertonic", "isotonic", "amphipathic"],
      "explanation": "Water always moves toward the higher solute concentration.",
      "difficulty": "medium",
      "concept": "Tonicity"
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
    return { ok: false, errors: [`Invalid JSON syntax: ${(e as Error).message}`], warnings };
  }

  if (Array.isArray(data)) data = { questions: data };
  if (data && typeof data === "object" && !("questions" in data)) {
    warnings.push("No “questions” array found at the top level.");
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
    if (!q.explanation) warnings.push(`questions[${i}]: no explanation provided.`);
    return buildQuestion(q, i, errors, warnings, uid());
  });

  if (errors.length) return { ok: false, errors, warnings };
  return { ok: true, errors, warnings: warnings.slice(0, 12), questions, deckTitle: parsed.data.deckTitle };
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
      "concept": "Active transport"
    },
    {
      "type": "short-answer",
      "question": "What drives secondary active transport?",
      "answer": "The electrochemical gradient created by primary active transport.",
      "explanation": "It borrows energy stored in an existing ion gradient.",
      "difficulty": "hard",
      "concept": "Active transport"
    }
  ]
}`;
