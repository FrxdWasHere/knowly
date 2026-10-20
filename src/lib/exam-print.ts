import type { Difficulty, Question, QuestionType } from "./types";
import { shuffleArray } from "./answers";

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
  fontFamily: ExamFont;
  fontSize: "small" | "normal" | "large";
  headerAlign: "left" | "center";
  numberStyle: "dot" | "q" | "paren";
  optionCase: "upper" | "lower";
}

export type ExamFont =
  "default" | "classic" | "serif" | "sans" | "rounded" | "mono" | "handwritten";

/** Fonts that ship with the computer — no downloads, works fully offline. */
export const EXAM_FONTS: { id: ExamFont; label: string; stack: string }[] = [
  { id: "default", label: "Normal", stack: "var(--font-sans, inherit)" },
  { id: "classic", label: "Classic", stack: '"Times New Roman", Times, serif' },
  { id: "serif", label: "Book serif", stack: 'Georgia, Cambria, "Palatino Linotype", serif' },
  { id: "sans", label: "Clean sans", stack: 'Arial, Helvetica, "Segoe UI", system-ui, sans-serif' },
  { id: "rounded", label: "Friendly", stack: '"Trebuchet MS", Verdana, "Segoe UI", sans-serif' },
  { id: "mono", label: "Typewriter", stack: '"Courier New", Courier, ui-monospace, monospace' },
  {
    id: "handwritten",
    label: "Handwritten",
    stack: '"Comic Sans MS", "Chalkboard SE", "Bradley Hand", cursive',
  },
];

/** Per-question edits made directly on the paper. */
export interface QuestionEdit {
  question?: string;
  options?: Record<number, string>;
  removed?: boolean;
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
    fontFamily: "default",
    fontSize: "normal",
    headerAlign: "left",
    numberStyle: "dot",
    optionCase: "upper",
  };
}

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

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
