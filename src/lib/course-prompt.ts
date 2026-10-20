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
  includeAssessments: boolean;
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
- Modules: exactly ${o.moduleCount}
- Lessons per module: exactly ${o.lessonsPerModule}
- Checkpoint questions per lesson: exactly ${o.questionsPerLesson}
- Question mix: ${o.types.join(", ") || "multiple-choice, true-false, short-answer"}
- Difficulty: easy ${pct(o.distribution.easy)}%, medium ${pct(o.distribution.medium)}%, hard ${pct(o.distribution.hard)}%
${o.extra.trim() ? `- Extra instructions: ${o.extra.trim()}` : ""}

PEDAGOGY
- Build a learning arc: foundations → guided practice → application → synthesis.
- Every lesson must teach one coherent idea and be usable in a 10–25 minute sitting.
- Objectives must be measurable verbs (identify, explain, compare, solve, evaluate).
- Use concrete examples, definitions, common mistakes, and memory hooks.
- Do not duplicate questions across lessons.
- When reference material is supplied, it is the source of truth. Do not invent facts that contradict it.
- If a fact is uncertain, phrase the question conservatively or omit it.

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
Use markdown in content fields. No markdown fences around the JSON.`;
}
