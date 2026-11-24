import { describe, expect, it } from "vitest";
import { defaultExamOptions } from "./exam-print";
import {
  createViewerDeckCopy,
  buildCourseShareSnapshot,
  buildDeckShareSnapshot,
  buildModuleShareSnapshot,
  buildPrintExamShareSnapshot,
  normalizeInviteEmails,
  parseShareSnapshot,
} from "./share-content";
import type { Course, Deck, Module, Question } from "./types";

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

  it("preserves AI-selected passages when sharing Modules and Courses", () => {
    const block = {
      id: "block-1",
      type: "markdown" as const,
      markdown: "A cell membrane controls what enters and leaves the cell.",
      highlightedText: ["controls what enters and leaves the cell"],
    };
    const module: Module = {
      id: "module-1",
      title: "Cell membranes",
      subject: "Biology",
      color: "#3158a7",
      emoji: "📘",
      tags: [],
      isSTEM: false,
      needsEquations: false,
      needsGraphs: false,
      objectives: [],
      blocks: [block],
      questions: [],
      linkedDeckIds: [],
      estimatedMinutes: 10,
      difficulty: 1,
      createdAt: 1,
      updatedAt: 1,
    };
    const course: Course = {
      id: "course-1",
      title: "Cell biology",
      subject: "Biology",
      color: "#3158a7",
      tags: [],
      objectives: [],
      sources: [],
      modules: [
        {
          id: "unit-1",
          title: "Membranes",
          objectives: [],
          lessons: [
            {
              id: "lesson-1",
              title: "Cell membranes",
              objectives: [],
              blocks: [block],
              questions: [],
              linkedDeckIds: [],
            },
          ],
          linkedDeckIds: [],
        },
      ],
      linkedDeckIds: [],
      createdAt: 1,
      updatedAt: 1,
    };

    expect(
      parseShareSnapshot(buildModuleShareSnapshot(module))?.blocks?.[0]?.highlightedText,
    ).toEqual(block.highlightedText);
    expect(
      parseShareSnapshot(buildCourseShareSnapshot(course))?.modules?.[0]?.lessons[0]?.blocks[0]
        ?.highlightedText,
    ).toEqual(block.highlightedText);
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
