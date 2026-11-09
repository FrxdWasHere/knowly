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
  "tags": ["biology", "plants"],
  "isSTEM": false,
  "needsEquations": false,
  "needsGraphs": false,
  "objectives": [
    "Explain where a plant gets its food",
    "Name the inputs and outputs of photosynthesis"
  ],
  "estimatedMinutes": 10,
  "blocks": [
    {
      "type": "markdown",
      "markdown": "## The light-powered kitchen"
    },
    {
      "type": "markdown",
      "markdown": "A leaf is a **solar-powered kitchen**. Chloroplasts capture light and use it to turn water and carbon dioxide into glucose."
    },
    {
      "type": "callout",
      "tone": "definition",
      "title": "Key idea",
      "markdown": "Photosynthesis converts light energy into chemical energy stored in glucose."
    },
    {
      "type": "example",
      "title": "A worked example",
      "markdown": "Six molecules of carbon dioxide plus six of water become one glucose and six oxygen molecules, powered by light."
    },
    {
      "type": "callout",
      "tone": "warning",
      "title": "Common mistake",
      "markdown": "Plants do not \\"eat soil\\" — the mass of a tree comes mostly from air and water."
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
      "answer": "Oxygen — split out of water molecules when light energy breaks them apart.",
      "explanation": "Water is split during the light reactions; oxygen is the leftover.",
      "difficulty": "easy",
      "concept": "Light reactions",
      "hint": "It is the gas animals need to breathe in.",
      "tags": ["light reactions"]
    },
    {
      "type": "multiple-choice",
      "question": "Where in the leaf does photosynthesis happen?",
      "options": ["Chloroplasts", "Nucleus", "Cell wall", "Vacuole"],
      "answer": "Chloroplasts",
      "explanation": "Chloroplasts contain chlorophyll, the pigment that captures light.",
      "difficulty": "easy",
      "concept": "Chloroplasts",
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
      }
    }
  ],
  "linkedDeckIds": []
}`;
