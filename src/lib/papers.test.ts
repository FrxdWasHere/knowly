import { describe, expect, it } from "vitest";
import { averagePercentage, bestSitting, lastSitting } from "./papers";
import type { PaperRecord, PaperSitting } from "./papers";
import type { Question } from "./types";

const sitting = (over: Partial<PaperSitting>): PaperSitting => ({
  id: "s",
  takenAt: 0,
  score: 0,
  total: 20,
  percentage: 0,
  ...over,
});

const paper = (over: Partial<PaperRecord>, sittings: PaperSitting[] = []): PaperRecord => ({
  id: "p",
  title: "Paper",
  createdAt: 0,
  options: {
    title: "Paper",
    subject: "",
    date: "",
    studentName: "",
    studentClass: "",
    instructions: "",
    showNameLines: false,
    showInstructions: false,
    showPoints: false,
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
  },
  questions: [] as Question[],
  sittings,
  ...over,
});

describe("paper helpers", () => {
  it("picks the best sitting by percentage", () => {
    const record = paper({}, [
      sitting({ id: "a", percentage: 50 }),
      sitting({ id: "b", percentage: 85 }),
      sitting({ id: "c", percentage: 60 }),
    ]);
    expect(bestSitting(record)?.id).toBe("b");
  });

  it("returns undefined when nothing was sat", () => {
    expect(bestSitting(paper({}))).toBeUndefined();
    expect(lastSitting(paper({}))).toBeUndefined();
  });

  it("picks the most recent sitting", () => {
    const record = paper({}, [
      sitting({ id: "a", takenAt: 100 }),
      sitting({ id: "b", takenAt: 300 }),
      sitting({ id: "c", takenAt: 200 }),
    ]);
    expect(lastSitting(record)?.id).toBe("b");
  });

  it("averages every sitting across papers", () => {
    const papers = [
      paper({}, [sitting({ percentage: 60 }), sitting({ percentage: 80 })]),
      paper({ id: "p2" }, [sitting({ percentage: 80 })]),
    ];
    expect(averagePercentage(papers)).toBe(73);
    expect(averagePercentage([paper({})])).toBeNull();
  });
});
