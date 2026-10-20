import { describe, expect, it } from "vitest";
import { checkAnswer, dayKey, formatDuration, shuffleArray, similarity } from "./answers";
import type { Question } from "./types";

const make = (over: Partial<Question>): Question => ({
  id: "q1",
  type: "short-answer",
  question: "Q",
  answer: "answer",
  difficulty: "medium",
  ...over,
});

describe("dayKey", () => {
  it("formats a local YYYY-MM-DD key", () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("keys on the local calendar date at local midnight", () => {
    // Regression guard: the old UTC implementation returned the previous day
    // for positive UTC offsets at local midnight.
    expect(dayKey(new Date(2026, 0, 1, 0, 0, 0))).toBe("2026-01-01");
  });

  it("keys on the local calendar date late at night", () => {
    // …and the next day for negative UTC offsets late at night.
    expect(dayKey(new Date(2026, 5, 30, 23, 30, 0))).toBe("2026-06-30");
  });

  it("zero-pads month and day", () => {
    expect(dayKey(new Date(2026, 8, 9))).toBe("2026-09-09");
  });
});

describe("similarity", () => {
  it("is 1 for identical token sets", () => {
    expect(similarity("hello world", "World Hello")).toBe(1);
  });

  it("is 0 when there is no overlap", () => {
    expect(similarity("apple", "banana")).toBe(0);
  });
});

describe("checkAnswer", () => {
  it("matches multiple-choice case- and punctuation-insensitively", () => {
    const q = make({ type: "multiple-choice", answer: "Fluid mosaic model." });
    expect(checkAnswer(q, "fluid mosaic model")).toBe(true);
    expect(checkAnswer(q, "rigid lattice")).toBe(false);
  });

  it("treats flashcards as always correct", () => {
    expect(checkAnswer(make({ type: "flashcard", answer: "x" }), "anything")).toBe(true);
  });

  it("accepts close fill-blank answers", () => {
    const q = make({ type: "fill-blank", answer: "3 sodium ions" });
    expect(checkAnswer(q, "3 sodium ions")).toBe(true);
    expect(checkAnswer(q, "3 sodium")).toBe(false);
  });

  it("rejects blank answers", () => {
    expect(checkAnswer(make({ type: "short-answer" }), "   ")).toBe(false);
  });

  it("delegates interactive types to the interactive checker", () => {
    const q = make({ type: "ordering", items: ["a", "b", "c"], answer: "a | b | c" });
    expect(checkAnswer(q, "a | b | c")).toBe(true);
    expect(checkAnswer(q, "c | b | a")).toBe(false);
  });
});

describe("shuffleArray", () => {
  it("returns a permutation without mutating the input", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffleArray(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });
});

describe("formatDuration", () => {
  it("formats minutes and seconds", () => {
    expect(formatDuration(65_000)).toBe("1m 5s");
  });
  it("formats hours", () => {
    expect(formatDuration(3_600_000 * 2)).toBe("2h 0m");
  });
});
