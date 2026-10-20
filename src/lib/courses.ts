import type {
  Course,
  CourseLesson,
  CourseLessonProgress,
  CourseModule,
  CourseProgress,
  Deck,
  Question,
} from "./types";

export interface LessonStats {
  total: number;
  answered: number;
  correct: number;
  percent: number;
  due: number;
}

export interface CourseStats {
  lessons: number;
  completedLessons: number;
  questions: number;
  answered: number;
  percent: number;
  due: number;
  assessments: number;
  passedAssessments: number;
  lastStudiedAt: number | null;
}

export function findLesson(
  course: Course,
  lessonId: string,
): { module: CourseModule; lesson: CourseLesson } | null {
  for (const module of course.modules) {
    const lesson = module.lessons.find((item) => item.id === lessonId);
    if (lesson) return { module, lesson };
  }
  return null;
}

export function allLessons(course: Course): { module: CourseModule; lesson: CourseLesson }[] {
  return course.modules.flatMap((module) => module.lessons.map((lesson) => ({ module, lesson })));
}

export function allCourseQuestions(course: Course): Question[] {
  const questions = allLessons(course).flatMap(({ lesson }) => lesson.questions);
  for (const module of course.modules) {
    if (module.quiz) questions.push(...module.quiz.questions);
  }
  if (course.finalExam) questions.push(...course.finalExam.questions);
  return questions;
}

export function lessonProgress(
  progress: CourseProgress | undefined,
  lessonId: string,
): CourseLessonProgress {
  return (
    progress?.lessons[lessonId] ?? {
      status: "not-started",
      srs: {},
      bookmarks: [],
    }
  );
}

export function lessonStats(
  progress: CourseProgress | undefined,
  lesson: CourseLesson,
): LessonStats {
  const state = lessonProgress(progress, lesson.id);
  let answered = 0;
  let correct = 0;
  let due = 0;
  const now = Date.now();
  for (const question of lesson.questions) {
    const stats = progress?.questionStats[question.id];
    if (stats) {
      answered += stats.attempts;
      correct += stats.correct;
    }
    const card = state.srs[question.id];
    if (!card || card.due <= now) due += 1;
  }
  return {
    total: lesson.questions.length,
    answered,
    correct,
    percent: answered ? Math.round((correct / answered) * 100) : 0,
    due,
  };
}

export function courseStats(course: Course, progress: CourseProgress | undefined): CourseStats {
  const entries = allLessons(course);
  let completedLessons = 0;
  let questions = 0;
  let answered = 0;
  let due = 0;
  let assessments = 0;
  let passedAssessments = 0;
  let lastStudiedAt = progress?.lastStudiedAt ?? null;

  for (const { lesson } of entries) {
    const state = lessonProgress(progress, lesson.id);
    if (state.status === "completed") completedLessons += 1;
    if (state.openedAt) lastStudiedAt = Math.max(lastStudiedAt ?? 0, state.openedAt);
    const stats = lessonStats(progress, lesson);
    questions += stats.total;
    answered += stats.answered;
    due += stats.due;
  }

  const assessmentList = [
    ...course.modules.flatMap((module) => (module.quiz ? [module.quiz] : [])),
    ...(course.finalExam ? [course.finalExam] : []),
  ];
  for (const assessment of assessmentList) {
    assessments += 1;
    const attempts = progress?.assessments[assessment.id] ?? [];
    if (attempts.some((attempt) => attempt.passed)) passedAssessments += 1;
  }

  const totalQuestions = questions || 0;
  return {
    lessons: entries.length,
    completedLessons,
    questions: totalQuestions,
    answered,
    percent: totalQuestions
      ? Math.round((completedLessons / Math.max(entries.length, 1)) * 100)
      : 0,
    due,
    assessments,
    passedAssessments,
    lastStudiedAt,
  };
}

export function nextLesson(
  course: Course,
  progress: CourseProgress | undefined,
): { module: CourseModule; lesson: CourseLesson } | null {
  for (const entry of allLessons(course)) {
    if (lessonProgress(progress, entry.lesson.id).status !== "completed") return entry;
  }
  return null;
}

export function courseQuestionCount(course: Course): number {
  return allCourseQuestions(course).length;
}

export function linkedDeckIdsForCourse(course: Course): string[] {
  return Array.from(
    new Set([
      ...course.linkedDeckIds,
      ...course.modules.flatMap((module) => module.linkedDeckIds),
      ...course.modules.flatMap((module) =>
        module.lessons.flatMap((lesson) => lesson.linkedDeckIds),
      ),
    ]),
  );
}

export function decksForCourse(course: Course, decks: Deck[]): Deck[] {
  const ids = new Set(linkedDeckIdsForCourse(course));
  return decks.filter((deck) => ids.has(deck.id));
}

/** Copies a lesson's checkpoint questions into a normal deck. */
export function lessonDeckQuestions(lesson: CourseLesson): Question[] {
  return lesson.questions.map((question) => ({
    ...question,
    id: `${question.id}-deck-copy`,
  }));
}
