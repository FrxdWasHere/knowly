import { z } from "zod";
import { DECK_COLORS } from "./defaults";
import { questionSchema, validateDeckJson } from "./schema";
import { createId } from "./id";
import type { CourseBlock, Module, Question } from "./types";

export const moduleBlockSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["markdown", "callout", "example", "image", "checkpoint", "divider", "activity"]),
  markdown: z.string().optional(),
  tone: z.enum(["info", "tip", "warning", "definition"]).optional(),
  title: z.string().optional(),
  url: z.string().optional(),
  alt: z.string().optional(),
  caption: z.string().optional(),
  questionId: z.string().optional(),
  /** activity squares: id of the deck this activity points at (original device) */
  deckId: z.string().optional(),
});

export const moduleSchema = z.object({
  title: z.string().min(1, "Module title is required"),
  subject: z.string().default("General"),
  description: z.string().optional(),
  difficulty: z.number().min(1).max(3).optional(),
  emoji: z.string().optional(),
  color: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isSTEM: z.boolean().optional(),
  needsEquations: z.boolean().optional(),
  needsGraphs: z.boolean().optional(),
  objectives: z.array(z.string()).default([]),
  estimatedMinutes: z.number().positive().optional(),
  blocks: z.array(moduleBlockSchema).default([]),
  questions: z.array(questionSchema).default([]),
  /** activity squares link to decks by id from the device that made the module */
  linkedDeckIds: z.array(z.string()).default([]),
});

export interface ModuleValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  module?: Module;
}

const uid = () => createId();

function buildQuestions(
  raw: z.infer<typeof questionSchema>[],
  label: string,
  subject: string,
  errors: string[],
  warnings: string[],
): Question[] {
  if (!raw.length) return [];
  const result = validateDeckJson(
    JSON.stringify({
      title: label,
      subject,
      questions: raw,
    }),
  );
  for (const error of result.errors) errors.push(`${label}: ${error}`);
  for (const warning of result.warnings) warnings.push(`${label}: ${warning}`);
  return result.deck?.questions ?? [];
}

function buildBlocks(raw: z.infer<typeof moduleBlockSchema>[]): CourseBlock[] {
  return raw.map((block) => {
    const built: CourseBlock = {
      id: block.id || uid(),
      type: block.type,
      markdown: block.markdown,
      tone: block.tone,
      title: block.title,
      url: block.url,
      alt: block.alt,
      caption: block.caption,
      questionId: block.questionId,
    };
    // activity squares carry the deck id in the markdown field internally
    if (block.type === "activity") {
      built.markdown = block.deckId || block.markdown;
      if (!block.deckId && !block.markdown) {
        // deck-only export from a distant device: easy to relink in Edit mode
      }
    }
    return built;
  });
}

export function validateModuleJson(raw: string): ModuleValidationResult {
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

  if (data && typeof data === "object" && "module" in data) {
    data = (data as { module: unknown }).module;
    warnings.push(
      "Your file had the module wrapped in an extra layer — we fixed it automatically.",
    );
  }

  const parsed = moduleSchema.safeParse(data);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${issue.path.join(".") || "root"}: ${issue.message}`);
    }
    return { ok: false, errors, warnings };
  }

  const subject = parsed.data.subject;
  if (parsed.data.difficulty === undefined) {
    warnings.push("No difficulty given — defaulting to Core.");
  }
  const blocks = buildBlocks(parsed.data.blocks);
  if (!blocks.length) {
    warnings.push("This module has no writing yet — add blocks in Edit mode after importing.");
  }
  const questions = buildQuestions(parsed.data.questions, "questions", subject, errors, warnings);

  if (errors.length) return { ok: false, errors, warnings };

  const now = Date.now();
  const module: Module = {
    id: uid(),
    title: parsed.data.title,
    subject,
    notes: parsed.data.description || undefined,
    color: parsed.data.color || DECK_COLORS[Math.floor(Math.random() * DECK_COLORS.length)],
    emoji: parsed.data.emoji || "📘",
    tags: parsed.data.tags,
    isSTEM: parsed.data.isSTEM ?? false,
    needsEquations: parsed.data.needsEquations ?? false,
    needsGraphs: parsed.data.needsGraphs ?? false,
    objectives: parsed.data.objectives,
    estimatedMinutes: parsed.data.estimatedMinutes ?? 15,
    difficulty: (parsed.data.difficulty ?? 2) as 1 | 2 | 3,
    blocks,
    questions,
    linkedDeckIds: parsed.data.linkedDeckIds,
    createdAt: now,
    updatedAt: now,
  };

  if (!module.objectives.length) warnings.push("The module has no goals listed.");
  if (blocks.some((block) => block.type === "activity")) {
    warnings.push(
      "Activity squares link to decks on the device that made this module — relink them in Edit mode.",
    );
  }

  return { ok: true, errors, warnings: warnings.slice(0, 20), module };
}

/** Serialise a stored module into the shareable JSON shape validateModuleJson accepts. */
export function serializeModuleJson(mod: Module): string {
  return JSON.stringify(
    {
      title: mod.title,
      subject: mod.subject,
      description: mod.notes,
      difficulty: mod.difficulty,
      emoji: mod.emoji,
      color: mod.color,
      tags: mod.tags,
      isSTEM: mod.isSTEM,
      needsEquations: mod.needsEquations,
      needsGraphs: mod.needsGraphs,
      objectives: mod.objectives,
      estimatedMinutes: mod.estimatedMinutes,
      blocks: mod.blocks.map((block) => {
        if (block.type === "activity") {
          return {
            type: block.type,
            title: block.title,
            deckId: block.markdown, // deck id from this device
          };
        }
        return {
          type: block.type,
          markdown: block.markdown,
          tone: block.tone,
          title: block.title,
          url: block.url,
          alt: block.alt,
          caption: block.caption,
          questionId: block.questionId,
        };
      }),
      questions: mod.questions.map((question) => ({
        type: question.type,
        question: question.question,
        answer: question.answer,
        options: question.options,
        explanation: question.explanation,
        difficulty: question.difficulty,
        concept: question.concept,
      })),
      linkedDeckIds: mod.linkedDeckIds,
    },
    null,
    2,
  );
}

export const SAMPLE_MODULE_JSON = `{
  "title": "Photosynthesis in 10 minutes",
  "subject": "Biology",
  "description": "One focused lesson on how a leaf turns light into sugar.",
  "difficulty": 2,
  "emoji": "🌿",
  "color": "#5fd38a",
  "tags": ["biology", "plants", "photosynthesis"],
  "isSTEM": true,
  "needsEquations": true,
  "needsGraphs": false,
  "objectives": [
    "Explain where a plant gets its food",
    "Name the inputs and outputs of photosynthesis",
    "Describe the light-dependent and light-independent reactions"
  ],
  "estimatedMinutes": 15,
  "blocks": [
    {
      "type": "markdown",
      "markdown": "## The light-powered kitchen"
    },
    {
      "type": "markdown",
      "markdown": "A leaf is a **solar-powered kitchen**. Chloroplasts capture light and use it to turn water and carbon dioxide into glucose: $$6CO_2 + 6H_2O + \\text{light energy} \\rightarrow C_6H_{12}O_6 + 6O_2$$"
    },
    {
      "type": "callout",
      "tone": "definition",
      "title": "Photosynthesis",
      "markdown": "The process by which plants convert light energy into chemical energy stored in glucose. It happens in two stages: light-dependent reactions in the thylakoids and light-independent reactions (the Calvin cycle) in the stroma."
    },
    {
      "type": "example",
      "title": "Breaking down the equation",
      "markdown": "Six molecules of carbon dioxide ($$CO_2$$) plus six of water ($$H_2O$$) become one glucose ($$C_6H_{12}O_6$$) and six oxygen molecules ($$O_2$$), powered by light energy absorbed by chlorophyll."
    },
    {
      "type": "callout",
      "tone": "warning",
      "title": "Common mistake",
      "markdown": "Plants do not \\"eat soil\\" — the mass of a tree comes mostly from air and water that are reassembled into glucose and cellulose by the energy in sunlight."
    },
    {
      "type": "callout",
      "tone": "tip",
      "title": "Two reactions",
      "markdown": "**Light reactions** (thylakoid membrane): light + water → ATP, NADPH, oxygen. **Calvin cycle** (stroma): ATP + NADPH + $$CO_2$$ → glucose."
    },
    {
      "type": "checkpoint",
      "questionId": "q1"
    },
    {
      "type": "divider"
    }
  ],
  "questions": [
    {
      "id": "q1",
      "type": "short-answer",
      "question": "Which gas do plants release during photosynthesis?",
      "answer": "Oxygen",
      "explanation": "Oxygen is split out of water molecules when light energy breaks them apart during the light reactions.",
      "difficulty": "easy",
      "concept": "Light reactions",
      "hint": "It is the gas animals need to breathe in.",
      "tutor": {
        "simple": "Plants use sunlight to split water molecules. Oxygen is left over from that splitting and escapes as a gas.",
        "mnemonic": "Light breaks water: $$H_2O$$ splits into hydrogen and oxygen.",
        "example": "Bubbles rising from an underwater plant in bright sunlight are mostly oxygen released during photosynthesis.",
        "whyWrong": []
      },
      "tags": ["light reactions", "oxygen"]
    },
    {
      "type": "multiple-choice",
      "question": "Where in the leaf does photosynthesis happen?",
      "options": ["Chloroplasts", "Nucleus", "Cell wall", "Vacuole"],
      "answer": "Chloroplasts",
      "explanation": "Chloroplasts contain chlorophyll, the pigment that captures light energy.",
      "difficulty": "easy",
      "concept": "Chloroplasts",
      "hint": "Think about the word: CHLOROphyll in the CHLOROnoplast.",
      "tutor": {
        "simple": "Chloroplasts are the green factories in a leaf cell. They hold chlorophyll, which catches sunlight and starts photosynthesis.",
        "mnemonic": "CHLOROphyll lives in the CHLOROplast — same CHLORO, same job.",
        "example": "A spinach leaf looks green because you are seeing millions of chloroplasts reflecting green light they cannot absorb.",
        "whyWrong": [
          {
            "option": "Nucleus",
            "why": "The nucleus stores DNA and runs the cell's instructions; it has no chlorophyll and captures no light."
          },
          {
            "option": "Cell wall",
            "why": "The cell wall is a rigid support layer outside the membrane, not a site of any reaction."
          },
          {
            "option": "Vacuole",
            "why": "The vacuole stores water and solutes; it does not contain light-capturing pigments."
          }
        ]
      },
      "tags": ["chloroplasts", "structure"]
    },
    {
      "type": "true-false",
      "question": "Plants produce glucose only during the day.",
      "answer": "false",
      "explanation": "The Calvin cycle can run on ATP and NADPH stored from the light reactions, so glucose production continues briefly even in darkness using the energy carriers made in the light.",
      "difficulty": "medium",
      "concept": "Calvin cycle",
      "hint": "What do the light reactions create that the Calvin cycle can use?",
      "tutor": {
        "simple": "The light reactions happen in the day and make ATP and NADPH. The Calvin cycle uses these energy carriers to make glucose. In darkness the light reactions stop, but a little glucose can still be made if there is enough stored ATP and NADPH.",
        "mnemonic": "Light reactions = the day shift. Calvin cycle = works on whatever the day shift made.",
        "example": "If you put a plant in the dark right after bright sunlight, it will still make a tiny bit more glucose from the ATP and NADPH left over."
      }
    },
    {
      "type": "fill-blank",
      "question": "The energy carriers made in the light reactions are ___ and ___.",
      "answer": "ATP and NADPH",
      "explanation": "Both are produced when light hits chlorophyll and water is split. They fuel the Calvin cycle.",
      "difficulty": "medium",
      "concept": "Light reactions",
      "hint": "One is a nucleotide, the other is a coenzyme.",
      "tutor": {
        "simple": "Light energy knocks electrons out of chlorophyll. These high-energy electrons power the making of ATP and NADPH, which then drive the Calvin cycle.",
        "mnemonic": "A-T-P and NAD-P-H: both end in P-H, both are energy carriers from the light reactions.",
        "example": "Think of ATP as loose change and NADPH as a credit card — both ways of carrying energy and electrons to the Calvin cycle."
      }
    },
    {
      "type": "ordering",
      "question": "Order the stages of photosynthesis.",
      "items": [
        "Photons strike chlorophyll molecules in the thylakoid",
        "Water molecules are split, releasing oxygen",
        "Energy carriers (ATP and NADPH) are made",
        "Energy carriers power the Calvin cycle in the stroma",
        "Carbon dioxide is fixed and glucose is made"
      ],
      "explanation": "Light reactions (steps 1–3) must happen first to power the Calvin cycle (steps 4–5).",
      "difficulty": "hard",
      "concept": "Photosynthesis overview",
      "hint": "Light comes first and must happen before carbon dioxide is used.",
      "tutor": {
        "simple": "First the light reactions: light hits chlorophyll, water splits, and energy carriers are made. Then the Calvin cycle: energy carriers power the fixation of carbon dioxide into glucose.",
        "mnemonic": "LIGHT first, then CARBON — light reactions, Calvin cycle.",
        "example": "Imagine a factory: power generation (light reactions) runs first, then the power is used on the assembly line (Calvin cycle) to build glucose."
      }
    },
    {
      "type": "matching",
      "question": "Match each term to its function.",
      "pairs": [
        { "left": "Thylakoid", "right": "Site of light reactions" },
        { "left": "Stroma", "right": "Site of the Calvin cycle" },
        { "left": "Chlorophyll", "right": "Pigment that absorbs light" },
        { "left": "Glucose", "right": "Sugar product of photosynthesis" }
      ],
      "explanation": "Each structure or molecule has a specific role in photosynthesis.",
      "difficulty": "medium",
      "concept": "Photosynthesis structures",
      "hint": "Think about where each reaction happens and what each molecule does.",
      "tutor": {
        "simple": "The thylakoid is a flat stack inside the chloroplast where light reactions happen. The stroma is the fluid around it where the Calvin cycle happens. Chlorophyll catches the light. Glucose is the product.",
        "mnemonic": "Thylakoid = LIGHT zone. Stroma = DARK reactions zone (Calvin cycle). Chlorophyll = GREEN catcher. Glucose = GOAL.",
        "example": "Thylakoids are like solar panels catching light (light reactions). The stroma is the factory floor using that power to make glucose (Calvin cycle)."
      }
    },
    {
      "type": "word-bank",
      "question": "The light reactions split ___ and make ___ and ___, leaving ___ as a waste product.",
      "blanks": ["water", "ATP", "NADPH", "oxygen"],
      "wordBank": ["water", "ATP", "NADPH", "oxygen", "glucose", "carbon dioxide", "chlorophyll"],
      "explanation": "Water is the source of electrons and protons; ATP and NADPH carry energy forward; oxygen is an unwanted by-product from the perspective of the plant (but essential for us!).",
      "difficulty": "medium",
      "concept": "Light reactions",
      "hint": "Water + light → energy carriers + a gas we breathe.",
      "tutor": {
        "simple": "Sunlight breaks water apart. The hydrogen atoms become ATP and NADPH (the energy carriers). The oxygen atoms form $$O_2$$ gas and escape.",
        "mnemonic": "H-O-P: water (H2O), plus photons = H (used for ATP/NADPH) and O (waste).",
        "example": "Like splitting firewood with an axe: water is the log, light is the axe, ATP and NADPH are the useful pieces, oxygen is the sawdust."
      }
    }
  ],
  "linkedDeckIds": []
}`;
