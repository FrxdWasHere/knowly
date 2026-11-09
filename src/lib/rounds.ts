import { shuffleArray } from "./answers";
import type { Deck, Difficulty, Question } from "./types";

/* ------------------------------------------------------------------ *
 *  Rounds — the Gizmo-style study loop for decks.
 *
 *  A deck of hundreds of cards is never thrown at the learner in one
 *  sitting. It is split into "parts" (sub-topics, decks-within-decks),
 *  each part into short rounds, and a part ends with a boss round made
 *  of the cards the learner keeps missing.
 *  Everything here is pure so the planning can be unit-tested.
 * ------------------------------------------------------------------ */

/** Hearts at the start of a session. */
export const MAX_HEARTS = 5;
/** XP it costs to buy a heart back. */
export const HEART_COST_XP = 500;
/** Questions per part (a "deck within a deck"). */
export const PART_SIZE = 20;
/** Questions per round. Keeps a round to a few minutes. */
export const ROUND_SIZE = 8;
/** Cards in a boss round. */
export const BOSS_SIZE = 6;
/** Seconds per card in a speed-run. */
export const SPEED_SECONDS = 15;

export type RoundMode = "normal" | "hard" | "speed" | "boss";

export const ROUND_MODE_META: Record<
  RoundMode,
  { label: string; blurb: string; xpMultiplier: number }
> = {
  normal: {
    label: "Round",
    blurb: `${ROUND_SIZE} cards at your pace`,
    xpMultiplier: 1,
  },
  hard: {
    label: "Hard round",
    blurb: "Only the cards marked hard",
    xpMultiplier: 1.5,
  },
  speed: {
    label: "Speed run",
    blurb: `${SPEED_SECONDS}s per card`,
    xpMultiplier: 2,
  },
  boss: {
    label: "Boss round",
    blurb: "Your hardest cards, back to back",
    xpMultiplier: 2.5,
  },
};

export interface DeckPart {
  id: string;
  /** the sub-topic this part covers */
  title: string;
  questions: Question[];
  mastered: number;
  /** cards in the part that are new or due for review */
  due: number;
  masteryPct: number;
  /** how many rounds the part is studied in */
  roundCount: number;
}

const DIFFICULTY_WEIGHT: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "part";

/**
 * The sub-topic a card belongs to: its concept, else its first tag, else
 * the deck's subject. Cards without any of those all land in one part
 * rather than one-deck-per-card.
 */
export function subTopicOf(question: Question, fallback: string) {
  const concept = question.concept?.trim();
  if (concept) return concept;
  const tag = question.tags?.find((t) => t.trim());
  if (tag) return tag.trim();
  return fallback || "General";
}

/**
 * Splits a deck into parts of at most `size` cards, grouping by sub-topic
 * first so a part is one coherent idea. Every question appears in exactly
 * one part. A deck smaller than `size` yields a single part.
 */
export function fragmentDeck(
  deck: Deck,
  { size = PART_SIZE, now = Date.now() }: { size?: number; now?: number } = {},
): DeckPart[] {
  const grouped = new Map<string, Question[]>();
  for (const question of deck.questions) {
    const key = subTopicOf(question, deck.subject);
    const bucket = grouped.get(key);
    if (bucket) bucket.push(question);
    else grouped.set(key, [question]);
  }

  const parts: DeckPart[] = [];
  for (const [title, questions] of grouped) {
    const chunks: Question[][] = [];
    for (let i = 0; i < questions.length; i += size) chunks.push(questions.slice(i, i + size));
    chunks.forEach((chunk, i) => {
      const mastered = chunk.filter((q) => deck.masteredIds.includes(q.id)).length;
      const due = chunk.filter((q) => {
        const card = deck.srs?.[q.id];
        return !card || card.due <= now;
      }).length;
      parts.push({
        id: `${slug(title)}-${i}`,
        title: chunks.length > 1 ? `${title} · ${i + 1}` : title,
        questions: chunk,
        mastered,
        due,
        masteryPct: chunk.length ? Math.round((mastered / chunk.length) * 100) : 0,
        roundCount: Math.max(1, Math.ceil(chunk.length / ROUND_SIZE)),
      });
    });
  }

  // Biggest parts first, then alphabetical, so the list is stable.
  return parts.sort(
    (a, b) => b.questions.length - a.questions.length || a.title.localeCompare(b.title),
  );
}

/**
 * How likely a card is to be missed: hard difficulty, lapsed reviews,
 * a low ease factor and never-mastered cards all raise the weight.
 */
export function questionWeight(deck: Deck, question: Question) {
  const card = deck.srs?.[question.id];
  let weight = DIFFICULTY_WEIGHT[question.difficulty] * 2;
  if (!deck.masteredIds.includes(question.id)) weight += 2;
  if (card) {
    weight += Math.min(card.lapses, 4) * 3;
    if (card.ease < 2.2) weight += 2;
    if (card.interval === 0) weight += 1;
  } else {
    weight += 1;
  }
  if (question.type === "word-bank" || question.type === "matching") weight += 1;
  return weight;
}

/** The `count` cards in `pool` most likely to trip the learner up. */
export function hardestQuestions(deck: Deck, count: number, pool?: Question[]) {
  const questions = pool ?? deck.questions;
  return [...questions]
    .sort((a, b) => questionWeight(deck, b) - questionWeight(deck, a) || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, count));
}

/**
 * Chunks a question list into rounds for the given mode. A hard round is
 * built from the hard-difficulty cards only; when a part has none it falls
 * back to the whole pool so the button never dead-ends.
 */
export function buildRounds(
  deck: Deck,
  questions: Question[],
  mode: RoundMode = "normal",
  { size = ROUND_SIZE, bossSize = BOSS_SIZE }: { size?: number; bossSize?: number } = {},
): Question[][] {
  let pool: Question[];
  switch (mode) {
    case "hard": {
      const hard = questions.filter((q) => q.difficulty === "hard");
      pool = hard.length ? hard : questions;
      break;
    }
    case "boss":
      pool = hardestQuestions(deck, bossSize, questions);
      break;
    default:
      pool = questions;
  }

  const ordered = mode === "speed" ? shuffleArray(pool) : pool;
  const rounds: Question[][] = [];
  for (let i = 0; i < ordered.length; i += size) rounds.push(ordered.slice(i, i + size));
  return rounds;
}

/** A part is "cleared" once every card in it has been answered correctly before. */
export function partCleared(part: DeckPart) {
  return part.questions.length > 0 && part.mastered >= part.questions.length;
}

/** Which part the learner should pick up next: the least-mastered unfinished one. */
export function nextPart(parts: DeckPart[]) {
  const unfinished = parts.filter((p) => !partCleared(p));
  if (!unfinished.length) return parts[0];
  return [...unfinished].sort((a, b) => a.masteryPct - b.masteryPct)[0];
}

/** Boss health for a boss round: one hit per card. */
export function bossHealth(roundLength: number) {
  return Math.max(1, roundLength);
}
