import {
  SAMPLE_DECK_JSON,
  SAMPLE_QUESTIONS_JSON,
  SAMPLE_COURSE_JSON,
  SAMPLE_MODULE_JSON,
  COURSE_FIELD_DOCS,
  MODULE_FIELD_DOCS,
} from "./schema";
import type { Difficulty, QuestionType } from "./types";
import {
  getLengthInstructions,
  lengthBudgetForPreset,
  presetForSliderValue,
} from "./length-detail";
import {
  LEARNING_PATH_SCHEMA_TEXT,
  buildLearningPathInstructions,
  type LearningPathPromptOptions,
} from "./learning-path-prompt-builder";

/* ------------------------------------------------------------------ *
 * Shared prompt blocks
 *
 * Every prompt preset (deck, deck expansion, course, lesson, module)
 * prints the SAME complete schema and a full worked sample, so an AI
 * never has to guess a field — and every preset asks for a .json file.
 * ------------------------------------------------------------------ */

/** The output rule shared by every prompt: one complete JSON file, nothing else. */
export function jsonFileRule(name: string) {
  return [
    `- Output the result as a JSON FILE named \`${name}\` — one complete, valid JSON document the learner can save straight to disk.`,
    "- Reply with the contents of that file and nothing else: no markdown fences, no filename heading, no commentary before or after.",
    "- Every string must be valid JSON (escape quotes, newlines and backslashes).",
  ].join("\n");
}

/** Strict instructions to follow the format completely and include all fields */
export const STRICT_FORMAT_RULES = [
  "CRITICAL: You MUST follow this format EXACTLY. Every field shown in the schema is REQUIRED — do not omit optional fields, do not add new fields, do not rename fields.",
  "CRITICAL: Include ALL fields from the complete sample, whether marked optional or not. The app requires every field to be present.",
  "CRITICAL: Validate your entire output against the complete sample provided above — every key, every data type, every structure must match.",
  "CRITICAL: If you are unsure about a field or its value, refer directly to the complete sample — copy its structure and adapt only the string content.",
].join("\n");

/** The note that stops a model from copying the sample's content verbatim. */
export const SAMPLE_NOTE =
  "The sample below is a SHAPE reference, not content to copy: take its keys and value types, and write every string yourself from the material and brief above.";

/** The full question object: every field, including the optional ones. */
export const QUESTION_SCHEMA_TEXT = `{
  "type": "flashcard" | "multiple-choice" | "true-false" | "fill-blank" | "short-answer" | "ordering" | "matching" | "word-bank",  // required
  "question": string,                             // required — the prompt the learner sees
  "answer": string,                               // required for flashcard, multiple-choice, true-false, fill-blank and short-answer
  "options": string[],                            // required for multiple-choice only — 2-6 options; "answer" must match one exactly
  "incorrectExplanation": string,                 // required for single-answer questions — common wrong answers and misconceptions
  "items": string[],                              // required for ordering only — 3-6 steps in the CORRECT order (the app shuffles them)
  "pairs": [{ "left": string, "right": string }], // required for matching only — 3-5 couples, every "right" unique
  "blanks": string[],                             // required for word-bank only — the correct word for each ___ in "question", in order
  "wordBank": string[],                           // required for word-bank only — the blanks plus 2-3 plausible distractors
  "explanation": string,                          // required — 1-2 sentences on why the answer is right
  "difficulty": "easy" | "medium" | "hard",       // required
  "concept": string,                              // required — the specific topic tested; reuse the same label consistently
  "hint": string,                                  // required — one-line nudge that never gives the answer away
  "tutor": {
    "simple": string,                              // required — the idea in plain words, no jargon
    "whyCorrect": string,                          // required for multiple-choice and true-false — why the correct option is right
    "mnemonic": string,                            // required — a memory hook the learner can recall under pressure
    "example": string,                             // required — one concrete example or analogy
    "whyWrong": [{ "option": string, "why": string }] // required for multiple-choice and true-false only — one entry per incorrect option
  },
  "tags": string[]                                // required — free-form labels
}`;

/**
 * The tutor notes are written with the question, not fetched later: the app is
 * offline, so anything a tutor chat would say has to arrive inside the JSON.
 */
export const TUTOR_RULES = `- Every question carries pre-written tutor notes in "tutor". They stand in for a tutor chat, so they must be useful on their own — the learner reads them mid-session without leaving the quiz.
- "simple": 1-2 short sentences restating the idea in plain language a beginner understands; no jargon carried over from the question.
- "incorrectExplanation": for single-answer types, describe common wrong answers and the misconception behind each; explain why the learner's likely reasoning is tempting but wrong. Do not claim to know the learner's personal history.
- "whyCorrect": for multiple-choice and true-false, explain specifically why the correct option is correct, not just restate it.
- "mnemonic": one memory hook — acronym, rhyme, image, rhyme or a tiny story. It must be specific to this fact, not generic advice like "review regularly".
- "example": optional; one concrete case, number or analogy that makes the idea stick.
- "whyWrong": multiple-choice and true-false questions need one { "option", "why" } entry for EVERY incorrect option. Copy the option text exactly and explain the specific misconception that makes it wrong — never just say "incorrect".
- For multiple-choice questions, include both "whyCorrect" and complete "whyWrong" entries so every option has a rationale.`;

/** The full deck object. */
export const DECK_SCHEMA_TEXT = `{
  "title": string,                 // required — deck name
  "subject": string,               // required — subject area, e.g. "Biology"
  "description": string,           // required — one-line summary
  "tags": string[],                // required — free-form labels
  "lengthPreset": "shorter" | "short" | "regular" | "long" | "longer", // required — selected Learning Path depth
  "isSTEM": boolean,               // required — true for a maths or science deck
  "needsEquations": boolean,       // required — true when the questions rely on LaTeX maths
  "needsGraphs": boolean,          // required — true when the questions refer to graphs or diagrams
  "questions": [ Question ],       // required — one or more, each using the full Question object below
  "learningPath": LearningPath     // required — the progressive journey through the questions
}`;

/** The Learning Path object: the primary structure of a deck. */
export const LEARNING_PATH_BLOCK_TEXT = `LEARNING PATH OBJECT — the deck's spine
${LEARNING_PATH_SCHEMA_TEXT}`;

/** The full question-pack object (expanding an existing deck). */
export const QUESTION_PACK_SCHEMA_TEXT = `{
  "deckTitle": string,             // optional — the deck being extended
  "questions": [ Question ]        // required — only the NEW questions, each using the full Question object below
}`;

export interface PromptOptions {
  material: string;
  title: string;
  subject: string;
  count: number;
  distribution: Record<Difficulty, number>;
  types: QuestionType[];
  extra: string;
  /** learner level, from the profile */
  audience?: string;
  /** why the learner is studying, from the profile */
  purpose?: string;
  /** math & science subject: write questions with real math notation */
  isSTEM?: boolean;
  /** questions should use LaTeX ($…$) for equations */
  needsEquations?: boolean;
  /** questions may reference graphs and diagrams */
  needsGraphs?: boolean;
  /** "whatever you see fit": let the AI choose the number of questions */
  countAuto?: boolean;
  /** "whatever you see fit": let the AI choose which question types fit */
  typesAuto?: boolean;
  /** "whatever you see fit": let the AI choose the difficulty spread */
  distributionAuto?: boolean;
  /** shared length/detail slider (0–100); presets are derived from it */
  lengthSliderValue?: number;
  /** the learning-path structure requested by the learner */
  learningPath?: LearningPathPromptOptions;
}

/**
 * The notation rules shared by the deck, append and course prompts.
 *
 * The app typesets LaTeX on every surface — study and quiz screens, the module
 * editor and viewer, the answer key, and the printed papers — so every prompt
 * is allowed to reach for LaTeX whenever it needs an equation. The STEM flags
 * only sharpen that instruction rather than switching it on.
 */
export function mathPromptSection(o: {
  isSTEM?: boolean;
  needsEquations?: boolean;
  needsGraphs?: boolean;
}) {
  const lines: string[] = [
    "- The app typesets LaTeX everywhere — on screen and on paper, in the question, options, answer key, explanations, hints, concept labels, tags and module content — so use LaTeX any time you need an equation, symbol, unit or formula.",
    "- Write inline math in $…$ (e.g. $x^2 + y^2 = r^2$, $\\frac{a}{b}$, $\\int_0^\\infty e^{-x}\\,dx$) and put larger equations on their own line in $$…$$.",
    "- Never fake an equation with plain characters and never put math inside a code block; keep ordinary words outside the math delimiters.",
    "- Escape backslashes so the JSON stays valid (e.g. \\\\frac in the raw file).",
  ];

  if (o.needsEquations) {
    lines.push("- Write ALL mathematical notation in LaTeX, not just the tricky parts.");
  }

  if (o.isSTEM) {
    lines.push(
      "- This is a math/science subject: prefer real LaTeX over ASCII substitutes like ^, /, sqrt or <=.",
    );
  }

  if (o.needsGraphs) {
    lines.push(
      "- For graph or diagram questions, describe the graph clearly in words (axes, shape, key points, labels) — do NOT reference or invent images. The app can only show text and LaTeX.",
    );
  }
  return lines.length ? `\nMATH & SCIENCE NOTATION\n${lines.join("\n")}\n` : "";
}

const AUTONOMY = "choose whatever you see fit";

/**
 * The suggested card count follows the material only when count is automatic;
 * otherwise the learner's requested count is honored exactly.
 */
export function deckSizeTarget(auto: boolean | undefined, requested: number, material: string) {
  const words = material.trim() ? material.trim().split(/\s+/).length : 0;
  return auto ? Math.ceil(words / 25) : requested;
}

export function deckSizeLine(auto: boolean | undefined, requested: number, material: string) {
  const words = material.trim() ? material.trim().split(/\s+/).length : 0;
  // roughly one card per 25 words of source material
  const fromMaterial = Math.ceil(words / 25);
  const lines = [
    auto
      ? "- Choose a suitable number of cards for the supplied material (~1 card per 25 words as a rough guide); do not force a minimum or pad."
      : `- Write exactly ${requested} cards, as requested.`,
    "- Prefer many small cards that test one fact, definition, step or distinction each. Never pad, repeat a question in different words, or split a single idea into filler — if the material is short, write fewer, sharper cards rather than variations.",
    `- Give each card a consistent, specific "concept" label. Use only as many concepts as the material supports; the Learning Path groups related concepts into stages.`,
  ];
  if (!auto && fromMaterial !== requested) {
    lines.push(
      `- The supplied material is about ${words.toLocaleString("en-US")} words, which suggests roughly ${fromMaterial.toLocaleString("en-US")} cards; honor the requested count above.`,
    );
  }
  if (auto) {
    lines.push("- Decide the final count based on the amount and density of material supplied.");
  }
  return lines.join("\n");
}

/** The output-rule line for the question count, honouring "whatever you see fit". */
function countLine(auto: boolean | undefined, count: number, what: string) {
  if (auto) return `- Decide how many ${what} to write — ${AUTONOMY} for the material; do not pad.`;
  return `- Generate exactly ${count} ${what}.`;
}

/** The allowed-types line, honouring "whatever you see fit". */
function typesLine(auto: boolean | undefined, typeList: string, label: string) {
  if (auto) {
    return `- ${label}: ${AUTONOMY} — pick the mix that tests this material best.`;
  }
  return `- ${label}: ${typeList || "multiple-choice"}`;
}

/** The difficulty-mix line, honouring "whatever you see fit". */
function distributionLine(auto: boolean | undefined, dist: Record<Difficulty, number>) {
  if (auto) return `- difficulty mix: ${AUTONOMY} across easy, medium and hard.`;
  const total = dist.easy + dist.medium + dist.hard || 1;
  const pct = (n: number) => Math.round((n / total) * 100);
  return `- difficulty mix: ~${pct(dist.easy)}% easy, ~${pct(dist.medium)}% medium, ~${pct(dist.hard)}% hard`;
}

export function buildPrompt(o: PromptOptions) {
  const typeList = o.types.join(", ");
  const sliderValue =
    typeof o.lengthSliderValue === "number"
      ? o.lengthSliderValue
      : lengthBudgetForPreset("regular").sliderValue;
  const pathOptions: LearningPathPromptOptions = {
    sliderValue,
    ...o.learningPath,
  };
  const lengthPreset = pathOptions.lengthPreset ?? presetForSliderValue(sliderValue);

  return `You are an expert curriculum designer. Convert the study material below into a Knowly deck built around a Learning Path.

OUTPUT RULES
${jsonFileRule("knowly-deck.json")}
${deckSizeLine(o.countAuto, o.count, o.material)}
- The deck is one coherent learning journey: design the questions and the Learning Path together, not as two unrelated lists.

SCHEMA — the complete deck object
${DECK_SCHEMA_TEXT}

${LEARNING_PATH_BLOCK_TEXT}

${buildLearningPathInstructions(pathOptions)}

${getLengthInstructions(sliderValue)}

QUESTION OBJECT — every field, verbatim
${QUESTION_SCHEMA_TEXT}

TUTOR NOTES — pre-written inside every question
${TUTOR_RULES}

FULL SAMPLE REFERENCE — a complete, working deck using all eight question types
${SAMPLE_NOTE}
${SAMPLE_DECK_JSON}

FORMAT ADHERENCE — CRITICAL
${STRICT_FORMAT_RULES}

INTERACTIVE TYPE RULES
- ordering: list "items" in the correct sequence; the app shuffles them for the learner. No "answer" field.
- matching: give 3-5 "pairs"; every "right" value must be unique and plausible for more than one "left". No "answer" field.
- word-bank: the "question" text must contain one ___ placeholder per blank, and "blanks" must have exactly that many entries in the same order.

DECK SETTINGS
- title: "${o.title || "Untitled Deck"}"
- subject: "${o.subject || "General"}"
${typesLine(o.typesAuto, typeList, "allowed question types")}
${distributionLine(o.distributionAuto, o.distribution)}
- lengthPreset: "${lengthPreset}" — preserve this selected Learning Path depth in the deck JSON
${o.audience ? `- learner level: ${o.audience} — pitch wording and depth accordingly` : ""}
${o.purpose ? `- study goal: ${o.purpose} — bias the questions toward this goal` : ""}
${mathPromptSection(o)}

QUALITY BAR
- Test understanding, not trivia phrasing. Avoid duplicate questions.
- Distractors must be plausible and mutually exclusive.
- Keep every "concept" value consistent so topic analytics and stages group correctly.
- Explanations: 1-2 sentences, self-contained.
- Every question belongs to at least one stage activity; missed concepts should have a natural place to return later.
${o.extra ? `\nADDITIONAL INSTRUCTIONS\n${o.extra}\n` : ""}
STUDY MATERIAL
"""
${o.material || "(paste your study material here)"}
"""`;
}

export function estimateQuestions(materialLength: number) {
  return Math.max(5, Math.min(80, Math.round(materialLength / 220)));
}
export interface AppendPromptOptions {
  material: string;
  deckTitle: string;
  subject: string;
  count: number;
  distribution: Record<Difficulty, number>;
  types: QuestionType[];
  extra: string;
  /** Existing question prompts so the model avoids duplicates. */
  existingQuestions: string[];
  /** Concepts already covered in the deck. */
  existingConcepts: string[];
  audience?: string;
  purpose?: string;
  /** math & science subject flags */
  isSTEM?: boolean;
  needsEquations?: boolean;
  needsGraphs?: boolean;
  /** "whatever you see fit": let the AI choose the number of questions */
  countAuto?: boolean;
  /** "whatever you see fit": let the AI choose which question types fit */
  typesAuto?: boolean;
  /** "whatever you see fit": let the AI choose the difficulty spread */
  distributionAuto?: boolean;
  /** shared length/detail slider (0–100); presets are derived from it */
  lengthSliderValue?: number;
  /** guidance for how the new questions should join the existing path */
  learningPath?: LearningPathPromptOptions;
}

export function buildAppendPrompt(o: AppendPromptOptions) {
  const typeList = o.types.join(", ");
  const sample = o.existingQuestions.slice(0, 60);
  const sliderValue =
    typeof o.lengthSliderValue === "number"
      ? o.lengthSliderValue
      : lengthBudgetForPreset("regular").sliderValue;

  return `You are an expert curriculum designer. Expand an EXISTING Knowly deck with additional questions.

OUTPUT RULES
${jsonFileRule("knowly-new-questions.json")}
- Keep the file to the questions payload below — no deck metadata (no color, tags or description).
${countLine(o.countAuto, o.count, "NEW questions that do not duplicate the existing ones")}
- The new questions will be woven into the deck's existing Learning Path, so give each one a clear concept and a difficulty that fits where it belongs.

SCHEMA — the complete question-pack object
${QUESTION_PACK_SCHEMA_TEXT}

QUESTION OBJECT — every field, verbatim
${QUESTION_SCHEMA_TEXT}

TUTOR NOTES — pre-written inside every question
${TUTOR_RULES}

FULL SAMPLE REFERENCE — a complete question pack
${SAMPLE_NOTE}
${SAMPLE_QUESTIONS_JSON}

FORMAT ADHERENCE — CRITICAL
${STRICT_FORMAT_RULES}

INTERACTIVE TYPE RULES
- ordering: list "items" in the correct sequence; the app shuffles them. No "answer" field.
- matching: give 3-5 "pairs" with unique, plausible "right" values. No "answer" field.
- word-bank: one ___ placeholder in "question" per entry in "blanks", in the same order.

DECK CONTEXT
- deck: "${o.deckTitle || "Existing Deck"}" (${o.subject || "General"})
${typesLine(o.typesAuto, typeList, "allowed question types")}
${distributionLine(o.distributionAuto, o.distribution)}
${o.existingConcepts.length ? `- concepts already covered (reuse these exact labels where relevant): ${o.existingConcepts.join(", ")}` : ""}
${o.audience ? `- learner level: ${o.audience} — pitch wording and depth accordingly` : ""}
${o.purpose ? `- study goal: ${o.purpose} — bias the questions toward this goal` : ""}
${mathPromptSection(o)}

${getLengthInstructions(sliderValue)}

LEARNING PATH CONTINUITY
- New questions should strengthen gaps and weak concepts, not duplicate cards.
- Prefer concepts that already exist so the new cards can join the right stage.
- Include a few harder cards that can serve as integration or mastery practice.
- If a concept was previously missed, write a fresh angle on it rather than repeating the same wording.

EXISTING QUESTIONS — DO NOT REPEAT OR REPHRASE
${sample.length ? sample.map((q, i) => `${i + 1}. ${q}`).join("\n") : "(none)"}

QUALITY BAR
- Cover gaps and deeper angles rather than restating what is already asked.
- Distractors must be plausible and mutually exclusive.
- Explanations: 1-2 sentences, self-contained.
${o.extra ? `\nADDITIONAL INSTRUCTIONS\n${o.extra}\n` : ""}
NEW STUDY MATERIAL
"""
${o.material || "(paste the new study material here — or expand on the concepts listed above)"}
"""`;
}
