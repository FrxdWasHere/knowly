import { describe, expect, it } from "vitest";
import { generateBulkPapers, getRequiredPoolSize, type BulkExamConfig } from "./exam-bulk";
import {
  ALL_DIFFICULTIES,
  ALL_TYPES,
  defaultExamOptions,
  type SelectionFilters,
} from "./exam-print";
import type { Question } from "./types";

const question = (id: string, over: Partial<Question> = {}): Question => ({
  id,
  type: "multiple-choice",
  question: `Question ${id}`,
  answer: "A",
  options: ["A", "B"],
  difficulty: "easy",
  ...over,
});

const filters: SelectionFilters = {
  types: ALL_TYPES,
  difficulties: ALL_DIFFICULTIES,
  count: 10,
  shuffle: false,
};

const baseOptions = defaultExamOptions("Biology", "Science");
const pool = Array.from({ length: 20 }, (_, i) => question(`q${i}`));

const config = (over: Partial<BulkExamConfig> = {}): BulkExamConfig => ({
  numberOfPapers: 3,
  distributionStrategy: "same-for-all",
  questionsPerPaper: 5,
  autoNumbering: true,
  namingPrefix: "Biology",
  ...over,
});

describe("generateBulkPapers", () => {
  it("reuses one identical set for every paper with same-for-all", () => {
    const papers = generateBulkPapers(pool, filters, baseOptions, config());
    const ids = papers.map((paper) => paper.questions.map((q) => q.id));

    expect(papers).toHaveLength(3);
    expect(ids[0]).toHaveLength(5);
    expect(ids[1]).toEqual(ids[0]);
    expect(ids[2]).toEqual(ids[0]);
  });

  it("gives each random paper different questions", () => {
    const papers = generateBulkPapers(
      pool,
      filters,
      baseOptions,
      config({ distributionStrategy: "random-per-paper" }),
    );
    const ids = papers.flatMap((paper) => paper.questions.map((q) => q.id));

    expect(ids).toHaveLength(15);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("reads sequential papers in deck order without overlap", () => {
    const papers = generateBulkPapers(
      pool,
      filters,
      baseOptions,
      config({ distributionStrategy: "sequential" }),
    );

    expect(papers[0]!.questions.map((q) => q.id)).toEqual(["q0", "q1", "q2", "q3", "q4"]);
    expect(papers[1]!.questions.map((q) => q.id)).toEqual(["q5", "q6", "q7", "q8", "q9"]);
  });

  it("honours per-paper counts for custom-per-paper", () => {
    const papers = generateBulkPapers(
      pool,
      filters,
      baseOptions,
      config({ distributionStrategy: "custom-per-paper", questionsPerPaper: [2, 4, 1] }),
    );

    expect(papers.map((paper) => paper.questions.length)).toEqual([2, 4, 1]);
  });

  it("numbers titles and keeps the naming prefix", () => {
    const papers = generateBulkPapers(pool, filters, baseOptions, config());

    expect(papers[0]!.title).toBe("Biology — Paper 1");
    expect(papers[2]!.title).toBe("Biology — Paper 3");
    expect(papers[0]!.options.title).toBe("Biology — Paper 1");
  });

  it("keeps the base title when auto numbering is off", () => {
    const papers = generateBulkPapers(pool, filters, baseOptions, config({ autoNumbering: false }));
    expect(papers[0]!.title).toBe("Biology");
  });

  it("only draws questions that pass the type and difficulty filters", () => {
    const mixed = [
      ...pool,
      question("hard", { difficulty: "hard" }),
      question("flash", { type: "flashcard" }),
    ];
    const easyOnly: SelectionFilters = { ...filters, difficulties: ["easy"] };
    const papers = generateBulkPapers(mixed, easyOnly, baseOptions, config({ numberOfPapers: 1 }));

    expect(papers[0]!.questions.every((q) => q.difficulty === "easy")).toBe(true);
  });
});

describe("getRequiredPoolSize", () => {
  it("only needs one shared set for same-for-all", () => {
    expect(getRequiredPoolSize(config())).toBe(5);
  });

  it("needs a distinct question for every slot in the other strategies", () => {
    expect(getRequiredPoolSize(config({ distributionStrategy: "random-per-paper" }))).toBe(15);
    expect(
      getRequiredPoolSize(
        config({ distributionStrategy: "custom-per-paper", questionsPerPaper: [2, 4, 1] }),
      ),
    ).toBe(7);
  });
});
