import { describe, expect, it } from "vitest";
import {
  cardStage,
  collectDue,
  collectLeeches,
  collectWeak,
  DAY_MS,
  deckSrs,
  forecast,
  gradeFromOutcome,
  isDue,
  newCard,
  previewInterval,
  schedule,
} from "./srs";
import type { Deck, Question } from "./types";

const q = (id: string): Question => ({
  id,
  type: "short-answer",
  question: id,
  answer: id,
  difficulty: "medium",
});

const deck = (id: string, questions: Question[], over: Partial<Deck> = {}): Deck => ({
  id,
  title: id,
  subject: "General",
  color: "#000",
  tags: [],
  createdAt: 0,
  favorite: false,
  questions,
  masteredIds: [],
  bookmarks: [],
  notes: {},
  ...over,
});

const NOW = new Date(2026, 0, 1, 12, 0, 0).getTime();

describe("newCard / cardStage", () => {
  it("starts as a new card", () => {
    const c = newCard(NOW);
    expect(c.reps).toBe(0);
    expect(cardStage(c)).toBe("new");
    expect(isDue(c, NOW)).toBe(true);
  });

  it("classifies stages by interval", () => {
    expect(cardStage({ ...newCard(), reps: 1, interval: 0 })).toBe("learning");
    expect(cardStage({ ...newCard(), reps: 1, interval: 5 })).toBe("young");
    expect(cardStage({ ...newCard(), reps: 1, interval: 30 })).toBe("mature");
  });

  it("treats a missing card as due", () => {
    expect(isDue(undefined, NOW)).toBe(true);
  });
});

describe("previewInterval", () => {
  it("resets to 0 on 'again'", () => {
    expect(previewInterval(undefined, "again")).toBe(0);
  });

  it("gives 1 day for a first 'good' and 3 for a first 'easy'", () => {
    expect(previewInterval(undefined, "good")).toBe(1);
    expect(previewInterval(undefined, "easy")).toBe(3);
  });

  it("grows intervals for scheduled cards", () => {
    const card = { ...newCard(), reps: 2, interval: 10, ease: 2.5 };
    expect(previewInterval(card, "good")).toBeGreaterThan(10);
  });
});

describe("schedule", () => {
  it("schedules a relearn in ~10 minutes on 'again'", () => {
    const next = schedule(undefined, "again", NOW);
    expect(next.lapses).toBe(1);
    expect(next.due).toBe(NOW + 10 * 60_000);
    expect(next.streak).toBe(0);
  });

  it("increments reps and pushes the due date out on 'good'", () => {
    const next = schedule(undefined, "good", NOW);
    expect(next.reps).toBe(1);
    expect(next.due).toBe(NOW + DAY_MS);
  });

  it("clamps the ease factor within 1.3–3.0", () => {
    let card = newCard(NOW);
    for (let i = 0; i < 20; i++) card = schedule(card, "again", NOW);
    expect(card.ease).toBeGreaterThanOrEqual(1.3);
    for (let i = 0; i < 40; i++) card = schedule(card, "easy", NOW);
    expect(card.ease).toBeLessThanOrEqual(3);
  });
});

describe("deckSrs / collectDue", () => {
  const d = deck("d1", [q("a"), q("b"), q("c")], {
    srs: {
      a: { ...newCard(NOW), reps: 1, interval: 5, due: NOW + 5 * DAY_MS },
      b: { ...newCard(NOW), reps: 1, interval: 0, due: NOW - 1000 },
    },
  });

  it("counts never-seen and overdue cards as due", () => {
    const stats = deckSrs(d, NOW);
    expect(stats.total).toBe(3);
    expect(stats.due).toBe(2); // b (overdue) + c (new)
    expect(stats.dueReview).toBe(1); // b
    expect(stats.fresh).toBe(1); // c
  });

  it("excludes suspended cards everywhere", () => {
    const paused = deck("d2", [q("a"), q("b")], { suspended: ["a"] });
    expect(deckSrs(paused, NOW).total).toBe(1);
    expect(collectDue([paused], NOW).map((i) => i.question.id)).toEqual(["b"]);
  });

  it("collects due items oldest-due first (new cards sort first)", () => {
    const due = collectDue([d], NOW);
    expect(due.map((i) => i.question.id)).toEqual(["c", "b"]);
  });
});

describe("weak & leech collection", () => {
  it("flags lapsed cards as weak", () => {
    const d = deck("d1", [q("a"), q("b")], {
      srs: {
        a: { ...newCard(NOW), reps: 3, interval: 1, ease: 1.9, lapses: 2, streak: 0 },
        b: { ...newCard(NOW), reps: 3, interval: 30, ease: 2.6, lapses: 0, streak: 4 },
      },
    });
    expect(collectWeak([d]).map((i) => i.question.id)).toEqual(["a"]);
  });

  it("includes suspended leeches so they can be un-paused", () => {
    const d = deck("d1", [q("a")], {
      suspended: ["a"],
      srs: { a: { ...newCard(NOW), reps: 5, interval: 1, ease: 1.5, lapses: 4, streak: 0 } },
    });
    const leeches = collectLeeches([d]);
    expect(leeches).toHaveLength(1);
    expect(leeches[0].suspended).toBe(true);
  });
});

describe("forecast", () => {
  it("buckets every card into the next 7 days", () => {
    const d = deck("d1", [q("a"), q("b")], {
      srs: {
        a: { ...newCard(NOW), reps: 1, interval: 1, due: NOW + DAY_MS },
        b: { ...newCard(NOW), reps: 1, interval: 3, due: NOW + 3 * DAY_MS },
      },
    });
    const days = forecast([d], 7, NOW);
    expect(days).toHaveLength(7);
    expect(days.reduce((n, day) => n + day.count, 0)).toBe(2);
    expect(days[0].isToday).toBe(true);
  });
});

describe("srs config", () => {
  it("uses the configured relearn step for 'again'", () => {
    const next = schedule(undefined, "again", NOW, { learningStepMinutes: 30 });
    expect(next.due).toBe(NOW + 30 * 60_000);
  });

  it("applies the interval modifier", () => {
    const card = { ...newCard(), reps: 3, interval: 10, ease: 2.5 };
    expect(previewInterval(card, "good", { intervalModifier: 2 })).toBe(50);
    expect(previewInterval(card, "good")).toBe(25);
  });

  it("applies the easy bonus", () => {
    const card = { ...newCard(), reps: 3, interval: 10, ease: 2 };
    expect(previewInterval(card, "easy", { easyBonus: 2 })).toBe(40);
    expect(previewInterval(card, "easy")).toBe(25); // default 1.25
  });

  it("caps intervals at maxIntervalDays", () => {
    const card = { ...newCard(), reps: 3, interval: 100, ease: 2.5 };
    expect(previewInterval(card, "good", { maxIntervalDays: 10 })).toBe(10);
  });

  it("keeps the defaults when no config is supplied", () => {
    expect(previewInterval(undefined, "good")).toBe(1);
    expect(schedule(undefined, "again", NOW).due).toBe(NOW + 10 * 60_000);
  });
});

describe("gradeFromOutcome", () => {
  it("maps outcomes to grades", () => {
    expect(gradeFromOutcome("skip")).toBeNull();
    expect(gradeFromOutcome("incorrect")).toBe("again");
    expect(gradeFromOutcome("correct", 3000)).toBe("easy");
    expect(gradeFromOutcome("correct", 20_000)).toBe("good");
  });
});
