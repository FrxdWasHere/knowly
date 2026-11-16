import { describe, expect, it } from "vitest";
import { buildSampleProfile } from "./sample-profile";
import type { CourseBlock, Question } from "./types";

describe("buildSampleProfile", () => {
  const profile = buildSampleProfile(new Date("2026-11-16T00:00:00").getTime());

  it("includes the main learning surfaces with usable progress", () => {
    expect(profile.decks.length).toBeGreaterThanOrEqual(5);
    expect(profile.courses.length).toBeGreaterThanOrEqual(3);
    expect(profile.modules.length).toBeGreaterThanOrEqual(3);
    expect(Object.keys(profile.moduleProgress)).toHaveLength(profile.modules.length);
    expect(profile.savedQuizSessions).toHaveLength(1);
    expect(profile.history.length).toBeGreaterThanOrEqual(20);
    expect(profile.results.length).toBeGreaterThanOrEqual(5);
    expect(profile.journal.length).toBeGreaterThanOrEqual(5);
    expect(profile.timetable.length).toBeGreaterThanOrEqual(7);
    expect(profile.papers.length).toBeGreaterThanOrEqual(2);
  });

  it("has long-form course and standalone lesson content", () => {
    const courseText = profile.courses.flatMap((course) =>
      course.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.blocks)),
    );
    const moduleText = profile.modules.flatMap((module) => module.blocks);
    const allBlocks: CourseBlock[] = [...courseText, ...moduleText];
    const textLength = allBlocks.reduce((sum, block) => sum + (block.markdown?.length ?? 0), 0);

    expect(textLength).toBeGreaterThan(6000);
    expect(
      profile.courses.every((course) =>
        course.sources.some((source) => source.content.length > 100),
      ),
    ).toBe(true);
  });

  it("covers every question type and keeps module activities linked", () => {
    const questionTypes = new Set<Question["type"]>(
      [
        ...profile.decks.flatMap((deck) => deck.questions),
        ...profile.courses.flatMap((course) =>
          course.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.questions)),
        ),
        ...profile.modules.flatMap((module) => module.questions),
      ].map((question) => question.type),
    );

    expect(questionTypes).toEqual(
      new Set([
        "flashcard",
        "multiple-choice",
        "true-false",
        "fill-blank",
        "short-answer",
        "ordering",
        "matching",
        "word-bank",
      ]),
    );

    const deckIds = new Set(profile.decks.map((deck) => deck.id));
    for (const module of profile.modules) {
      expect(module.linkedDeckIds.every((id) => deckIds.has(id))).toBe(true);
      for (const block of module.blocks) {
        if (block.type === "checkpoint") {
          expect(module.questions.some((question) => question.id === block.questionId)).toBe(true);
        }
        if (block.type === "activity") {
          expect(deckIds.has(block.markdown ?? "")).toBe(true);
        }
      }
    }
  });

  it("provides a resumable quiz checkpoint with a valid next question", () => {
    const saved = profile.savedQuizSessions[0];
    expect(saved.currentIndex).toBe(saved.answers.length);
    expect(saved.pool[saved.currentIndex]?.id).toBe("q-bio-03");
    expect(
      saved.answers.every((answer) =>
        saved.pool.some((question) => question.id === answer.questionId),
      ),
    ).toBe(true);
  });
});
