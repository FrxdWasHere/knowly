import { buildPrompt } from "../prompt";
import type { NotePage } from "./types";
import { textFromPage } from "./types";

export function collectNotebookText(pages: NotePage[]): string {
  return pages
    .map((page, index) => `--- Page ${index + 1} ---\n${textFromPage(page)}`)
    .filter((part) => part.replace(/--- Page \d+ ---/g, "").trim().length > 0)
    .join("\n\n");
}

export function buildNotesFlashcardPrompt(title: string, text: string, count = 15): string {
  return buildPrompt({
    material: text,
    title: `${title} — Notebook`,
    subject: "Notes",
    count,
    distribution: { easy: 20, medium: 60, hard: 20 } as never,
    types: ["flashcard", "multiple-choice", "short-answer", "true-false"],
    extra:
      "Base every question only on the supplied notebook text. Keep concepts faithful to the notes.",
  });
}

export function buildNotesSummaryPrompt(title: string, text: string): string {
  return `You are a study coach. Turn the notebook below into a compact revision sheet.

NOTEBOOK: ${title}

RULES
- Respond in markdown only.
- Start with a 5-bullet big picture.
- Then a "Key ideas" section with short definitions.
- Then a "Connections" section showing how ideas relate.
- Then a "Likely exam questions" section with 5 questions and brief answer skeletons.
- Then a "Gaps to check" section naming anything unclear or missing.
- Do not invent facts that are not supported by the notes. Flag uncertainty explicitly.

NOTEBOOK TEXT
${text}`;
}

export function buildNotesQuizPrompt(title: string, text: string, count = 10): string {
  return buildPrompt({
    material: text,
    title: `${title} — Notebook Quiz`,
    subject: "Notes",
    count,
    distribution: { easy: 25, medium: 50, hard: 25 } as never,
    types: ["multiple-choice", "true-false", "short-answer"],
    extra: "Use only the notebook text. Prefer application and reasoning over recall of wording.",
  });
}
