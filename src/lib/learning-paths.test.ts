import { describe, expect, it } from "vitest";
import type { Deck, Question } from "./types";
import { applyLearningPathAnswer, buildLearningPath, isStageUnlocked } from "./learning-paths";

function makeDeck(): Deck {
  const questions: Question[] = [
    {
      id: "q1",
      type: "flashcard",
      question: "Cell structure",
      answer: "A cell has a membrane.",
      difficulty: "easy",
      concept: "Cell structure",
    },
    {
      id: "q2",
      type: "flashcard",
      question: "Cell function",
      answer: "Cells carry out life processes.",
      difficulty: "medium",
      concept: "Cell structure",
    },
    {
      id: "q3",
      type: "flashcard",
      question: "Tissue structure",
      answer: "A tissue is a group of similar cells.",
      difficulty: "easy",
      concept: "Tissues",
    },
    {
      id: "q4",
      type: "flashcard",
      question: "Tissue function",
      answer: "Tissues perform a shared role.",
      difficulty: "medium",
      concept: "Tissues",
    },
  ];

  return {
    id: "deck",
    title: "Cells",
    subject: "Biology",
    color: "#000",
    tags: [],
    createdAt: 1,
    favorite: false,
    questions,
    masteredIds: [],
    bookmarks: [],
    notes: {},
  };
}

describe("Learning Path progression", () => {
  it("does not unlock the next stage after a single attempt", () => {
    const path = buildLearningPath(makeDeck(), { stageCount: 2 });
    const firstStage = path.stages[0];
    const firstActivity = firstStage.activities[0];
    const firstQuestionId = firstActivity.questions[0].questionId;

    const afterOneCorrectAnswer = applyLearningPathAnswer(path, firstQuestionId, true, {
      stageId: firstStage.id,
      activityId: firstActivity.id,
    });

    expect(isStageUnlocked(afterOneCorrectAnswer, path.stages[1].id)).toBe(false);
  });

  it("schedules missed questions for later reinforcement and clears them after recall", () => {
    const path = buildLearningPath(makeDeck(), { stageCount: 2 });
    const firstStage = path.stages[0];
    const firstActivity = firstStage.activities[0];
    const missedQuestionId = firstActivity.questions[0].questionId;

    const afterMiss = applyLearningPathAnswer(path, missedQuestionId, false, {
      stageId: firstStage.id,
      activityId: firstActivity.id,
    });
    const reinforcementStage = afterMiss.stages.find((stage) =>
      stage.activities.some(
        (activity) =>
          activity.type === "reinforcement-practice" &&
          activity.questions.some((reference) => reference.questionId === missedQuestionId),
      ),
    );
    const reinforcementActivity = reinforcementStage?.activities.find(
      (activity) =>
        activity.type === "reinforcement-practice" &&
        activity.questions.some((reference) => reference.questionId === missedQuestionId),
    );

    expect(afterMiss.reinforcementQuestionIds).toContain(missedQuestionId);
    expect(
      reinforcementActivity?.questions.find((ref) => ref.questionId === missedQuestionId)
        ?.isReinforcement,
    ).toBe(true);
    expect(reinforcementStage).toBeDefined();

    const afterRecall = applyLearningPathAnswer(afterMiss, missedQuestionId, true, {
      stageId: reinforcementStage!.id,
      activityId: reinforcementActivity!.id,
    });

    expect(afterRecall.reinforcementQuestionIds).not.toContain(missedQuestionId);
    expect(
      afterRecall.stages.every(
        (stage) => !stage.progress.questionsRequiringReinforcement.includes(missedQuestionId),
      ),
    ).toBe(true);
  });
});
