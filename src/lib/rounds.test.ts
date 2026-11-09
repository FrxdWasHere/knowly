import { describe, expect, it } from "vitest";
import {
  BOSS_SIZE,
  bossHealth,
  buildRounds,
  fragmentDeck,
  hardestQuestions,
  MAX_HEARTS,
  nextPart,
  partCleared,
  questionWeight,
  ROUND_SIZE,
} from "./rounds";
import type { Deck, Difficulty, Question, QuestionType } from "./types";

let seq = 0;
const question = (over: Partial<Question> = {}): Question => {
  seq += 1;
  return {
    id: `q${seq}`,
    type: "short-answer" as QuestionType,
    question: `Question ${seq}?`,
    answer: `Answer ${seq}`,
    difficulty: "medium" as Difficulty,
    concept: "Cells",
    ...over,
  };
};

const deck = (questions: Question[], over: Partial<Deck> = {}): Deck => ({
  id: "deck",
  title: "Biology",
  subject: "Biology",
  color: "#5fd38a",
  tags: [],
  createdAt: 0,
  favorite: false,
  questions,
  masteredIds: [],
  bookmarks: [],
  notes: {},
  ...over,
});

describe("fragmentDeck", () => {
  it("keeps every card exactly once across the parts", () => {
    const cards = [
      ...Array.from({ length: 25 }, () => question({ concept: "Cells" })),
      ...Array.from({ length: 12 }, () => question({ concept: "Genetics" })),
      ...Array.from({ length: 5 }, () => question({ concept: "Ecology" })),
    ];
    const parts = fragmentDeck(deck(cards));
    const ids = parts.flatMap((p) => p.questions.map((q) => q.id));
    expect(ids).toHaveLength(cards.length);
    expect(new Set(ids).size).toBe(cards.length);
  });

  it("chunks a big concept into parts of at most the part size", () => {
    const cards = Array.from({ length: 45 }, () => question({ concept: "Cells" }));
    const parts = fragmentDeck(deck(cards), { size: 20 });
    expect(parts).toHaveLength(3);
    expect(parts.every((p) => p.questions.length <= 20)).toBe(true);
    expect(new Set(parts.map((p) => p.id)).size).toBe(3);
  });

  it("falls back to tags then subject, and a small deck is one part", () => {
    const cards = [
      question({ concept: undefined, tags: ["Osmosis"] }),
      question({ concept: undefined, tags: undefined }),
    ];
    const parts = fragmentDeck(deck(cards));
    expect(parts.map((p) => p.title).sort()).toEqual(["Biology", "Osmosis"]);
    expect(fragmentDeck(deck([question()])).length).toBe(1);
  });

  it("counts mastery and due cards per part", () => {
    const a = question({ concept: "Cells" });
    const b = question({ concept: "Cells" });
    const parts = fragmentDeck(
      deck([a, b], {
        masteredIds: [a.id],
        srs: {
          [a.id]: {
            ease: 2.5,
            interval: 4,
            due: Date.now() + 86_400_000,
            reps: 1,
            lapses: 0,
            lastReviewed: 0,
            streak: 1,
          },
        },
      }),
    );
    expect(parts[0].mastered).toBe(1);
    expect(parts[0].masteryPct).toBe(50);
    // the never-reviewed card is due; the scheduled one is not
    expect(parts[0].due).toBe(1);
  });
});

describe("weighting and boss cards", () => {
  it("ranks missed hard cards above fresh easy ones", () => {
    const easy = question({ difficulty: "easy" });
    const hard = question({ difficulty: "hard" });
    const lapsed = question({ difficulty: "medium" });
    const subject = deck([easy, hard, lapsed], {
      masteredIds: [easy.id],
      srs: {
        [lapsed.id]: {
          ease: 1.6,
          interval: 0,
          due: 0,
          reps: 4,
          lapses: 3,
          lastReviewed: 0,
          streak: 0,
        },
        [hard.id]: {
          ease: 2.5,
          interval: 2,
          due: 0,
          reps: 1,
          lapses: 0,
          lastReviewed: 0,
          streak: 1,
        },
      },
    });
    expect(questionWeight(subject, lapsed)).toBeGreaterThan(questionWeight(subject, hard));
    expect(questionWeight(subject, hard)).toBeGreaterThan(questionWeight(subject, easy));
    expect(hardestQuestions(subject, 2)[0].id).toBe(lapsed.id);
  });

  it("never returns more cards than exist", () => {
    expect(hardestQuestions(deck([question()]), BOSS_SIZE)).toHaveLength(1);
    expect(bossHealth(0)).toBe(1);
    expect(MAX_HEARTS).toBe(5);
  });
});

describe("buildRounds", () => {
  it("splits a pool into comfortably short rounds", () => {
    const rounds = buildRounds(
      deck([]),
      Array.from({ length: 20 }, () => question()),
    );
    expect(rounds).toHaveLength(Math.ceil(20 / ROUND_SIZE));
    expect(rounds.every((r) => r.length <= ROUND_SIZE)).toBe(true);
  });

  it("hard mode keeps only hard cards, falling back when there are none", () => {
    const cards = [
      question({ difficulty: "hard" }),
      question({ difficulty: "easy" }),
      question({ difficulty: "medium" }),
    ];
    const target = deck(cards);
    const hard = buildRounds(target, cards, "hard").flat();
    expect(hard).toHaveLength(1);
    expect(hard[0].difficulty).toBe("hard");
    // no hard cards at all → the whole pool, not an empty round
    const soft = [question({ difficulty: "easy" }), question({ difficulty: "easy" })];
    expect(buildRounds(deck(soft), soft, "hard").flat()).toHaveLength(2);
  });

  it("speed runs stay within one round", () => {
    const cards = Array.from({ length: 18 }, () => question());
    expect(buildRounds(deck([]), cards, "speed")).toHaveLength(Math.ceil(18 / ROUND_SIZE));
  });

  it("a boss round caps at the boss size", () => {
    const cards = Array.from({ length: 30 }, () => question());
    const rounds = buildRounds(deck(cards), cards, "boss");
    expect(rounds).toHaveLength(1);
    expect(rounds[0].length).toBeLessThanOrEqual(BOSS_SIZE);
  });
});

describe("part progression", () => {
  it("clears a part only when every card is mastered", () => {
    const cards = [question(), question()];
    const [part] = fragmentDeck(deck(cards, { masteredIds: [cards[0].id] }));
    expect(partCleared(part)).toBe(false);
    const [done] = fragmentDeck(deck(cards, { masteredIds: cards.map((c) => c.id) }));
    expect(partCleared(done)).toBe(true);
  });

  it("next part is the least-mastered unfinished one", () => {
    const a = question({ concept: "A" });
    const b1 = question({ concept: "B" });
    const b2 = question({ concept: "B" });
    const parts = fragmentDeck(deck([a, b1, b2], { masteredIds: [a.id] }));
    const next = nextPart(parts);
    const bPart = parts.find((p) => p.title.startsWith("B"))!;
    expect(next.id).toBe(bPart.id);
  });

  it("falls back to the first part when everything is cleared", () => {
    const cards = [question()];
    const parts = fragmentDeck(deck(cards, { masteredIds: [cards[0].id] }));
    expect(nextPart(parts).id).toBe(parts[0].id);
  });
});
