import {
  QUESTION_SCHEMA_TEXT,
  SAMPLE_NOTE,
  TUTOR_RULES,
  jsonFileRule,
  mathPromptSection,
  STRICT_FORMAT_RULES,
} from "./prompt";
import { SAMPLE_COURSE_JSON } from "./course-schema";
import type { Difficulty, QuestionType } from "./types";

export interface CoursePromptOptions {
  topic: string;
  material: string;
  title: string;
  subject: string;
  level: string;
  moduleCount: number;
  lessonsPerModule: number;
  questionsPerLesson: number;
  types: QuestionType[];
  distribution: Record<Difficulty, number>;
  audience?: string;
  purpose?: string;
  extra: string;
  /** how the writing should sound — a paragraph or two in the learner's own words */
  tone?: string;
  includeAssessments: boolean;
  /** math & science subject flags */
  isSTEM?: boolean;
  needsEquations?: boolean;
  needsGraphs?: boolean;
  /** "whatever you see fit": let the AI choose the course shape */
  sizeAuto?: boolean;
  /** "whatever you see fit": let the AI choose which question types fit */
  typesAuto?: boolean;
  /** "whatever you see fit": let the AI choose the difficulty spread */
  distributionAuto?: boolean;
}

/** The full course sample, minus "quiz" and "finalExam" for a no-assessments run. */
function courseSample(includeAssessments: boolean) {
  if (includeAssessments) return SAMPLE_COURSE_JSON;
  const copy = JSON.parse(SAMPLE_COURSE_JSON) as {
    finalExam?: unknown;
    modules: Record<string, unknown>[];
  };
  delete copy.finalExam;
  for (const module of copy.modules) delete module.quiz;
  return JSON.stringify(copy, null, 2);
}

export function estimateCourseQuestions(o: CoursePromptOptions): number {
  return (
    Math.max(0, o.moduleCount) * Math.max(0, o.lessonsPerModule) * Math.max(0, o.questionsPerLesson)
  );
}

/* The complete object shapes printed by the course and lesson prompts. */
const COURSE_SCHEMA_TEXT = `{
  "title": string,                              // required — course name
  "subject": string,                            // required — e.g. "Biology"
  "description": string,                        // required — one-line promise of the course
  "level": string,                              // required — e.g. "Grade 11"
  "emoji": string,                              // required — one emoji for the course card
  "color": string,                              // required — hex accent, e.g. "#5fd38a"
  "tags": string[],                             // required — free-form labels
  "isSTEM": boolean,                            // required — maths or science course
  "needsEquations": boolean,                    // required — lessons rely on LaTeX maths
  "needsGraphs": boolean,                       // required — lessons refer to graphs
  "objectives": string[],                       // required — 3-6 measurable course goals
  "estimatedMinutes": number,                   // required — total study time
  "sources": [{ "title": string, "content": string }],  // required — reference notes stored with the course
  "modules": [ Module ],                        // required — one or more
  "finalExam": Assessment,                      // required — see the Assessment object
  "linkedDeckIds": string[]                     // required — always leave []
}`;

const MODULE_SHAPE = `{
  "title": string,                 // required
  "summary": string,               // required — what the module covers
  "objectives": string[],          // required — 2-4 measurable goals
  "lessons": [ Lesson ],           // required — one or more
  "quiz": Assessment,              // required — the module quiz
  "linkedDeckIds": string[]        // required — always leave []
}`;

const LESSON_SHAPE = `{
  "title": string,                 // required
  "summary": string,               // required
  "objectives": string[],          // required
  "estimatedMinutes": number,      // required — 10-25
  "blocks": [ Block ],             // required — the writing, in order
  "questions": [ Question ],       // required — the checkpoint questions
  "linkedDeckIds": string[]        // required — always leave []
}`;

const BLOCK_SHAPE = `{
  "type": "markdown" | "callout" | "example" | "image" | "checkpoint" | "divider",  // required
  "markdown": string,                                  // required for markdown, callout and example
  "tone": "info" | "tip" | "warning" | "definition",  // required for callout
  "title": string,                                     // required for callout and example
  "url": string,                                       // required for image — a full image address
  "alt": string,                                       // required for image — what the image shows
  "caption": string,                                   // required for image
  "questionId": string                                 // required for checkpoint — must match the "id" of a question in the same lesson
}`;

/* A complete single lesson, used by the lesson-expansion prompt. */
const SAMPLE_LESSON_JSON = `{
  "title": "The fluid mosaic model",
  "summary": "Lipids, proteins and the crowded surface of a cell.",
  "objectives": ["Identify the components of the membrane", "Explain why the model is fluid"],
  "estimatedMinutes": 15,
  "blocks": [
    { "type": "markdown", "markdown": "## A moving surface" },
    { "type": "markdown", "markdown": "The plasma membrane is a **phospholipid bilayer** with proteins floating in and on it." },
    { "type": "callout", "tone": "definition", "title": "Fluid mosaic model", "markdown": "The membrane is a fluid sea of lipids with a mosaic of proteins, glycoproteins and glycolipids." },
    { "type": "example", "title": "Why cholesterol matters", "markdown": "At body temperature cholesterol stiffens the bilayer; in the cold it keeps the tails apart so the membrane stays flexible." },
    { "type": "checkpoint", "questionId": "q1" },
    { "type": "divider" }
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
      "tags": ["membranes"]
    },
    {
      "type": "short-answer",
      "question": "Why do membrane proteins drift sideways?",
      "answer": "The lipid bilayer is fluid, so proteins are free to move laterally within it.",
      "explanation": "Phospholipids are held by weak interactions, not a rigid lattice.",
      "difficulty": "medium",
      "concept": "Membrane structure"
    }
  ],
  "linkedDeckIds": []
}`;

const ASSESSMENT_SHAPE = `{
  "title": string,                 // required — e.g. "Final exam"
  "passingScore": number,          // required — 0-100, default 80
  "timeLimitMinutes": number,      // required — optional
  "questions": [ Question ]        // required
}`;

export function buildCoursePrompt(o: CoursePromptOptions): string {
  const total = o.distribution.easy + o.distribution.medium + o.distribution.hard || 1;
  const pct = (n: number) => Math.round((n / total) * 100);
  const material = o.material.trim()
    ? o.material.trim()
    : `(none supplied — build from the topic using accurate, well-established knowledge)`;
  /* the optional brief sections, each on its own block with one blank line between */
  const briefExtras = [
    o.extra.trim() ? `- Extra instructions: ${o.extra.trim()}` : "",
    o.tone?.trim()
      ? `TONE & VOICE\nWrite everything — lesson prose, callouts, examples, hints, explanations and questions — in this voice:\n"""\n${o.tone.trim()}\n"""\nThe voice shapes how it reads, never what is true: keep facts exact and keep the structure and JSON rules above intact.`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return `You are an expert curriculum designer and teacher. Build a complete Knowly course.

TOPIC
${o.topic.trim() || "(use the reference material to infer the topic)"}

REFERENCE MATERIAL
${material}

COURSE BRIEF
- Title: ${o.title.trim() || "(suggest a precise title)"}
- Subject: ${o.subject.trim() || "General"}
- Level: ${o.level.trim() || "general learner"}
- Learner: ${o.audience?.trim() || "a motivated student"}
- Why they are studying: ${o.purpose?.trim() || "to understand and remember the material"}
${
  o.sizeAuto
    ? `- Course size: choose whatever you see fit — as many modules, lessons and checkpoint questions as the material warrants, without padding`
    : `- Modules: exactly ${o.moduleCount}
- Lessons per module: exactly ${o.lessonsPerModule}
- Checkpoint questions per lesson: exactly ${o.questionsPerLesson}`
}
${
  o.typesAuto
    ? `- Question mix: choose whatever you see fit — pick the types that test this material best`
    : `- Question mix: ${o.types.join(", ") || "multiple-choice, true-false, short-answer"}`
}
${
  o.distributionAuto
    ? `- Difficulty: choose whatever you see fit — a sensible spread across easy, medium and hard`
    : `- Difficulty: easy ${pct(o.distribution.easy)}%, medium ${pct(o.distribution.medium)}%, hard ${pct(o.distribution.hard)}%`
}
${briefExtras ? `\n${briefExtras}\n` : ""}PEDAGOGY
- Build a learning arc: foundations → guided practice → application → synthesis.
- Every lesson must teach one coherent idea and be usable in a 10–25 minute sitting.
- Objectives must be measurable verbs (identify, explain, compare, solve, evaluate).
- Use concrete examples, definitions, common mistakes, and memory hooks.
- Do not duplicate questions across lessons.
- When reference material is supplied, it is the source of truth. Do not invent facts that contradict it.
- If a fact is uncertain, phrase the question conservatively or omit it.
${mathPromptSection(o).trim()}

LAYOUT & EQUATIONS
- Write module summaries, lesson content, callouts, examples and objectives in the same Markdown the editor expects.
- The module viewer and its printed version both typeset LaTeX, so every equation in a summary, lesson, callout, example, objective, hint, explanation or concept label should be real LaTeX: inline $…$ or display $$…$$.
- Use LaTeX for units and scientific notation ($3.00 \\times 10^8\\,\\text{m/s}$, $6.626 \\times 10^{-34}\\, \\text{J s}$) and for chemical formulas when you need them ($H_2O$, $CO_2$, $C_6H_{12}O_6$).

OUTPUT RULES
${jsonFileRule("knowly-course.json")}
- Use markdown inside content fields for emphasis, lists, tables and short code blocks.
- Keep the file practical: prefer concise lesson content over padding.
${
  o.includeAssessments
    ? '- Fill in every module "quiz" and the course "finalExam".'
    : '- Do not include "quiz" or "finalExam" anywhere — this run has no assessments.'
}

SCHEMA — the complete course object
${COURSE_SCHEMA_TEXT}

MODULE OBJECT — every module uses this shape
${MODULE_SHAPE}

LESSON OBJECT — every lesson uses this shape
${LESSON_SHAPE}

BLOCK OBJECT — one entry per piece of the lesson, in reading order
${BLOCK_SHAPE}

ASSESSMENT OBJECT — used by a module quiz and the final exam
${ASSESSMENT_SHAPE}

QUESTION OBJECT — every question uses this shape
${QUESTION_SCHEMA_TEXT}

TUTOR NOTES — pre-written inside every question
${TUTOR_RULES}

FULL SAMPLE REFERENCE — a complete, working course with a module and lessons
${SAMPLE_NOTE}
${courseSample(o.includeAssessments)}

FORMAT ADHERENCE — CRITICAL
${STRICT_FORMAT_RULES}

QUESTION RULES
- multiple-choice: 2–6 options; the answer must exactly match one option.
- true-false: answer must be "true" or "false".
- fill-blank / short-answer: answer is the expected short text.
- ordering: provide "items" in the correct order; no answer needed.
- matching: provide 2+ {left, right} pairs; no answer needed.
- word-bank: use ___ for each blank, provide "blanks" in order and a "wordBank" with distractors.
- Always include an explanation and a concept label.`;
}

export function buildCourseLessonPrompt(
  o: CoursePromptOptions,
  courseTitle: string,
  moduleTitle: string,
  lessonTitle: string,
  lessonObjectives: string[],
): string {
  return `You are an expert teacher writing ONE lesson for a Knowly course.

COURSE: ${courseTitle}
MODULE: ${moduleTitle}
LESSON: ${lessonTitle}
OBJECTIVES:
${lessonObjectives.length ? lessonObjectives.map((item) => `- ${item}`).join("\n") : "- Teach the lesson clearly and check understanding."}

LEARNER: ${o.audience?.trim() || "a motivated student"}
LEVEL: ${o.level.trim() || "general"}
${o.tone?.trim() ? `TONE & VOICE\n"""\n${o.tone.trim()}\n"""` : ""}

REFERENCE MATERIAL
${o.material.trim() || "(use accurate established knowledge)"}

TASK
Write the lesson as one JSON file.
${jsonFileRule("knowly-lesson.json")}

SCHEMA — the complete lesson object
{
  "title": "${lessonTitle}",
  "summary": string,                 // optional — one line on what the lesson gives away
  "objectives": string[],           // required — measurable goals
  "estimatedMinutes": number,       // optional — 10-25
  "blocks": [ Block ],              // required — the writing, in order
  "questions": [ Question ],        // required — the checkpoint questions
  "linkedDeckIds": string[]         // optional — always leave []
}

BLOCK OBJECT — one entry per piece of the lesson, in reading order
${BLOCK_SHAPE}

QUESTION OBJECT — every question uses this shape
${QUESTION_SCHEMA_TEXT}

TUTOR NOTES — pre-written inside every question
${TUTOR_RULES}

FULL SAMPLE — one complete lesson (shape only, write your own content)
${SAMPLE_LESSON_JSON}

Write ${Math.max(1, o.questionsPerLesson)} checkpoint questions with explanations and concept labels.
Use markdown in content fields. No markdown fences around the JSON.
Write any equation in the lesson body, hints, explanations or concept labels as real LaTeX — inline $…$ or display $$…$$ — including units and chemical formulas.
Escape backslashes so the JSON stays valid (e.g. \\\\times in the raw file).`;
}
