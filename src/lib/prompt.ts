import { 
  SAMPLE_DECK_JSON, 
  SAMPLE_QUESTIONS_JSON,
  SAMPLE_COURSE_JSON,
  SAMPLE_MODULE_JSON,
  DECK_SCHEMA_TEXT as DECK_SCHEMA_FROM_SCHEMA,
  COURSE_FIELD_DOCS,
  MODULE_FIELD_DOCS,
} from "./schema";
import type { Difficulty, QuestionType } from "./types";

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
- "mnemonic": one memory hook — acronym, rhyme, image, rhyme or a tiny story. It must be specific to this fact, not generic advice like "review regularly".
- "example": optional; one concrete case, number or analogy that makes the idea stick.
- "whyWrong": multiple-choice and true-false questions need one { "option", "why" } entry for EVERY incorrect option. Copy the option text exactly and explain the specific misconception that makes it wrong — never just say "incorrect".`;

/** The full deck object. */
export const DECK_SCHEMA_TEXT = `{
  "title": string,                 // required — deck name
  "subject": string,               // required — subject area, e.g. "Biology"
  "description": string,           // required — one-line summary
  "tags": string[],                // required — free-form labels
  "isSTEM": boolean,               // required — true for a maths or science deck
  "needsEquations": boolean,       // required — true when the questions rely on LaTeX maths
  "needsGraphs": boolean,          // required — true when the questions refer to graphs or diagrams
  "questions": [ Question ]        // required — one or more, each using the full Question object below
}`;

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

/** Every new deck is asked for at least this many cards. */
export const MIN_DECK_SIZE = 200;

/**
 * The deck-size rule: a floor of 200 cards that grows with the source
 * material. Many small single-fact cards are easier to schedule than a few
 * dense ones, and the app fragments big decks into parts and rounds, so a
 * high card count costs the learner nothing.
 */
/**
 * The card count a new-deck prompt will actually request: the 200-card floor,
 * the material's own scale (~1 card per 25 words), or a higher request.
 */
export function deckSizeTarget(auto: boolean | undefined, requested: number, material: string) {
  const words = material.trim() ? material.trim().split(/\s+/).length : 0;
  return Math.max(MIN_DECK_SIZE, Math.ceil(words / 25), auto ? 0 : requested);
}

export function deckSizeLine(auto: boolean | undefined, requested: number, material: string) {
  const words = material.trim() ? material.trim().split(/\s+/).length : 0;
  // roughly one card per 25 words of source material
  const fromMaterial = Math.ceil(words / 25);
  const target = deckSizeTarget(auto, requested, material);
  const lines = [
    `- Write ${target} cards. ${MIN_DECK_SIZE} is the floor for a deck; above it the material sets the count (~1 card per 25 words of source, so twice the material means roughly twice the cards).`,
    "- Prefer many small cards that test one fact, definition, step or distinction each. Never pad, repeat a question in different words, or split a single idea into filler — if the material is short, write fewer, sharper cards rather than variations.",
    `- Spread the cards across at least four distinct "concept" labels (15-40 cards each) so the app can split the deck into sub-topic parts and short rounds.`,
  ];
  if (fromMaterial > MIN_DECK_SIZE) {
    lines.push(
      `- The supplied material is about ${words.toLocaleString("en-US")} words, which calls for roughly ${fromMaterial.toLocaleString("en-US")} cards.`,
    );
  }
  if (auto) {
    lines.push(
      "- Beyond that floor, decide the final count yourself: scale it to the amount and density of material supplied.",
    );
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

  return `You are an expert exam writer. Convert the study material below into a Knowly deck.

OUTPUT RULES
${jsonFileRule("knowly-deck.json")}
${deckSizeLine(o.countAuto, o.count, o.material)}

SCHEMA — the complete deck object
${DECK_SCHEMA_TEXT}

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
${o.audience ? `- learner level: ${o.audience} — pitch wording and depth accordingly` : ""}
${o.purpose ? `- study goal: ${o.purpose} — bias the questions toward this goal` : ""}
${mathPromptSection(o)}

QUALITY BAR
- Test understanding, not trivia phrasing. Avoid duplicate questions.
- Distractors must be plausible and mutually exclusive.
- Keep every "concept" value consistent so topic analytics group correctly.
- Explanations: 1-2 sentences, self-contained.
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
}

export function buildAppendPrompt(o: AppendPromptOptions) {
  const typeList = o.types.join(", ");
  const sample = o.existingQuestions.slice(0, 60);

  return `You are an expert exam writer. Expand an EXISTING Knowly deck with additional questions.

OUTPUT RULES
${jsonFileRule("knowly-new-questions.json")}
- Keep the file to the questions payload below — no deck metadata (no color, tags or description).
${countLine(o.countAuto, o.count, "NEW questions that do not duplicate the existing ones")}

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
