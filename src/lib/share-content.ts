import { z } from "zod";
import type { Course, CourseAssessment, CourseBlock, Deck, Module, Question } from "@/lib/types";
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
  items: z.array(z.string()).optional(),
  pairs: z.array(z.object({ left: z.string(), right: z.string() })).optional(),
  matchingLeft: z.array(z.string()).optional(),
  matchingRight: z.array(z.string()).optional(),
  blanks: z.array(z.string()).optional(),
  wordBank: z.array(z.string()).optional(),
  explanation: z.string().optional(),
  difficulty: z.string(),
  concept: z.string().optional(),
  hint: z.string().optional(),
});

const sharedBlockSchema = z.object({
  id: z.string(),
  type: z.string(),
  markdown: z.string().optional(),
  highlightedText: z.array(z.string()).optional(),
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
  title: z.string(),
  description: z.string().optional(),
  purpose: z.string(),
  objectives: z.array(z.string()),
  concepts: z.array(z.string()),
  activities: z.array(
    z.object({
      title: z.string(),
      type: z.string(),
      description: z.string().optional(),
      objective: z.string().optional(),
      questionIds: z.array(z.string()),
    }),
  ),
});

const shareSnapshotSchema = z.object({
  version: z.literal(1),
  resourceType: z.enum(SHARE_RESOURCE_TYPES),
  title: z.string().min(1),
  subject: z.string().optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  theme: z.string().optional(),
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

export type ViewerDeckCopyResult = { ok: true; deck: Deck } | { ok: false; error: string };

export function createViewerDeckCopy(
  resource: SharedResource,
  id: string,
  createdAt = Date.now(),
): ViewerDeckCopyResult {
  if (resource.resourceType !== "deck" || resource.payload.resourceType !== "deck") {
    return { ok: false, error: "Only shared decks can be added to your library." };
  }

  const validation = validateQuestionsJson(JSON.stringify(resource.payload.questions ?? []));
  if (!validation.ok || !validation.questions?.length) {
    return {
      ok: false,
      error: validation.errors[0] ?? "The deck does not contain valid practice questions.",
    };
  }

  return {
    ok: true,
    deck: {
      id,
      title: resource.title,
      subject: resource.payload.subject ?? "General",
      description: resource.payload.description,
      color: resource.payload.color ?? "#5477e8",
      tags: ["shared"],
      createdAt,
      favorite: false,
      questions: validation.questions,
      masteredIds: [],
      bookmarks: [],
      notes: {},
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
    if (question.blanks) shared.blanks = [...question.blanks];
    if (question.explanation) shared.explanation = question.explanation;
    if (question.hint) shared.hint = question.hint;
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
    theme,
    stages: learningPath?.stages.map((stage) => ({
      title: stage.title,
      description: stage.description,
      purpose: stage.purpose,
      objectives: [...stage.objectives],
      concepts: [...stage.concepts],
      activities: stage.activities.map((activity) => ({
        title: activity.title,
        type: activity.type,
        description: activity.description,
        objective: activity.objective,
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
