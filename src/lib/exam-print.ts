import type { Difficulty, Question, QuestionType } from "./types";

export interface ExamOptions {
  title: string;
  subject: string;
  date: string;
  studentName: string;
  studentClass: string;
  instructions: string;
  showNameLines: boolean;
  showInstructions: boolean;
  showPoints: boolean;
  pointsPerQuestion: number;
  columns: 1 | 2;
  spacing: "compact" | "roomy";
  answerLines: number;
  includeAnswerKey: boolean;
}

export const DEFAULT_INSTRUCTIONS =
  "Answer all questions. Write clearly in the space provided. No notes or devices allowed unless stated otherwise.";

export const ALL_TYPES: QuestionType[] = [
  "flashcard",
  "multiple-choice",
  "true-false",
  "fill-blank",
  "short-answer",
  "ordering",
  "matching",
  "word-bank",
];

export const ALL_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export const TYPE_LABELS: Record<QuestionType, string> = {
  flashcard: "Flashcard",
  "multiple-choice": "Multiple choice",
  "true-false": "True / false",
  "fill-blank": "Fill in the blank",
  "short-answer": "Short answer",
  ordering: "Ordering",
  matching: "Matching",
  "word-bank": "Word bank",
};

export function defaultExamOptions(title = "Practice Exam", subject = ""): ExamOptions {
  return {
    title,
    subject,
    date: "",
    studentName: "",
    studentClass: "",
    instructions: DEFAULT_INSTRUCTIONS,
    showNameLines: true,
    showInstructions: true,
    showPoints: true,
    pointsPerQuestion: 1,
    columns: 1,
    spacing: "roomy",
    answerLines: 2,
    includeAnswerKey: true,
  };
}

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function shuffleArray<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export interface SelectionFilters {
  types: QuestionType[];
  difficulties: Difficulty[];
  count: number;
  shuffle: boolean;
}

/** Filters a question pool by type/difficulty, optionally shuffles, then trims to `count`. */
export function selectQuestions(pool: Question[], filters: SelectionFilters): Question[] {
  const filtered = pool.filter(
    (q) => filters.types.includes(q.type) && filters.difficulties.includes(q.difficulty),
  );
  const ordered = filters.shuffle ? shuffleArray(filtered) : filtered;
  return ordered.slice(0, Math.max(1, filters.count));
}

/** Human-readable answer for the answer key. */
export function printableAnswer(q: Question): string {
  if (q.type === "ordering" && q.items?.length) {
    return q.items.map((item, i) => `${i + 1}. ${item}`).join("  ");
  }
  if (q.type === "matching" && q.pairs?.length) {
    return q.pairs.map((p) => `${p.left} → ${p.right}`).join("; ");
  }
  if (q.type === "word-bank" && q.blanks?.length) {
    return q.blanks.join(", ");
  }
  return q.answer;
}
