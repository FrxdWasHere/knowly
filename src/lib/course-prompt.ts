import { mathPromptSection } from "./prompt";
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

export function estimateCourseQuestions(o: CoursePromptOptions): number {
  return (
    Math.max(0, o.moduleCount) * Math.max(0, o.lessonsPerModule) * Math.max(0, o.questionsPerLesson)
  );
}

const QUESTION_SHAPE = `{
  "type": "flashcard" | "multiple-choice" | "true-false" | "fill-blank" | "short-answer" | "ordering" | "matching" | "word-bank",
  "question": string,
  "answer": string,
  "options"?: string[],
  "explanation"?: string,
  "difficulty"?: "easy" | "medium" | "hard",
  "concept"?: string,
  "hint"?: string,
  "items"?: string[],
  "pairs"?: { "left": string, "right": string }[],
  "blanks"?: string[],
  "wordBank"?: string[]
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
- Respond with ONE valid JSON object and nothing else. No markdown fences, no commentary.
- Every string must be valid JSON (escape quotes and newlines).
- Use markdown inside content fields for emphasis, lists, tables, and short code blocks.
- Keep total output practical: prefer concise lesson content over padding.

SCHEMA
{
  "title": string,
  "subject": string,
  "description": string,
  "level": string,
  "emoji": string,
  "tags": string[],
  "objectives": string[],
  "estimatedMinutes": number,
  "modules": [
    {
      "title": string,
      "summary": string,
      "objectives": string[],
      "lessons": [
        {
          "title": string,
          "summary": string,
          "objectives": string[],
          "estimatedMinutes": number,
          "blocks": [
            { "type": "markdown", "markdown": string },
            { "type": "callout", "tone": "info" | "tip" | "warning" | "definition", "title": string, "markdown": string },
            { "type": "example", "title": string, "markdown": string }
          ],
          "questions": [${QUESTION_SHAPE}]
        }
      ]${
        o.includeAssessments
          ? `,
      "quiz": {
        "title": string,
        "passingScore": number,
        "questions": [${QUESTION_SHAPE}]
      }`
          : ""
      }
    }
  ]${
    o.includeAssessments
      ? `,
  "finalExam": {
    "title": string,
    "passingScore": number,
    "timeLimitMinutes": number,
    "questions": [${QUESTION_SHAPE}]
  }`
      : ""
  }
}

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
Write the lesson as ONE valid JSON object and nothing else:
{
  "title": "${lessonTitle}",
  "summary": string,
  "objectives": string[],
  "estimatedMinutes": number,
  "blocks": [
    { "type": "markdown", "markdown": string },
    { "type": "callout", "tone": "info" | "tip" | "warning" | "definition", "title": string, "markdown": string },
    { "type": "example", "title": string, "markdown": string }
  ],
  "questions": [${QUESTION_SHAPE}]
}

Write ${Math.max(1, o.questionsPerLesson)} checkpoint questions with explanations and concept labels.
Use markdown in content fields. No markdown fences around the JSON.
Write any equation in the lesson body, hints, explanations or concept labels as real LaTeX — inline $…$ or display $$…$$ — including units and chemical formulas.
Escape backslashes so the JSON stays valid (e.g. \\\\times in the raw file).`;
}
