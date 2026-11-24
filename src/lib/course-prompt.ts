import {
  QUESTION_SCHEMA_TEXT,
  SAMPLE_NOTE,
  TUTOR_RULES,
  jsonFileRule,
  mathPromptSection,
  STRICT_FORMAT_RULES,
} from "./prompt";
import { SAMPLE_COURSE_JSON } from "./course-schema";
import { lengthBudgetFor } from "./length-detail";
import type { Difficulty, QuestionType } from "./types";

export interface CoursePromptOptions {
  topic: string;
  material: string;
  title: string;
  subject: string;
  level: string;
  description?: string;
  objectives?: string;
  sectionGuidance?: string;
  sectionsPerLesson?: number;
  sectionsAuto?: boolean;
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
  /** "whatever you see fit": let the AI choose an appropriate course level */
  levelAuto?: boolean;
  /** shared 0–100 length/detail setting */
  lengthSliderValue?: number;
  /** identify source-analysis guidance in the prompt */
  smartModeEnabled?: boolean;
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
  "finalExam": Assessment,                      // include when assessments are enabled
  "linkedDeckIds": string[]                     // required — always leave []
}`;

const MODULE_SHAPE = `{
  "title": string,                 // required
  "summary": string,               // required — what the module covers
  "objectives": string[],          // required — 2-4 measurable goals
  "lessons": [ Lesson ],           // required — one or more
  "quiz": Assessment,              // include when assessments are enabled
  "linkedDeckIds": string[]        // required — always leave []
}`;

const LESSON_SHAPE = `{
  "title": string,                 // required
  "summary": string,               // required
  "objectives": string[],          // required
  "estimatedMinutes": number,      // required — realistic for the lesson's actual depth
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

interface CourseStructureBudget {
  units: string;
  lessonsPerUnit: string;
  sectionsPerLesson: string;
  questionsPerLesson: string;
}

function courseStructureBudget(value: number): CourseStructureBudget {
  if (value <= 25) {
    return {
      units: "2–3",
      lessonsPerUnit: "1–2",
      sectionsPerLesson: "1–2",
      questionsPerLesson: "1–3",
    };
  }
  if (value <= 45) {
    return {
      units: "3–4",
      lessonsPerUnit: "2–3",
      sectionsPerLesson: "2–3",
      questionsPerLesson: "2–4",
    };
  }
  if (value <= 65) {
    return {
      units: "4–5",
      lessonsPerUnit: "2–3",
      sectionsPerLesson: "2–4",
      questionsPerLesson: "3–5",
    };
  }
  if (value <= 85) {
    return {
      units: "5–7",
      lessonsPerUnit: "2–4",
      sectionsPerLesson: "3–4",
      questionsPerLesson: "4–6",
    };
  }
  return {
    units: "6–8",
    lessonsPerUnit: "3–4",
    sectionsPerLesson: "3–5",
    questionsPerLesson: "5–8",
  };
}

export function courseLengthInstructions(sliderValue: number): string {
  const budget = lengthBudgetFor(sliderValue);
  const structure = courseStructureBudget(budget.sliderValue);
  const coverage =
    budget.sliderValue <= 25
      ? "Prioritize essential objectives and foundational concepts; keep the program compact, with concise but complete lessons."
      : budget.sliderValue <= 45
        ? "Cover essential objectives with focused lessons and enough examples to support understanding."
        : budget.sliderValue <= 65
          ? "Provide balanced scope, substantial standalone lessons, and a useful mix of explanation, examples, and practice."
          : budget.sliderValue <= 85
            ? "Broaden conceptual coverage, add lessons where they improve progression, and include more contextual explanations and varied applications."
            : "Create the most comprehensive appropriate program: deeper contextual development, extensive examples and applications, and thorough coverage across units and lessons.";
  return [
    `LENGTH & DETAIL — ${budget.label} (${budget.sliderValue}/100)`,
    `- Overall instructional depth: ${budget.depth}; lesson explanation depth: ${budget.explanationDepth}.`,
    `- Planning ranges at this setting: ${structure.units} units, ${structure.lessonsPerUnit} lessons per unit, ${structure.sectionsPerLesson} meaningful sections per lesson, and ${structure.questionsPerLesson} checkpoint questions per lesson. Adapt them to the actual subject; they are not quotas.`,
    `- ${coverage}`,
    "- Increase coverage through course architecture and instructional depth, not by padding or merely lengthening each lesson.",
    "- Use the unit and lesson ranges to scale course architecture when size is automatic. In either mode, let the selected setting influence section count and depth. When the learner sets exact unit, lesson, or checkpoint counts, preserve them and scale explanation, examples, and context within those constraints.",
    "- Even at the shortest setting, every lesson must define essential terms and provide enough context and instruction to stand alone.",
  ].join("\n");
}

export function buildCoursePrompt(o: CoursePromptOptions): string {
  const total = o.distribution.easy + o.distribution.medium + o.distribution.hard || 1;
  const pct = (n: number) => Math.round((n / total) * 100);
  const lengthSliderValue = o.lengthSliderValue ?? 50;
  const lengthBudget = lengthBudgetFor(lengthSliderValue);
  const structure = courseStructureBudget(lengthBudget.sliderValue);
  const material = o.material.trim()
    ? o.material.trim()
    : `(none supplied — build from the topic using accurate, well-established knowledge)`;
  const objectives = (o.objectives ?? "")
    .split("\n")
    .map((objective) => objective.trim())
    .filter(Boolean);
  const sectionGuidance = (o.sectionGuidance ?? "")
    .split("\n")
    .map((section) => section.trim())
    .filter(Boolean);
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
- Subject: ${o.subject.trim() || "(infer the subject from the material and scope)"}
- Description: ${o.description?.trim() || "(write a clear description of course outcomes and scope)"}
- Learner level / course difficulty: ${
    o.levelAuto || !o.level.trim()
      ? "infer the suitable level from the scope and stated learner; record it in the course level field"
      : o.level.trim()
  }
- Learner: ${o.audience?.trim() || "a motivated student"}
- Why they are studying: ${o.purpose?.trim() || "to understand and remember the material"}
- Course learning objectives:
${objectives.length ? objectives.map((objective) => `  - ${objective}`).join("\n") : "  - Derive measurable course-level objectives from the learner's goal and reference material."}
- Course structure guidance:
${sectionGuidance.length ? sectionGuidance.map((item) => `  - ${item}`).join("\n") : "  - Identify prerequisites, scope, units, lessons, and section topics from the material."}
${
  o.smartModeEnabled
    ? `\nSMART MODE\nTreat source-analysis suggestions in the brief as learner-reviewed guidance. If files are uploaded, consolidate them with pasted references into one course; do not make a separate unit for each file.\n`
    : ""
}
${
  o.sizeAuto
    ? `- Course size: choose the number of units, lessons, and checkpoint questions that the actual material and selected length/detail setting warrant. Planning range at this setting: ${structure.units} units, ${structure.lessonsPerUnit} lessons per unit, and ${structure.questionsPerLesson} checkpoint questions per lesson; adapt to the scope rather than forcing counts.`
    : `- Modules: exactly ${o.moduleCount}
- Lessons per module: exactly ${o.lessonsPerModule}
- Checkpoint questions per lesson: exactly ${o.questionsPerLesson}`
}
${
  o.sectionsAuto === false
    ? `- Sections per lesson: exactly ${Math.max(1, o.sectionsPerLesson ?? 1)} meaningful sections; preserve these counts while organizing the learner's section guidance.`
    : `- Sections per lesson: choose the appropriate number from the selected length/detail setting and the actual lesson scope.`
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
${briefExtras ? `\n${briefExtras}\n` : ""}COURSE DESIGN & PEDAGOGY
- Create a complete educational program, not a collection of unrelated articles or a single Module split into arbitrary pieces. Treat each "modules" entry in the JSON schema as a meaningful course unit with its own purpose and objectives.
- First map the source material into shared concepts, unique details, overlap, prerequisites, gaps, and learning objectives. Consolidate related sources, reconcile redundant explanations, preserve important details, and distribute concepts across the full course. Never make one unit per uploaded file by default.
- Arrange units and lessons in a deliberate progression: establish foundations and prerequisite knowledge before dependent ideas; then build toward practice, application, and synthesis. Explain how each unit advances the overall course.
- Make every lesson a substantial, coherent reference chapter that can be studied independently. Give it enough local context, foundational explanation, definitions, and examples to stand on its own; avoid unexplained terms, assumed knowledge, and excessive "as covered earlier" references. Connect lessons through the course sequence without making any lesson depend on another.
- Explicitly name and define important concepts. Explain unfamiliar terminology when first introduced, show how and why ideas work, and use friendly, approachable prose without sacrificing academic substance.
- Use clear sections, examples, analogies, comparisons, step-by-step reasoning, and practical applications where they improve understanding. Avoid filler, shallow summaries, repetitive conclusions, and excessive bullet lists.
- Each lesson's sections should develop a coherent progression. Use Markdown headings in its ordered content blocks: start with a short lesson framing, then use a \`## Section N — Section title\` heading for each section, with the heading and section text in the same or adjacent markdown block. Keep headings meaningful rather than arbitrary.
- Objectives must use measurable verbs (identify, explain, compare, solve, evaluate). Avoid duplicating questions across lessons; use checkpoints to test concepts taught in that lesson and quizzes to reinforce a unit's learning.
- When reference material is supplied, it is the factual anchor. Add only reliable foundational context needed to teach it, do not contradict the sources, and identify genuine conflicts or uncertainty rather than inventing facts.
- Set realistic estimated lesson times based on actual content and selected depth; do not pad lessons or force an arbitrary duration.
${mathPromptSection(o).trim()}

${courseLengthInstructions(lengthSliderValue)}

LAYOUT & EQUATIONS
- Write the course description, unit summaries, lesson summaries, lesson content, callouts, examples and objectives in the same Markdown the editor expects.
- The module viewer and its printed version both typeset LaTeX, so every equation in a summary, lesson, callout, example, objective, hint, explanation or concept label should be real LaTeX: inline $…$ or display $$…$$.
- Use LaTeX for units and scientific notation ($3.00 \\times 10^8\\,\\text{m/s}$, $6.626 \\times 10^{-34}\\, \\text{J s}$) and for chemical formulas when you need them ($H_2O$, $CO_2$, $C_6H_{12}O_6$).

OUTPUT RULES
${jsonFileRule("knowly-course.json")}
- Use markdown inside content fields for emphasis, lists, tables and short code blocks.
- Preserve the source filenames/titles in the course "sources" list; use concise source descriptions rather than copying entire documents a second time.
${
  o.sizeAuto
    ? "- Choose an appropriate number of units, lessons, and sections based on the scope and length/detail budget; do not treat sample sizes or source-file count as structure."
    : "- Preserve the learner's exact unit and lesson counts; select meaningful section counts based on the subject and length/detail budget."
}
${
  o.sectionsAuto === false
    ? `- Preserve exactly ${Math.max(1, o.sectionsPerLesson ?? 1)} sections in every lesson.`
    : "- Let section count reflect the selected length/detail setting and the actual concepts in each lesson."
}
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

FULL SAMPLE REFERENCE — JSON shape only; its short sample is not a target for course size, lesson depth, or organization
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
- Always include an explanation and a concept label.
- Put each checkpoint question beside the concept it tests; the question and its explanation must be answerable from that lesson's teaching.`;
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
