import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS,
  comboMultiplier,
  evaluateAchievements,
  gradeFor,
  levelFromXp,
  xpForAnswer,
} from "./gamification";
import { DEFAULT_PROGRESS } from "./defaults";
import type { AnswerRecord, Deck, Progress } from "./types";

const record = (over: Partial<AnswerRecord> = {}): AnswerRecord => ({
  questionId: "q",
  deckId: "d",
  type: "short-answer",
  difficulty: "medium",
  correct: true,
  skipped: false,
  timeMs: 1000,
  ...over,
});

const progress = (over: Partial<Progress> = {}): Progress => ({ ...DEFAULT_PROGRESS, ...over });

describe("levelFromXp", () => {
  it("starts at level 1 with no XP", () => {
    const { level, intoLevel } = levelFromXp(0);
    expect(level).toBe(1);
    expect(intoLevel).toBe(0);
  });

  it("increases with XP", () => {
    expect(levelFromXp(100).level).toBe(2);
    expect(levelFromXp(100_000).level).toBeGreaterThan(levelFromXp(1000).level);
  });
});

describe("comboMultiplier", () => {
  it("steps up at each threshold", () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(3)).toBe(1.5);
    expect(comboMultiplier(5)).toBe(2);
    expect(comboMultiplier(10)).toBe(2.5);
    expect(comboMultiplier(15)).toBe(3);
  });
});

describe("xpForAnswer", () => {
  it("awards nothing for skipped cards", () => {
    expect(xpForAnswer(record({ skipped: true }), 0)).toBe(0);
  });

  it("awards more for a correct answer than an incorrect one", () => {
    expect(xpForAnswer(record({ correct: true }), 0)).toBeGreaterThan(
      xpForAnswer(record({ correct: false }), 0),
    );
  });

  it("applies the combo multiplier", () => {
    const base = xpForAnswer(record(), 0);
    expect(xpForAnswer(record(), 15)).toBe(base * 3);
  });
});

describe("achievements", () => {
  it("unlocks first-deck as soon as a deck exists", () => {
    const deck: Deck = {
      id: "d",
      title: "d",
      subject: "s",
      color: "#000",
      tags: [],
      createdAt: 0,
      favorite: false,
      questions: [],
      masteredIds: [],
      bookmarks: [],
      notes: {},
    };
    const unlocked = evaluateAchievements(progress(), [deck]).map((a) => a.id);
    expect(unlocked).toContain("first-deck");
  });

  it("does not re-unlock an earned achievement", () => {
    const unlocked = evaluateAchievements(
      progress({ unlockedAchievements: ["night-owl"], nightOwl: true }),
      [],
    );
    expect(unlocked.map((a) => a.id)).not.toContain("night-owl");
  });

  it("no longer reads night-owl from studyDays", () => {
    const a = ACHIEVEMENTS.find((x) => x.id === "night-owl")!;
    expect(a.check(progress({ nightOwl: true }), [])).toBe(true);
    expect(a.check(progress({ studyDays: { __nightowl: 1 } }), [])).toBe(false);
  });
});

describe("gradeFor", () => {
  it("maps percentages to letter grades", () => {
    expect(gradeFor(100)).toBe("A+");
    expect(gradeFor(60)).toBe("D");
    expect(gradeFor(10)).toBe("F");
  });
});
