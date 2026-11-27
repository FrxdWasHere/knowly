import { z } from "zod";
import type {
  Course,
  CourseAssessment,
  CourseBlock,
  Deck,
  LearningPath,
  Module,
  Question,
} from "@/lib/types";
import type { ExamOptions, ExamTheme } from "@/lib/exam-print";
import { shuffleArray } from "@/lib/answers";
import { validateQuestionsJson } from "@/lib/schema";

export const SHARE_RESOURCE_TYPES = [
  "deck",
  "module",
  "course",
  "practice_quiz",
  "print_exam",
] as const;

export type ShareResourceType = (typeof SHARE_RESOURCE_TYPES)[number];

const sharedQuestionSchema = z.object({
  id: z.string(),
  type: z.string(),
  question: z.string(),
  answer: z.string().optional(),
  options: z.array(z.string()).optional(),
  correctOptions: z.array(z.string()).optional(),
  items: z.array(z.string()).optional(),
  pairs: z.array(z.object({ left: z.string(), right: z.string() })).optional(),
  matchingLeft: z.array(z.string()).optional(),
  matchingRight: z.array(z.string()).optional(),
  blanks: z.array(z.string()).optional(),
  wordBank: z.array(z.string()).optional(),
  explanation: z.string().optional(),
  incorrectExplanation: z.string().optional(),
  tutor: z
    .object({
      simple: z.string().optional(),
      whyCorrect: z.string().optional(),
      mnemonic: z.string().optional(),
      example: z.string().optional(),
      whyWrong: z.array(z.object({ option: z.string(), why: z.string() })).optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  difficulty: z.string(),
  concept: z.string().optional(),
  hint: z.string().optional(),
});

const sharedBlockSchema = z.object({
  id: z.string(),
  type: z.string(),
  markdown: z.string().optional(),
  highlightedText: z
    .array(z.string().min(1))
    .optional()
    .describe("Exact visible phrases to highlight in the block's rendered text."),
  tone: z.string().optional(),
  title: z.string().optional(),
  url: z.string().optional(),
  alt: z.string().optional(),
  caption: z.string().optional(),
});

const sharedAssessmentSchema = z.object({
  title: z.string(),
  passingScore: z.number().optional(),
  questions: z.array(sharedQuestionSchema),
});

const sharedLessonSchema = z.object({
  title: z.string(),
  summary: z.string().optional(),
  objectives: z.array(z.string()),
  estimatedMinutes: z.number().optional(),
  blocks: z.array(sharedBlockSchema),
  questions: z.array(sharedQuestionSchema),
});

const sharedCourseModuleSchema = z.object({
  title: z.string(),
  summary: z.string().optional(),
  objectives: z.array(z.string()),
  lessons: z.array(sharedLessonSchema),
  quiz: sharedAssessmentSchema.optional(),
});

const sharedStageSchema = z.object({
  id: z.string().optional(),
  index: z.number().optional(),
  title: z.string(),
  description: z.string().optional(),
  purpose: z.enum([
    "concept-exposure",
    "comprehension",
    "active-recall",
    "application",
    "reinforcement",
    "integration",
    "retention",
    "mastery",
  ]),
  objectives: z.array(z.string()),
  concepts: z.array(z.string()),
  prerequisiteConcepts: z.array(z.string()).optional(),
  difficultyTarget: z.enum(["easy", "medium", "hard"]).optional(),
  estimatedMinutes: z.number().optional(),
  activities: z.array(
    z.object({
      id: z.string().optional(),
      title: z.string(),
      type: z.enum([
        "concept-introduction",
        "understanding-check",
        "active-recall",
        "application-exercises",
        "reinforcement-practice",
        "integration-challenge",
        "final-assessment",
        "review-session",
        "practice-quiz",
        "scenario-based",
        "problem-solving",
        "concept-mapping",
        "self-assessment",
        "mastery-check",
        "bonus-challenge",
        "error-analysis",
      ]),
      description: z.string().optional(),
      objective: z.string().optional(),
      estimatedMinutes: z.number().optional(),
      isReinforcement: z.boolean().optional(),
      questionIds: z.array(z.string()),
    }),
  ),
});

const sharedLearningPathSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  source: z.enum(["auto", "smart", "manual", "imported"]),
  lengthPreset: z.enum(["shorter", "short", "regular", "long", "longer"]).optional(),
  conceptsCovered: z.array(z.string()),
  estimatedMinutes: z.number(),
});

const shareSnapshotSchema = z.object({
  version: z.literal(1),
  resourceType: z.enum(SHARE_RESOURCE_TYPES),
  title: z.string().min(1),
  subject: z.string().optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  emoji: z.string().optional(),
  level: z.string().optional(),
  objectives: z.array(z.string()).optional(),
  estimatedMinutes: z.number().optional(),
  tags: z.array(z.string()).optional(),
  isSTEM: z.boolean().optional(),
  needsEquations: z.boolean().optional(),
  needsGraphs: z.boolean().optional(),
  theme: z.string().optional(),
  learningPath: sharedLearningPathSchema.optional(),
  stages: z.array(sharedStageSchema).optional(),
  blocks: z.array(sharedBlockSchema).optional(),
  modules: z.array(sharedCourseModuleSchema).optional(),
  questions: z.array(sharedQuestionSchema).optional(),
  finalExam: sharedAssessmentSchema.optional(),
  examDetails: z
    .object({
      instructions: z.string().optional(),
      includeAnswerKey: z.boolean(),
      showPoints: z.boolean(),
      pointsPerQuestion: z.number(),
      columns: z.union([z.literal(1), z.literal(2)]),
      spacing: z.enum(["compact", "roomy"]),
      answerLines: z.number(),
      theme: z.string().optional(),
    })
    .optional(),
});

export type SharedQuestion = z.infer<typeof sharedQuestionSchema>;
export type SharedBlock = z.infer<typeof sharedBlockSchema>;
export type ShareSnapshot = z.infer<typeof shareSnapshotSchema>;

export interface SharedResource {
  title: string;
  resourceType: ShareResourceType;
  payload: ShareSnapshot;
}

export type ViewerDeckCopyResult =
  | { ok: true; deck: Deck; skippedQuestionCount: number }
  | {
      ok: false;
      error: string;
    };

export function createViewerDeckCopy(
  resource: SharedResource,
  id: string,
  createdAt = Date.now(),
): ViewerDeckCopyResult {
  if (resource.resourceType !== "deck" || resource.payload.resourceType !== "deck") {
    return { ok: false, error: "Only shared decks can be added to your library." };
  }

  const sourceQuestions = resource.payload.questions ?? [];
  const validation = validateQuestionsJson(JSON.stringify(sourceQuestions));
  const validEntries: { source: SharedQuestion; copy: Question }[] = [];
  let firstValidationError = validation.errors[0];

  if (validation.ok && validation.questions) {
    sourceQuestions.forEach((source, index) => {
      const copy = validation.questions?.[index];
      if (copy) validEntries.push({ source, copy });
    });
  } else {
    sourceQuestions.forEach((source) => {
      const individualValidation = validateQuestionsJson(JSON.stringify([source]));
      const copy = individualValidation.questions?.[0];
      if (individualValidation.ok && copy) {
        validEntries.push({ source, copy });
      } else {
        firstValidationError ??= individualValidation.errors[0];
      }
    });
  }

  const validQuestions = validEntries.map(({ copy }) => copy);
  if (!validQuestions.length) {
    return {
      ok: false,
      error: firstValidationError ?? "The deck does not contain valid practice questions.",
    };
  }

  const questionIdMap = new Map(
    validEntries.map(({ source, copy }) => [source.id, copy.id] as const),
  );
  const learningPath: LearningPath | undefined =
    resource.payload.learningPath && resource.payload.stages?.length
      ? {
          ...resource.payload.learningPath,
          deckId: id,
          createdAt,
          updatedAt: createdAt,
          totalMasteryPct: 0,
          reinforcementQuestionIds: [],
          stages: resource.payload.stages.map((stage, stageIndex) => ({
            id: stage.id ?? `${id}-stage-${stageIndex + 1}`,
            index: stage.index ?? stageIndex,
            title: stage.title,
            description: stage.description,
            purpose: stage.purpose,
            objectives: [...stage.objectives],
            concepts: [...stage.concepts],
            prerequisiteConcepts: stage.prerequisiteConcepts,
            difficultyTarget: stage.difficultyTarget ?? "medium",
            estimatedMinutes:
              stage.estimatedMinutes ??
              stage.activities.reduce(
                (total, activity) => total + (activity.estimatedMinutes ?? 0),
                0,
              ),
            masteryPct: 0,
            progress: {
              status: "not-started",
              totalQuestionsAnswered: 0,
              correctAnswers: 0,
              questionsRequiringReinforcement: [],
            },
            activities: stage.activities.map((activity, activityIndex) => ({
              id: activity.id ?? `${id}-activity-${stageIndex + 1}-${activityIndex + 1}`,
              type: activity.type,
              title: activity.title,
              description: activity.description,
              objective: activity.objective,
              estimatedMinutes: activity.estimatedMinutes ?? 0,
              masteryPct: 0,
              completed: false,
              questions: activity.questionIds
                .flatMap((questionId) => {
                  const copiedQuestionId = questionIdMap.get(questionId);
                  return copiedQuestionId ? [copiedQuestionId] : [];
                })
                .map((questionId) => ({
                  questionId,
                  isReinforcement: activity.isReinforcement,
                  mastered: false,
                  attempts: 0,
                  correctAttempts: 0,
                })),
            })),
          })),
        }
      : undefined;

  return {
    ok: true,
    skippedQuestionCount: sourceQuestions.length - validEntries.length,
    deck: {
      id,
      title: resource.title,
      subject: resource.payload.subject ?? "General",
      description: resource.payload.description,
      color: resource.payload.color ?? "#5477e8",
      tags: [...new Set([...(resource.payload.tags ?? []), "shared"])],
      isSTEM: resource.payload.isSTEM,
      needsEquations: resource.payload.needsEquations,
      needsGraphs: resource.payload.needsGraphs,
      createdAt,
      favorite: false,
      questions: validQuestions,
      masteredIds: [],
      bookmarks: [],
      notes: {},
      learningPath,
    },
  };
}

function publicQuestion(question: Question, includeAnswer = true): SharedQuestion {
  const shared: SharedQuestion = {
    id: question.id,
    type: question.type,
    question: question.question,
    difficulty: question.difficulty,
  };
  if (question.concept) shared.concept = question.concept;
  if (question.tags?.length) shared.tags = [...question.tags];
  if (question.options) shared.options = [...question.options];
  if (question.items)
    shared.items = includeAnswer ? [...question.items] : shuffleArray(question.items);
  if (question.pairs) {
    if (includeAnswer) {
      shared.pairs = question.pairs.map((pair) => ({ ...pair }));
    } else {
      shared.matchingLeft = question.pairs.map((pair) => pair.left);
      shared.matchingRight = shuffleArray(question.pairs.map((pair) => pair.right));
    }
  }
  if (question.wordBank) shared.wordBank = [...question.wordBank];
  if (includeAnswer) {
    shared.answer = question.answer;
    if (question.correctOptions) shared.correctOptions = [...question.correctOptions];
    if (question.blanks) shared.blanks = [...question.blanks];
    if (question.explanation) shared.explanation = question.explanation;
    if (question.hint) shared.hint = question.hint;
    if (question.incorrectExplanation) shared.incorrectExplanation = question.incorrectExplanation;
    if (question.tutor) shared.tutor = structuredClone(question.tutor);
  }
  return shared;
}

function safeImageUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}

function publicBlock(block: CourseBlock): SharedBlock {
  const shared: SharedBlock = { id: block.id, type: block.type };
  if (block.title) shared.title = block.title;
  if (block.type !== "activity" && block.markdown) shared.markdown = block.markdown;
  if (block.highlightedText?.length) shared.highlightedText = [...block.highlightedText];
  if (block.type === "callout" && block.tone) shared.tone = block.tone;
  if (block.type === "image") {
    const url = safeImageUrl(block.url);
    if (url) shared.url = url;
    if (block.alt) shared.alt = block.alt;
    if (block.caption) shared.caption = block.caption;
  }
  return shared;
}

function publicAssessment(assessment: CourseAssessment) {
  return {
    title: assessment.title,
    passingScore: assessment.passingScore,
    questions: assessment.questions.map((question) => publicQuestion(question)),
  };
}

export function buildDeckShareSnapshot(deck: Deck, theme?: ExamTheme): ShareSnapshot {
  const learningPath = deck.learningPath;
  return {
    version: 1,
    resourceType: "deck",
    title: deck.title,
    subject: deck.subject,
    description: deck.description,
    color: deck.color,
    tags: [...deck.tags],
    isSTEM: deck.isSTEM,
    needsEquations: deck.needsEquations,
    needsGraphs: deck.needsGraphs,
    theme,
    learningPath: learningPath
      ? {
          id: learningPath.id,
          title: learningPath.title,
          description: learningPath.description,
          source: learningPath.source,
          lengthPreset: learningPath.lengthPreset,
          conceptsCovered: [...learningPath.conceptsCovered],
          estimatedMinutes: learningPath.estimatedMinutes,
        }
      : undefined,
    stages: learningPath?.stages.map((stage) => ({
      id: stage.id,
      index: stage.index,
      title: stage.title,
      description: stage.description,
      purpose: stage.purpose,
      objectives: [...stage.objectives],
      concepts: [...stage.concepts],
      prerequisiteConcepts: stage.prerequisiteConcepts,
      difficultyTarget: stage.difficultyTarget,
      estimatedMinutes: stage.estimatedMinutes,
      activities: stage.activities.map((activity) => ({
        id: activity.id,
        title: activity.title,
        type: activity.type,
        description: activity.description,
        objective: activity.objective,
        estimatedMinutes: activity.estimatedMinutes,
        isReinforcement: activity.questions.some((question) => question.isReinforcement),
        questionIds: activity.questions.map((question) => question.questionId),
      })),
    })),
    questions: deck.questions.map((question) => publicQuestion(question)),
  };
}

export function buildModuleShareSnapshot(module: Module, theme?: ExamTheme): ShareSnapshot {
  return {
    version: 1,
    resourceType: "module",
    title: module.title,
    subject: module.subject,
    description: module.objectives.join("\n"),
    theme,
    blocks: module.blocks.map(publicBlock),
    questions: module.questions.map((question) => publicQuestion(question)),
  };
}

export function buildCourseShareSnapshot(course: Course, theme?: ExamTheme): ShareSnapshot {
  return {
    version: 1,
    resourceType: "course",
    title: course.title,
    subject: course.subject,
    description: course.description,
    color: course.color,
    emoji: course.emoji,
    level: course.level,
    objectives: [...course.objectives],
    estimatedMinutes: course.estimatedMinutes,
    tags: [...course.tags],
    theme,
    modules: course.modules.map((courseModule) => ({
      title: courseModule.title,
      summary: courseModule.summary,
      objectives: [...courseModule.objectives],
      lessons: courseModule.lessons.map((lesson) => ({
        title: lesson.title,
        summary: lesson.summary,
        objectives: [...lesson.objectives],
        estimatedMinutes: lesson.estimatedMinutes,
        blocks: lesson.blocks.map(publicBlock),
        questions: lesson.questions.map((question) => publicQuestion(question)),
      })),
      quiz: courseModule.quiz ? publicAssessment(courseModule.quiz) : undefined,
    })),
    finalExam: course.finalExam ? publicAssessment(course.finalExam) : undefined,
  };
}

export function buildPracticeQuizShareSnapshot(
  title: string,
  subject: string,
  questions: Question[],
): ShareSnapshot {
  return {
    version: 1,
    resourceType: "practice_quiz",
    title,
    subject,
    questions: questions.map((question) => publicQuestion(question)),
  };
}

export function buildPrintExamShareSnapshot(
  title: string,
  subject: string,
  questions: Question[],
  options: ExamOptions,
): ShareSnapshot {
  const includeAnswerKey = options.includeAnswerKey;
  return {
    version: 1,
    resourceType: "print_exam",
    title: options.title || title,
    subject,
    theme: options.theme,
    questions: questions.map((question) => publicQuestion(question, includeAnswerKey)),
    examDetails: {
      instructions: options.showInstructions ? options.instructions : undefined,
      includeAnswerKey,
      showPoints: options.showPoints,
      pointsPerQuestion: options.pointsPerQuestion,
      columns: options.columns,
      spacing: options.spacing,
      answerLines: options.answerLines,
      theme: options.theme,
    },
  };
}

export function parseShareSnapshot(value: unknown): ShareSnapshot | null {
  const result = shareSnapshotSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function normalizeInviteEmails(values: readonly string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim().toLowerCase()).filter((value) => value.length > 0)),
  );
}

export function isValidInviteEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
