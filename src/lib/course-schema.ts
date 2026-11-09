import { z } from "zod";
import { DECK_COLORS } from "./defaults";
import { questionSchema, validateDeckJson } from "./schema";
import { createId } from "./id";
import type { Course, CourseAssessment, CourseBlock, CourseLesson, CourseModule } from "./types";

export const courseBlockSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["markdown", "callout", "example", "image", "checkpoint", "divider"]),
  markdown: z.string().optional(),
  tone: z.enum(["info", "tip", "warning", "definition"]).optional(),
  title: z.string().optional(),
  url: z.string().optional(),
  alt: z.string().optional(),
  caption: z.string().optional(),
  questionId: z.string().optional(),
});

export const courseLessonSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Lesson title is required"),
  summary: z.string().optional(),
  objectives: z.array(z.string()).default([]),
  estimatedMinutes: z.number().positive().optional(),
  blocks: z.array(courseBlockSchema).default([]),
  questions: z.array(questionSchema).default([]),
  linkedDeckIds: z.array(z.string()).default([]),
});

export const courseAssessmentSchema = z.object({
  id: z.string().optional(),
  title: z.string().default("Assessment"),
  passingScore: z.number().min(0).max(100).default(80),
  timeLimitMinutes: z.number().positive().optional(),
  questions: z.array(questionSchema).default([]),
});

export const courseModuleSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Module title is required"),
  summary: z.string().optional(),
  objectives: z.array(z.string()).default([]),
  lessons: z.array(courseLessonSchema).min(1, "A module needs at least one lesson"),
  quiz: courseAssessmentSchema.optional(),
  linkedDeckIds: z.array(z.string()).default([]),
});

export const courseSchema = z.object({
  title: z.string().min(1, "Course title is required"),
  subject: z.string().default("General"),
  description: z.string().optional(),
  level: z.string().optional(),
  emoji: z.string().optional(),
  color: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isSTEM: z.boolean().optional(),
  needsEquations: z.boolean().optional(),
  needsGraphs: z.boolean().optional(),
  objectives: z.array(z.string()).default([]),
  estimatedMinutes: z.number().positive().optional(),
  sources: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().default("Reference"),
        content: z.string().default(""),
      }),
    )
    .default([]),
  modules: z.array(courseModuleSchema).min(1, "A course needs at least one module"),
  finalExam: courseAssessmentSchema.optional(),
  linkedDeckIds: z.array(z.string()).default([]),
});

export interface CourseValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  course?: Course;
}

const uid = () => createId();

function buildQuestions(
  raw: z.infer<typeof questionSchema>[],
  label: string,
  subject: string,
  errors: string[],
  warnings: string[],
) {
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

function buildBlocks(raw: z.infer<typeof courseBlockSchema>[]): CourseBlock[] {
  return raw.map((block) => ({
    id: block.id || uid(),
    type: block.type,
    markdown: block.markdown,
    tone: block.tone,
    title: block.title,
    url: block.url,
    alt: block.alt,
    caption: block.caption,
    questionId: block.questionId,
  }));
}

function buildAssessment(
  raw: z.infer<typeof courseAssessmentSchema> | undefined,
  label: string,
  subject: string,
  errors: string[],
  warnings: string[],
): CourseAssessment | undefined {
  if (!raw) return undefined;
  return {
    id: raw.id || uid(),
    title: raw.title,
    passingScore: raw.passingScore,
    timeLimitMinutes: raw.timeLimitMinutes,
    questions: buildQuestions(raw.questions, label, subject, errors, warnings),
  };
}

export function validateCourseJson(raw: string): CourseValidationResult {
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

  if (data && typeof data === "object" && "course" in data) {
    data = (data as { course: unknown }).course;
    warnings.push(
      "Your file had the course wrapped in an extra layer — we fixed it automatically.",
    );
  }

  const parsed = courseSchema.safeParse(data);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${issue.path.join(".") || "root"}: ${issue.message}`);
    }
    return { ok: false, errors, warnings };
  }

  const subject = parsed.data.subject;
  const modules: CourseModule[] = parsed.data.modules.map((module, moduleIndex) => {
    const modulePath = `modules[${moduleIndex}]`;
    const lessons: CourseLesson[] = module.lessons.map((lesson, lessonIndex) => {
      const path = `${modulePath}.lessons[${lessonIndex}]`;
      if (!lesson.blocks.length) warnings.push(`${path}: this lesson has no writing yet.`);
      const questions = buildQuestions(
        lesson.questions,
        `${path}.questions`,
        subject,
        errors,
        warnings,
      );
      return {
        id: lesson.id || uid(),
        title: lesson.title,
        summary: lesson.summary,
        objectives: lesson.objectives,
        estimatedMinutes: lesson.estimatedMinutes,
        blocks: buildBlocks(lesson.blocks),
        questions,
        linkedDeckIds: lesson.linkedDeckIds,
      };
    });

    return {
      id: module.id || uid(),
      title: module.title,
      summary: module.summary,
      objectives: module.objectives,
      lessons,
      quiz: buildAssessment(module.quiz, `${modulePath}.quiz`, subject, errors, warnings),
      linkedDeckIds: module.linkedDeckIds,
    };
  });

  const finalExam = buildAssessment(parsed.data.finalExam, "finalExam", subject, errors, warnings);

  if (errors.length) return { ok: false, errors, warnings };

  const now = Date.now();
  const course: Course = {
    id: uid(),
    title: parsed.data.title,
    subject,
    description: parsed.data.description,
    level: parsed.data.level,
    color: parsed.data.color || DECK_COLORS[Math.floor(Math.random() * DECK_COLORS.length)],
    emoji: parsed.data.emoji || "📘",
    tags: parsed.data.tags,
    isSTEM: parsed.data.isSTEM,
    needsEquations: parsed.data.needsEquations,
    needsGraphs: parsed.data.needsGraphs,
    objectives: parsed.data.objectives,
    estimatedMinutes: parsed.data.estimatedMinutes,
    sources: parsed.data.sources.map((source) => ({
      id: source.id || uid(),
      title: source.title,
      content: source.content,
    })),
    modules,
    finalExam,
    linkedDeckIds: parsed.data.linkedDeckIds,
    createdAt: now,
    updatedAt: now,
  };

  if (!course.objectives.length) warnings.push("The course overview has no goals listed.");
  if (!course.modules.some((module) => module.lessons.some((lesson) => lesson.blocks.length))) {
    warnings.push(
      "This course is just the outline — write the lessons yourself or generate them with Course Forge.",
    );
  }

  return { ok: true, errors, warnings: warnings.slice(0, 20), course };
}

export const SAMPLE_COURSE_JSON = `{
  "title": "Cell Biology — Membranes & Transport",
  "subject": "Biology",
  "description": "A compact course on membrane structure, diffusion and active transport.",
  "level": "Grade 11",
  "emoji": "🧬",
  "color": "#5fd38a",
  "tags": ["biology", "cells", "exam-prep"],
  "isSTEM": false,
  "needsEquations": false,
  "needsGraphs": false,
  "objectives": [
    "Explain the fluid mosaic model",
    "Compare passive and active transport",
    "Predict the effect of tonicity on a cell"
  ],
  "estimatedMinutes": 45,
  "sources": [
    {
      "title": "Course notes — chapter 4",
      "content": "The plasma membrane is a phospholipid bilayer with proteins, cholesterol and glycolipids."
    }
  ],
  "modules": [
    {
      "title": "Membrane structure",
      "summary": "What the plasma membrane is made of and why it matters.",
      "objectives": ["Describe the fluid mosaic model", "Name the main membrane components"],
      "lessons": [
        {
          "title": "The fluid mosaic model",
          "summary": "Lipids, proteins and the crowded surface of a cell.",
          "objectives": ["Identify membrane components", "Explain why the model is fluid"],
          "estimatedMinutes": 15,
          "blocks": [
            {
              "type": "markdown",
              "markdown": "## A moving surface"
            },
            {
              "type": "markdown",
              "markdown": "The plasma membrane is a **phospholipid bilayer** with proteins floating in and on it."
            },
            {
              "type": "callout",
              "tone": "definition",
              "title": "Fluid mosaic model",
              "markdown": "The membrane is a fluid sea of lipids with a mosaic of proteins, glycoproteins and glycolipids."
            },
            {
              "type": "example",
              "title": "Why cholesterol matters",
              "markdown": "At body temperature cholesterol packs the tails and stiffens the bilayer; in the cold it keeps them apart so the membrane stays flexible."
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
              "type": "multiple-choice",
              "question": "Which part of a phospholipid faces the watery environment?",
              "options": ["Hydrophilic head", "Hydrophobic tail", "Cholesterol ring", "Fatty acid chain"],
              "answer": "Hydrophilic head",
              "explanation": "The polar head interacts with water; the tails hide inside the bilayer.",
              "difficulty": "easy",
              "concept": "Membrane structure",
              "hint": "Water is polar — which end of the lipid is polar too?",
              "tutor": {
                "simple": "A phospholipid has a water-loving head and two water-fearing tails. The heads face the watery inside and outside of the cell; the tails hide in the middle.",
                "mnemonic": "Heads shake hands with water, tails run away.",
                "example": "Drop oil into water: the oil gathers into a ball so its water-fearing parts stay together, exactly like the bilayer's tails.",
                "whyWrong": [
                  {
                    "option": "Hydrophobic tail",
                    "why": "Hydrophobic means it fears water, so the tails point inward, away from the watery environment."
                  },
                  {
                    "option": "Cholesterol ring",
                    "why": "Cholesterol sits between the tails as a stiffener; it does not face the water."
                  },
                  {
                    "option": "Fatty acid chain",
                    "why": "The fatty acid chains ARE the tails, so they too point inward."
                  }
                ]
              },
              "tags": ["membranes"]
            },
            {
              "type": "true-false",
              "question": "Membrane proteins are fixed in one position.",
              "answer": "false",
              "explanation": "Many proteins move laterally within the fluid bilayer.",
              "difficulty": "easy",
              "concept": "Membrane structure"
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
          ],
          "linkedDeckIds": []
        }
      ],
      "quiz": {
        "title": "Membrane structure quiz",
        "passingScore": 80,
        "timeLimitMinutes": 10,
        "questions": [
          {
            "type": "ordering",
            "question": "Put the steps of the sodium-potassium pump in order.",
            "items": [
              "3 Na+ bind inside the cell",
              "ATP is hydrolysed and the pump is phosphorylated",
              "The pump changes shape and releases Na+ outside",
              "2 K+ bind and the phosphate is released",
              "The pump resets, releasing K+ inside"
            ],
            "explanation": "Each shape change is driven by phosphorylation then dephosphorylation.",
            "difficulty": "hard",
            "concept": "Active transport"
          }
        ]
      },
      "linkedDeckIds": []
    }
  ],
  "finalExam": {
    "title": "Membranes & transport — final",
    "passingScore": 75,
    "timeLimitMinutes": 30,
    "questions": [
      {
        "type": "matching",
        "question": "Match each transport process with its description.",
        "pairs": [
          { "left": "Osmosis", "right": "Water moves down its own gradient" },
          { "left": "Facilitated diffusion", "right": "Solutes cross via proteins, no ATP" },
          { "left": "Active transport", "right": "Solutes move against a gradient using ATP" }
        ],
        "explanation": "Only active transport spends energy to move solutes uphill.",
        "difficulty": "medium",
        "concept": "Transport mechanisms"
      }
    ]
  },
  "linkedDeckIds": []
}`;
