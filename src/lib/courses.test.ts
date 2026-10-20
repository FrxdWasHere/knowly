import { describe, expect, it } from "vitest";
import { SAMPLE_COURSE_JSON, validateCourseJson } from "./course-schema";
import {
  allCourseQuestions,
  allLessons,
  courseStats,
  findLesson,
  lessonProgress,
  linkedDeckIdsForCourse,
  nextLesson,
} from "./courses";
import type { Course, CourseLesson, Deck, Question } from "./types";

const question = (id: string): Question => ({
  id,
  type: "flashcard",
  question: `Question ${id}`,
  answer: "Answer",
  difficulty: "easy",
});

const lesson = (id: string, questions: Question[] = []): CourseLesson => ({
  id,
  title: `Lesson ${id}`,
  objectives: [],
  blocks: [],
  questions,
  linkedDeckIds: [],
});

const baseCourse = (): Course => ({
  id: "course-1",
  title: "Test Course",
  subject: "Biology",
  color: "#123456",
  tags: [],
  objectives: [],
  sources: [],
  modules: [
    {
      id: "module-1",
      title: "Module 1",
      objectives: [],
      linkedDeckIds: ["deck-a", "deck-b"],
      lessons: [lesson("lesson-1", [question("q1")]), lesson("lesson-2", [question("q2")])],
    },
  ],
  linkedDeckIds: ["deck-a"],
  createdAt: 1,
  updatedAt: 1,
});

describe("validateCourseJson", () => {
  it("accepts the bundled sample course and assigns question ids", () => {
    const result = validateCourseJson(SAMPLE_COURSE_JSON);
    expect(result.ok).toBe(true);
    expect(result.course?.modules).toHaveLength(1);
    expect(result.course?.modules[0].lessons).toHaveLength(1);
    expect(result.course?.modules[0].lessons[0].questions).toHaveLength(2);
    expect(result.course?.modules[0].lessons[0].questions[0].id).toBeTruthy();
  });

  it("rejects a module without lessons", () => {
    const result = validateCourseJson(
      JSON.stringify({
        title: "Empty course",
        modules: [{ title: "Module", lessons: [] }],
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/at least one lesson/i);
  });

  it("surfaces checkpoint validation errors with their path", () => {
    const result = validateCourseJson(
      JSON.stringify({
        title: "Bad course",
        modules: [
          {
            title: "Module",
            lessons: [
              {
                title: "Lesson",
                questions: [
                  {
                    type: "multiple-choice",
                    question: "Pick one",
                    options: ["only one"],
                    answer: "missing",
                  },
                ],
              },
            ],
          },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/modules\[0\]\.lessons\[0\]\.questions/);
  });

  it("rejects malformed JSON syntax", () => {
    const result = validateCourseJson("{ not a course");
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/Invalid JSON/);
  });
});

describe("course progress helpers", () => {
  it("finds lessons and flattens them in module order", () => {
    const course = baseCourse();
    expect(findLesson(course, "lesson-2")?.module.id).toBe("module-1");
    expect(findLesson(course, "missing")).toBeNull();
    expect(allLessons(course).map((entry) => entry.lesson.id)).toEqual(["lesson-1", "lesson-2"]);
  });

  it("computes completion and question totals", () => {
    const course = baseCourse();
    const stats = courseStats(course, {
      courseId: course.id,
      startedAt: 1,
      lessons: {
        "lesson-1": {
          status: "completed",
          srs: {},
          bookmarks: [],
          openedAt: 10,
        },
        "lesson-2": {
          status: "in-progress",
          srs: {},
          bookmarks: [],
        },
      },
      questionStats: {
        q1: { attempts: 3, correct: 2, lastSeen: 20 },
      },
      assessments: {},
    });

    expect(stats.lessons).toBe(2);
    expect(stats.completedLessons).toBe(1);
    expect(stats.percent).toBe(50);
    expect(stats.questions).toBe(2);
    expect(stats.answered).toBe(3);
    expect(stats.lastStudiedAt).toBe(10);
  });

  it("returns the first lesson that is not complete", () => {
    const course = baseCourse();
    const next = nextLesson(course, {
      courseId: course.id,
      startedAt: 1,
      lessons: {
        "lesson-1": {
          status: "completed",
          srs: {},
          bookmarks: [],
        },
      },
      questionStats: {},
      assessments: {},
    });
    expect(next?.lesson.id).toBe("lesson-2");
  });

  it("treats missing lesson progress as not started", () => {
    expect(lessonProgress(undefined, "lesson-1").status).toBe("not-started");
  });

  it("collects unique linked deck ids across the course tree", () => {
    expect(linkedDeckIdsForCourse(baseCourse()).sort()).toEqual(["deck-a", "deck-b"]);
  });

  it("includes module quizzes and the final exam when counting questions", () => {
    const course = baseCourse();
    course.modules[0].quiz = {
      id: "quiz-1",
      title: "Module quiz",
      passingScore: 80,
      questions: [question("q3")],
    };
    course.finalExam = {
      id: "final-1",
      title: "Final",
      passingScore: 80,
      questions: [question("q4")],
    };
    expect(allCourseQuestions(course).map((item) => item.id)).toEqual(["q1", "q2", "q3", "q4"]);
  });

  it("counts linked decks without duplicates", () => {
    const decks = [{ id: "deck-a" }, { id: "deck-b" }, { id: "deck-c" }] as Deck[];
    expect(linkedDeckIdsForCourse(baseCourse())).toHaveLength(2);
    expect(
      decks.filter((deck) => linkedDeckIdsForCourse(baseCourse()).includes(deck.id)),
    ).toHaveLength(2);
  });
});
