import type { Difficulty, QuestionType } from "./types";

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
}

export function buildPrompt(o: PromptOptions) {
  const total = o.distribution.easy + o.distribution.medium + o.distribution.hard || 1;
  const pct = (n: number) => Math.round((n / total) * 100);
  const typeList = o.types.join(", ");

  return `You are an expert exam writer. Convert the study material below into a Knowly deck.

OUTPUT RULES
- Respond with ONE valid JSON object and nothing else. No markdown fences, no commentary.
- Every string must be valid JSON (escape quotes and newlines).
- Generate exactly ${o.count} questions.

SCHEMA
{
  "title": string,
  "subject": string,
  "description": string,
  "tags": string[],
  "questions": [
    {
      "type": "flashcard" | "multiple-choice" | "true-false" | "fill-blank" | "short-answer" | "ordering" | "matching" | "word-bank",
      "question": string,
      "options": string[],          // multiple-choice only, 4 entries
      "answer": string,             // must exactly match one option for multiple-choice; "true"/"false" for true-false; omit for ordering/matching/word-bank
      "items": string[],            // ordering only: 3-6 steps written in the CORRECT order
      "pairs": [{ "left": string, "right": string }], // matching only: 3-5 couples
      "blanks": string[],           // word-bank only: the correct word for each ___ in "question", in order
      "wordBank": string[],         // word-bank only: the blank answers plus 2-3 plausible distractors
      "explanation": string,        // why the answer is correct
      "difficulty": "easy" | "medium" | "hard",
      "concept": string             // the specific topic being tested
    }
  ]
}

INTERACTIVE TYPE RULES
- ordering: list "items" in the correct sequence; the app shuffles them for the learner. No "answer" field.
- matching: give 3-5 "pairs"; every "right" value must be unique and plausible for more than one "left". No "answer" field.
- word-bank: the "question" text must contain one ___ placeholder per blank, and "blanks" must have exactly that many entries in the same order.

DECK SETTINGS
- title: "${o.title || "Untitled Deck"}"
- subject: "${o.subject || "General"}"
- allowed question types: ${typeList || "multiple-choice"}
- difficulty mix: ~${pct(o.distribution.easy)}% easy, ~${pct(o.distribution.medium)}% medium, ~${pct(o.distribution.hard)}% hard
${o.audience ? `- learner level: ${o.audience} — pitch wording and depth accordingly` : ""}
${o.purpose ? `- study goal: ${o.purpose} — bias the questions toward this goal` : ""}

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
}

export function buildAppendPrompt(o: AppendPromptOptions) {
  const total = o.distribution.easy + o.distribution.medium + o.distribution.hard || 1;
  const pct = (n: number) => Math.round((n / total) * 100);
  const typeList = o.types.join(", ");
  const sample = o.existingQuestions.slice(0, 60);

  return `You are an expert exam writer. Expand an EXISTING Knowly deck with additional questions.

OUTPUT RULES
- Respond with ONE valid JSON object and nothing else. No markdown fences, no commentary.
- Do NOT return deck metadata (no color, tags or description) — only the questions payload below.
- Generate exactly ${o.count} NEW questions that do not duplicate the existing ones.

SCHEMA
{
  "deckTitle": "${o.deckTitle || "Existing Deck"}",
  "questions": [
    {
      "type": "flashcard" | "multiple-choice" | "true-false" | "fill-blank" | "short-answer" | "ordering" | "matching" | "word-bank",
      "question": string,
      "options": string[],          // multiple-choice only, 4 entries
      "answer": string,             // must exactly match one option for multiple-choice; "true"/"false" for true-false; omit for ordering/matching/word-bank
      "items": string[],            // ordering only: 3-6 steps written in the CORRECT order
      "pairs": [{ "left": string, "right": string }], // matching only: 3-5 couples
      "blanks": string[],           // word-bank only: the correct word for each ___ in "question", in order
      "wordBank": string[],         // word-bank only: the blank answers plus 2-3 plausible distractors
      "explanation": string,
      "difficulty": "easy" | "medium" | "hard",
      "concept": string             // reuse an existing concept label when the topic matches
    }
  ]
}

INTERACTIVE TYPE RULES
- ordering: list "items" in the correct sequence; the app shuffles them. No "answer" field.
- matching: give 3-5 "pairs" with unique, plausible "right" values. No "answer" field.
- word-bank: one ___ placeholder in "question" per entry in "blanks", in the same order.

DECK CONTEXT
- deck: "${o.deckTitle || "Existing Deck"}" (${o.subject || "General"})
- allowed question types: ${typeList || "multiple-choice"}
- difficulty mix: ~${pct(o.distribution.easy)}% easy, ~${pct(o.distribution.medium)}% medium, ~${pct(o.distribution.hard)}% hard
${o.existingConcepts.length ? `- concepts already covered (reuse these exact labels where relevant): ${o.existingConcepts.join(", ")}` : ""}
${o.audience ? `- learner level: ${o.audience} — pitch wording and depth accordingly` : ""}
${o.purpose ? `- study goal: ${o.purpose} — bias the questions toward this goal` : ""}

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
