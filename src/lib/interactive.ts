import type { Question, QuestionType } from "./types";

/** Separators used to serialise multi-item answers into the flat `answer` string. */
export const ITEM_SEP = " | ";
export const PAIR_SEP = " => ";
/** Placeholder marking a blank inside a word-bank question. */
export const BLANK_TOKEN = "___";

export const INTERACTIVE_TYPES: QuestionType[] = ["ordering", "matching", "word-bank"];

export const isInteractive = (t: QuestionType) => INTERACTIVE_TYPES.includes(t);

export const serializeOrdering = (items: string[]) => items.join(ITEM_SEP);

export const serializeMatching = (pairs: { left: string; right: string }[]) =>
  pairs.map((p) => `${p.left}${PAIR_SEP}${p.right}`).join(ITEM_SEP);

export const serializeWordBank = (blanks: string[]) => blanks.join(ITEM_SEP);

/** Number of `___` placeholders in a word-bank prompt. */
export const countBlanks = (text: string) => text.split(BLANK_TOKEN).length - 1;

/** Splits a word-bank prompt into the text segments surrounding each blank. */
export const splitBlanks = (text: string) => text.split(BLANK_TOKEN);

/** The authoritative answer string for a question, derived from structured fields. */
export function canonicalAnswer(q: Question): string {
  switch (q.type) {
    case "ordering":
      return q.items?.length ? serializeOrdering(q.items) : q.answer;
    case "matching":
      return q.pairs?.length ? serializeMatching(q.pairs) : q.answer;
    case "word-bank":
      return q.blanks?.length ? serializeWordBank(q.blanks) : q.answer;
    default:
      return q.answer;
  }
}

/** Human friendly answer text used in feedback panels and reports. */
export function displayAnswer(q: Question): string {
  switch (q.type) {
    case "ordering":
      return (q.items ?? canonicalAnswer(q).split(ITEM_SEP))
        .map((it, i) => `${i + 1}. ${it}`)
        .join("  ");
    case "matching":
      return (q.pairs ?? []).map((p) => `${p.left} → ${p.right}`).join("   ·   ") ||
        canonicalAnswer(q);
    case "word-bank":
      return (q.blanks ?? canonicalAnswer(q).split(ITEM_SEP)).join(", ");
    default:
      return q.answer;
  }
}

/** Full pool of draggable words for a word-bank question (answers + distractors). */
export function wordBankPool(q: Question): string[] {
  const blanks = q.blanks ?? [];
  const extra = (q.wordBank ?? []).filter((w) => !blanks.includes(w));
  return [...blanks, ...extra];
}

const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

/** Compares a serialised learner response against the expected answer. */
export function checkInteractive(q: Question, given: string): boolean {
  if (!given.trim()) return false;
  const expected = canonicalAnswer(q);
  if (q.type === "matching") {
    const toMap = (s: string) =>
      new Map(
        s
          .split(ITEM_SEP)
          .map((chunk) => chunk.split(PAIR_SEP))
          .filter((parts) => parts.length === 2)
          .map(([l, r]) => [norm(l), norm(r)] as const),
      );
    const exp = toMap(expected);
    const got = toMap(given);
    if (exp.size === 0 || exp.size !== got.size) return false;
    for (const [l, r] of exp) if (got.get(l) !== r) return false;
    return true;
  }
  const a = expected.split(ITEM_SEP).map(norm);
  const b = given.split(ITEM_SEP).map(norm);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
