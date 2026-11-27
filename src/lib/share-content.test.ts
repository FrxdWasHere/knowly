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
import { buildLearningPath } from "./learning-paths";
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
  it("preserves deck tags and learning aids in its share preview and local copy", () => {
    const question: Question = {
      ...matchingQuestion,
      tags: ["cell biology"],
      incorrectExplanation: "Water moves toward the higher solute concentration.",
      tutor: {
        simple: "Water follows the dissolved particles.",
        mnemonic: "Water follows solute.",
      },
    };
    const baseDeck: Deck = {
      id: "deck-with-learning-aids",
      title: "Osmosis",
      subject: "Biology",
      color: "#3158a7",
      tags: ["cells"],
      isSTEM: true,
      needsEquations: true,
      createdAt: 1,
      favorite: false,
      questions: [question],
      masteredIds: [],
      bookmarks: [],
      notes: {},
    };
    const deck: Deck = {
      ...baseDeck,
      learningPath: buildLearningPath(baseDeck, {
        source: "manual",
        title: "Osmosis pathway",
      }),
    };

    const snapshot = buildDeckShareSnapshot(deck);
    const copy = createViewerDeckCopy(
      { title: deck.title, resourceType: "deck", payload: snapshot },
      "shared-copy",
      123,
    );

    expect(snapshot.tags).toEqual(["cells"]);
    expect(snapshot.isSTEM).toBe(true);
    expect(snapshot.needsEquations).toBe(true);
    expect(snapshot.questions?.[0]?.tutor?.mnemonic).toBe("Water follows solute.");
    expect(snapshot.learningPath?.title).toBe("Osmosis pathway");
    expect(copy.ok).toBe(true);
    if (!copy.ok) return;
    expect(copy.deck.tags).toEqual(["cells", "shared"]);
    expect(copy.deck.isSTEM).toBe(true);
    expect(copy.deck.needsEquations).toBe(true);
    expect(copy.deck.learningPath?.title).toBe("Osmosis pathway");
    expect(copy.deck.learningPath?.stages[0]?.progress.status).toBe("not-started");
    const originalQuestionIds = new Set(deck.questions.map((q) => q.id));
    const copiedReferences =
      copy.deck.learningPath?.stages.flatMap((stage) =>
        stage.activities.flatMap((activity) => activity.questions),
      ) ?? [];
    expect(copiedReferences.length).toBeGreaterThan(0);
    expect(
      copiedReferences.every((reference) => !originalQuestionIds.has(reference.questionId)),
    ).toBe(true);
    expect(copy.deck.questions[0]?.incorrectExplanation).toBe(
      "Water moves toward the higher solute concentration.",
    );
    expect(copy.deck.questions[0]?.tutor?.simple).toBe("Water follows the dissolved particles.");
  });

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
      description: "Explore how cells work.",
      level: "Introductory",
      color: "#3158a7",
      emoji: "🧬",
      tags: ["cells"],
      objectives: ["Explain how cell membranes work."],
      estimatedMinutes: 45,
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

    const sharedCourse = parseShareSnapshot(buildCourseShareSnapshot(course));
    expect(sharedCourse).toMatchObject({
      color: course.color,
      emoji: course.emoji,
      level: course.level,
      objectives: course.objectives,
      estimatedMinutes: course.estimatedMinutes,
      tags: course.tags,
    });
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

  it("keeps valid questions when a shared deck contains a malformed word-bank question", () => {
    const malformedQuestion: Question = {
      id: "word-bank-1",
      type: "word-bank",
      question: "___ ___ ___ ___ ___ ___ ___ ___",
      answer: "cell | wall | membrane | nucleus",
      blanks: ["cell", "wall", "membrane", "nucleus"],
      difficulty: "medium",
    };
    const deck: Deck = {
      id: "deck-with-malformed-question",
      title: "Biology",
      subject: "Biology",
      color: "#3158a7",
      tags: [],
      createdAt: 1,
      favorite: false,
      questions: [matchingQuestion, malformedQuestion],
      masteredIds: [],
      bookmarks: [],
      notes: {},
    };
    const result = createViewerDeckCopy(
      {
        title: deck.title,
        resourceType: "deck",
        payload: buildDeckShareSnapshot(deck),
      },
      "shared-copy",
      123,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.skippedQuestionCount).toBe(1);
    expect(result.deck.questions).toHaveLength(1);
    expect(result.deck.questions[0]?.type).toBe("matching");
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

  it("shares multiple-select keys only when the answer key is included", () => {
    const question: Question = {
      id: "multi-select-1",
      type: "multiple-select",
      question: "Select the membrane-bound organelles.",
      answer: '["Nucleus","Mitochondrion"]',
      options: ["Nucleus", "Mitochondrion", "Ribosome"],
      correctOptions: ["Nucleus", "Mitochondrion"],
      difficulty: "medium",
    };
    const hidden = buildPrintExamShareSnapshot("Biology Exam", "Biology", [question], {
      ...defaultExamOptions("Biology Exam", "Biology"),
      includeAnswerKey: false,
    });
    const included = buildPrintExamShareSnapshot(
      "Biology Exam",
      "Biology",
      [question],
      defaultExamOptions("Biology Exam", "Biology"),
    );

    expect(hidden.questions?.[0]).not.toHaveProperty("answer");
    expect(hidden.questions?.[0]).not.toHaveProperty("correctOptions");
    expect(included.questions?.[0]?.correctOptions).toEqual(question.correctOptions);
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
