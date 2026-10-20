import { checkInteractive, isInteractive } from "./interactive";
import type { Question } from "./types";

const normalize = (v: string) =>
  v
    .toLowerCase()
    .trim()
    .replace(/[.,;:!?"'`]/g, "")
    .replace(/\s+/g, " ");

/** Lightweight similarity for short answers (token overlap). */
export function similarity(a: string, b: string) {
  const at = new Set(normalize(a).split(" ").filter(Boolean));
  const bt = new Set(normalize(b).split(" ").filter(Boolean));
  if (!at.size || !bt.size) return 0;
  let hits = 0;
  at.forEach((t) => {
    if (bt.has(t)) hits += 1;
  });
  return hits / Math.max(at.size, bt.size);
}

export function checkAnswer(question: Question, given: string): boolean {
  if (isInteractive(question.type)) return checkInteractive(question, given);
  const g = normalize(given);
  const a = normalize(question.answer);
  if (!g) return false;
  switch (question.type) {
    case "multiple-choice":
    case "true-false":
      return g === a;
    case "fill-blank":
      return g === a || similarity(given, question.answer) >= 0.8;
    case "short-answer":
      return g === a || similarity(given, question.answer) >= 0.55;
    case "flashcard":
      return true;
    default:
      return g === a;
  }
}

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const TYPE_LABELS: Record<string, string> = {
  flashcard: "Flashcard",
  "multiple-choice": "Multiple Choice",
  "true-false": "True / False",
  "fill-blank": "Fill in the Blank",
  "short-answer": "Short Answer",
  ordering: "Ordering",
  matching: "Matching",
  "word-bank": "Word Bank",
};

export function formatDuration(ms: number) {
  const totalSeconds = Math.round(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Local calendar day key (`YYYY-MM-DD`). Uses the user's local date rather than
 * UTC so streaks and daily goals roll over at local midnight, not 00:00 UTC.
 * The zero-padded format keeps plain string comparison meaningful.
 */
export const dayKey = (d: Date | number = new Date()) => {
  const date = new Date(d);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};
