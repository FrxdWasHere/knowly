import { describe, expect, it } from "vitest";
import { defaultExamOptions } from "./exam-print";
import {
  createViewerDeckCopy,
  buildDeckShareSnapshot,
  buildPrintExamShareSnapshot,
  normalizeInviteEmails,
  parseShareSnapshot,
} from "./share-content";
import type { Deck, Question } from "./types";

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
  it("preserves a deck's color in its validated share snapshot", () => {
    const deck: Deck = {
      id: "deck-1",
      title: "Biology",
      subject: "Biology",
      color: "#3158a7",
      tags: [],
      createdAt: 1,
      favorite: false,
      questions: [matchingQuestion],
      masteredIds: [],
      bookmarks: [],
      notes: {},
    };

    const snapshot = buildDeckShareSnapshot(deck);

    expect(snapshot.color).toBe("#3158a7");
    expect(parseShareSnapshot(snapshot)?.color).toBe("#3158a7");
  });

  it("creates an isolated local practice copy without carrying learner progress", () => {
    const deck: Deck = {
      id: "deck-1",
      title: "Biology",
      subject: "Biology",
      color: "#3158a7",
      tags: [],
      createdAt: 1,
      favorite: false,
      questions: [matchingQuestion],
      masteredIds: [matchingQuestion.id],
      bookmarks: [matchingQuestion.id],
      notes: { [matchingQuestion.id]: "Private note" },
    };
    const resource = {
      title: deck.title,
      resourceType: "deck" as const,
      payload: buildDeckShareSnapshot(deck),
    };
    const result = createViewerDeckCopy(resource, "shared-copy", 123);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.deck.id).toBe("shared-copy");
    expect(result.deck.questions[0]?.id).not.toBe(matchingQuestion.id);
    expect(result.deck.color).toBe(deck.color);
    expect(result.deck.createdAt).toBe(123);
    expect(result.deck.masteredIds).toEqual([]);
    expect(result.deck.bookmarks).toEqual([]);
    expect(result.deck.notes).toEqual({});
  });

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
