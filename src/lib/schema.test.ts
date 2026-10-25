import { describe, expect, it } from "vitest";
import {
  SAMPLE_DECK_JSON,
  SAMPLE_QUESTIONS_JSON,
  validateDeckJson,
  validateQuestionsJson,
} from "./schema";

describe("validateDeckJson", () => {
  it("accepts the bundled sample deck", () => {
    const result = validateDeckJson(SAMPLE_DECK_JSON);
    expect(result.ok).toBe(true);
    expect(result.deck?.questions).toHaveLength(8);
    expect(result.deck?.title).toContain("Cell Biology");
  });

  it("rejects malformed JSON", () => {
    const result = validateDeckJson("{ not json ");
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/valid JSON/);
  });

  it("wraps a bare question array into a deck", () => {
    const result = validateDeckJson(
      JSON.stringify([{ type: "flashcard", question: "Q", answer: "A" }]),
    );
    expect(result.ok).toBe(true);
    expect(result.deck?.title).toBe("Imported Deck");
    expect(result.warnings.join(" ")).toMatch(/plain list of questions/i);
  });

  it("requires options and a matching answer for multiple-choice", () => {
    const result = validateDeckJson(
      JSON.stringify({
        title: "T",
        questions: [{ type: "multiple-choice", question: "Q", options: ["a"], answer: "z" }],
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/at least 2 answer options/);
  });

  it("requires 2+ items for ordering", () => {
    const result = validateDeckJson(
      JSON.stringify({
        title: "T",
        questions: [{ type: "ordering", question: "Q", items: ["only"] }],
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/ordering/);
  });

  it("flags a word-bank blank/placeholder mismatch", () => {
    const result = validateDeckJson(
      JSON.stringify({
        title: "T",
        questions: [{ type: "word-bank", question: "one ___ two ___", blanks: ["a"] }],
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/blank/);
  });

  it("always generates floor-of-one questions", () => {
    const result = validateDeckJson(JSON.stringify({ title: "Empty", questions: [] }));
    expect(result.ok).toBe(false);
  });
});

describe("validateQuestionsJson", () => {
  it("accepts the bundled question pack", () => {
    const result = validateQuestionsJson(SAMPLE_QUESTIONS_JSON);
    expect(result.ok).toBe(true);
    expect(result.questions).toHaveLength(2);
  });

  it("warns about questions already in the deck", () => {
    const existing = [
      {
        id: "x",
        type: "short-answer" as const,
        question: "What drives secondary active transport?",
        answer: "gradient",
        difficulty: "hard" as const,
      },
    ];
    const result = validateQuestionsJson(SAMPLE_QUESTIONS_JSON, existing);
    expect(result.ok).toBe(true);
    expect(result.warnings.join(" ")).toMatch(/duplicate/i);
  });
});
