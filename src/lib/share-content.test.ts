import { describe, expect, it } from "vitest";
import { defaultExamOptions } from "./exam-print";
import {
  buildPrintExamShareSnapshot,
  normalizeInviteEmails,
  parseShareSnapshot,
} from "./share-content";
import type { Question } from "./types";

const matchingQuestion: Question = {
  id: "matching-1",
  type: "matching",
  question: "Match each term with its meaning.",
  answer: "Photosynthesis — the process plants use to make food.",
  difficulty: "medium",
  pairs: [
    { left: "Photosynthesis", right: "The process plants use to make food." },
    { left: "Respiration", right: "The process that releases energy from food." },
  ],
};

describe("share content", () => {
  it("omits exam answers and student details when the answer key is disabled", () => {
    const options = {
      ...defaultExamOptions("Biology Exam", "Biology"),
      includeAnswerKey: false,
      studentName: "Private Student",
      studentClass: "Private Class",
    };

    const snapshot = buildPrintExamShareSnapshot(
      "Fallback title",
      "Fallback subject",
      [matchingQuestion],
      options,
    );
    const sharedQuestion = snapshot.questions?.[0];

    expect(snapshot.title).toBe("Biology Exam");
    expect(snapshot).not.toHaveProperty("studentName");
    expect(snapshot).not.toHaveProperty("studentClass");
    expect(sharedQuestion).not.toHaveProperty("answer");
    expect(sharedQuestion).not.toHaveProperty("pairs");
    expect(sharedQuestion?.matchingLeft).toEqual(["Photosynthesis", "Respiration"]);
    expect(sharedQuestion?.matchingRight?.slice().sort()).toEqual(
      matchingQuestion.pairs?.map((pair) => pair.right).sort(),
    );
  });

  it("keeps answer mappings when an answer key is requested", () => {
    const snapshot = buildPrintExamShareSnapshot(
      "Biology Exam",
      "Biology",
      [matchingQuestion],
      defaultExamOptions("Biology Exam", "Biology"),
    );

    expect(snapshot.questions?.[0]?.pairs).toEqual(matchingQuestion.pairs);
    expect(snapshot.questions?.[0]?.answer).toBe(matchingQuestion.answer);
  });

  it("validates shared snapshots and normalizes invited addresses", () => {
    const snapshot = buildPrintExamShareSnapshot(
      "Biology Exam",
      "Biology",
      [matchingQuestion],
      defaultExamOptions("Biology Exam", "Biology"),
    );

    expect(parseShareSnapshot(snapshot)).not.toBeNull();
    expect(parseShareSnapshot({ version: 1, resourceType: "unknown" })).toBeNull();
    expect(normalizeInviteEmails([" Student@Example.com ", "student@example.com", " "])).toEqual([
      "student@example.com",
    ]);
  });
});
