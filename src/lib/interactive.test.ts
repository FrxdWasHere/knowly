import { describe, expect, it } from "vitest";
import {
  canonicalAnswer,
  checkInteractive,
  countBlanks,
  displayAnswer,
  isInteractive,
  serializeMatching,
  serializeOrdering,
  serializeWordBank,
  splitBlanks,
  wordBankPool,
} from "./interactive";
import type { Question } from "./types";

const make = (over: Partial<Question>): Question => ({
  id: "q1",
  type: "ordering",
  question: "Q",
  answer: "",
  difficulty: "medium",
  ...over,
});

describe("isInteractive", () => {
  it("covers ordering, matching and word-bank only", () => {
    expect(isInteractive("ordering")).toBe(true);
    expect(isInteractive("matching")).toBe(true);
    expect(isInteractive("word-bank")).toBe(true);
    expect(isInteractive("multiple-choice")).toBe(false);
  });
});

describe("ordering", () => {
  const q = make({ type: "ordering", items: ["first", "second", "third"] });

  it("serialises and canonicalises in order", () => {
    expect(serializeOrdering(q.items!)).toBe("first | second | third");
    expect(canonicalAnswer(q)).toBe("first | second | third");
  });

  it("checks order strictly", () => {
    expect(checkInteractive(q, "first | second | third")).toBe(true);
    expect(checkInteractive(q, "third | second | first")).toBe(false);
  });

  it("renders a numbered display answer", () => {
    expect(displayAnswer(q)).toBe("1. first  2. second  3. third");
  });
});

describe("matching", () => {
  const q = make({
    type: "matching",
    pairs: [
      { left: "A", right: "1" },
      { left: "B", right: "2" },
    ],
  });

  it("serialises pairs", () => {
    expect(serializeMatching(q.pairs!)).toBe("A => 1 | B => 2");
  });

  it("is order-independent across pairs", () => {
    expect(checkInteractive(q, "B => 2 | A => 1")).toBe(true);
  });

  it("rejects wrong or incomplete assignments", () => {
    expect(checkInteractive(q, "A => 2 | B => 1")).toBe(false);
    expect(checkInteractive(q, "A => 1")).toBe(false);
  });
});

describe("word bank", () => {
  const q = make({
    type: "word-bank",
    question: "In a ___ solution the cell swells, in a ___ it shrinks.",
    blanks: ["hypotonic", "hypertonic"],
    wordBank: ["hypotonic", "hypertonic", "isotonic"],
  });

  it("counts and splits blanks", () => {
    expect(countBlanks(q.question)).toBe(2);
    expect(splitBlanks(q.question)).toHaveLength(3);
  });

  it("serialises blanks and canonical answer", () => {
    expect(serializeWordBank(q.blanks!)).toBe("hypotonic | hypertonic");
    expect(canonicalAnswer(q)).toBe("hypotonic | hypertonic");
  });

  it("builds the pool from blanks plus unique distractors", () => {
    expect(wordBankPool(q)).toEqual(["hypotonic", "hypertonic", "isotonic"]);
  });

  it("checks the blank sequence", () => {
    expect(checkInteractive(q, "hypotonic | hypertonic")).toBe(true);
    expect(checkInteractive(q, "hypertonic | hypotonic")).toBe(false);
  });
});
