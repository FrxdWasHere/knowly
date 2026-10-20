import { dayKey } from "./answers";
import type { Deck, Question } from "./types";

/** ---------------------------------------------------------------
 *  Knowly spaced repetition — a compact SM-2 variant.
 *  Every question in a deck carries an optional scheduling card in
 *  `deck.srs`. Cards without an entry are treated as brand new and
 *  are always due.
 *  --------------------------------------------------------------- */

export const DAY_MS = 86_400_000;

export type SrsGrade = "again" | "hard" | "good" | "easy";

export interface SrsCard {
  /** ease factor, 1.3 – 3.0 */
  ease: number;
  /** current interval in days (0 = relearning today) */
  interval: number;
  /** epoch ms when the card becomes due */
  due: number;
  reps: number;
  lapses: number;
  lastReviewed: number;
  /** consecutive good/easy answers */
  streak: number;
}

/** Tunable scheduler knobs, persisted in `settings.srs`. */
export interface SrsConfig {
  /** minutes a forgotten card waits before it comes back */
  learningStepMinutes: number;
  /** multiplier applied to the interval on an "easy" grade */
  easyBonus: number;
  /** global multiplier applied to every scheduled interval (0.5–2) */
  intervalModifier: number;
  /** hard ceiling so intervals never explode */
  maxIntervalDays: number;
}

export const DEFAULT_SRS_CONFIG: SrsConfig = {
  learningStepMinutes: 10,
  easyBonus: 1.25,
  intervalModifier: 1,
  maxIntervalDays: 365,
};

const resolveConfig = (config?: Partial<SrsConfig>): SrsConfig => ({
  ...DEFAULT_SRS_CONFIG,
  ...config,
});

export const GRADE_META: {
  id: SrsGrade;
  label: string;
  hint: string;
  key: string;
  className: string;
}[] = [
  {
    id: "again",
    label: "Again",
    hint: "Forgot it",
    key: "1",
    className: "border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20",
  },
  {
    id: "hard",
    label: "Hard",
    hint: "Barely got it",
    key: "2",
    className: "border-warning/50 bg-warning/10 text-warning hover:bg-warning/20",
  },
  {
    id: "good",
    label: "Good",
    hint: "Recalled it",
    key: "3",
    className: "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20",
  },
  {
    id: "easy",
    label: "Easy",
    hint: "Instant recall",
    key: "4",
    className: "border-success/50 bg-success/10 text-success hover:bg-success/20",
  },
];

const clampEase = (e: number) => Math.min(3, Math.max(1.3, Number(e.toFixed(2))));

export function newCard(now = Date.now()): SrsCard {
  return { ease: 2.5, interval: 0, due: now, reps: 0, lapses: 0, lastReviewed: 0, streak: 0 };
}

/** Interval (in days) a grade would produce, without mutating anything. */
export function previewInterval(
  card: SrsCard | undefined,
  grade: SrsGrade,
  config?: Partial<SrsConfig>,
): number {
  const cfg = resolveConfig(config);
  const c = card ?? newCard();
  const clamp = (days: number) => Math.min(cfg.maxIntervalDays, Math.max(0, days));
  switch (grade) {
    case "again":
      return 0;
    case "hard":
      return clamp(
        c.reps === 0 ? 1 : Math.max(1, Math.round(c.interval * 1.2 * cfg.intervalModifier)),
      );
    case "good":
      if (c.reps === 0) return clamp(1);
      if (c.interval <= 1) return clamp(3);
      return clamp(Math.max(1, Math.round(c.interval * c.ease * cfg.intervalModifier)));
    case "easy":
      if (c.reps === 0) return clamp(3);
      if (c.interval <= 1) return clamp(5);
      return clamp(
        Math.max(2, Math.round(c.interval * c.ease * cfg.easyBonus * cfg.intervalModifier)),
      );
  }
}

/** Apply a review grade and return the next scheduling card. */
export function schedule(
  card: SrsCard | undefined,
  grade: SrsGrade,
  now = Date.now(),
  config?: Partial<SrsConfig>,
): SrsCard {
  const cfg = resolveConfig(config);
  const c = card ?? newCard(now);
  const interval = previewInterval(c, grade, cfg);
  const easeDelta =
    grade === "again" ? -0.2 : grade === "hard" ? -0.15 : grade === "easy" ? 0.12 : 0;
  return {
    ease: clampEase(c.ease + easeDelta),
    interval,
    // relearning cards come back in the configured learning step, scheduled
    // cards in N days
    due: grade === "again" ? now + cfg.learningStepMinutes * 60_000 : now + interval * DAY_MS,
    reps: c.reps + 1,
    lapses: c.lapses + (grade === "again" ? 1 : 0),
    lastReviewed: now,
    streak: grade === "again" ? 0 : c.streak + 1,
  };
}

export type SrsStage = "new" | "learning" | "young" | "mature";

export function cardStage(card: SrsCard | undefined): SrsStage {
  if (!card || card.reps === 0) return "new";
  if (card.interval < 1) return "learning";
  if (card.interval < 21) return "young";
  return "mature";
}

export const STAGE_META: Record<SrsStage, { label: string; color: string }> = {
  new: { label: "New", color: "var(--muted-foreground)" },
  learning: { label: "Learning", color: "var(--warning)" },
  young: { label: "Young", color: "var(--primary)" },
  mature: { label: "Mature", color: "var(--success)" },
};

export function isDue(card: SrsCard | undefined, now = Date.now()) {
  return !card || card.due <= now;
}

export interface DeckSrs {
  total: number;
  /** due right now, including never-seen cards */
  due: number;
  /** due right now that have been seen before */
  dueReview: number;
  fresh: number;
  learning: number;
  young: number;
  mature: number;
  /** 0–100: share of the deck scheduled beyond tomorrow */
  health: number;
  /** epoch ms of the soonest upcoming (not yet due) card */
  nextDue: number | null;
  /** average ease across seen cards */
  ease: number;
  /** % of reviews that never lapsed */
  retention: number;
}

/** Questions paused by the learner, excluded from every study surface. */
export function suspendedSet(deck: Deck): Set<string> {
  return new Set(deck.suspended ?? []);
}

export function deckSrs(deck: Deck, now = Date.now()): DeckSrs {
  const map = deck.srs ?? {};
  const paused = suspendedSet(deck);
  let due = 0;
  let dueReview = 0;
  let fresh = 0;
  let learning = 0;
  let young = 0;
  let mature = 0;
  let easeSum = 0;
  let seen = 0;
  let lapsed = 0;
  let nextDue: number | null = null;
  let total = 0;

  for (const q of deck.questions) {
    if (paused.has(q.id)) continue;
    total += 1;
    const card = map[q.id];
    const stage = cardStage(card);
    if (stage === "new") fresh += 1;
    else if (stage === "learning") learning += 1;
    else if (stage === "young") young += 1;
    else mature += 1;

    if (card && card.reps > 0) {
      seen += 1;
      easeSum += card.ease;
      if (card.lapses > 0) lapsed += 1;
    }

    if (isDue(card, now)) {
      due += 1;
      if (card && card.reps > 0) dueReview += 1;
    } else if (card && (nextDue === null || card.due < nextDue)) {
      nextDue = card.due;
    }
  }

  const scheduled = young + mature;
  return {
    total,
    due,
    dueReview,
    fresh,
    learning,
    young,
    mature,
    health: total ? Math.round(((scheduled + mature) / (total * 2)) * 100) : 0,
    nextDue,
    ease: seen ? Number((easeSum / seen).toFixed(2)) : 2.5,
    retention: seen ? Math.round(((seen - lapsed) / seen) * 100) : 0,
  };
}

export interface DueItem {
  deckId: string;
  deckTitle: string;
  deckColor: string;
  question: Question;
  card: SrsCard | undefined;
}

/** Every due card across every deck, oldest-due first. */
export function collectDue(decks: Deck[], now = Date.now()): DueItem[] {
  const items: DueItem[] = [];
  for (const deck of decks) {
    const map = deck.srs ?? {};
    const paused = suspendedSet(deck);
    for (const q of deck.questions) {
      if (paused.has(q.id)) continue;
      const card = map[q.id];
      if (!isDue(card, now)) continue;
      items.push({
        deckId: deck.id,
        deckTitle: deck.title,
        deckColor: deck.color,
        question: q,
        card,
      });
    }
  }
  return items.sort((a, b) => (a.card?.due ?? 0) - (b.card?.due ?? 0));
}

/** How shaky a seen card is: higher = weaker. */
export function weakness(card: SrsCard): number {
  return card.lapses * 3 + Math.max(0, 2.5 - card.ease) * 4 - Math.min(card.streak, 5);
}

export function isWeak(card: SrsCard | undefined): card is SrsCard {
  if (!card || card.reps === 0) return false;
  return card.lapses > 0 || card.ease < 2.4 || card.streak === 0;
}

/** Every shaky card across every deck, weakest first. */
export function collectWeak(decks: Deck[], limit = 200): DueItem[] {
  const items: DueItem[] = [];
  for (const deck of decks) {
    const map = deck.srs ?? {};
    const paused = suspendedSet(deck);
    for (const q of deck.questions) {
      if (paused.has(q.id)) continue;
      const card = map[q.id];
      if (!isWeak(card)) continue;
      items.push({
        deckId: deck.id,
        deckTitle: deck.title,
        deckColor: deck.color,
        question: q,
        card,
      });
    }
  }
  return items
    .sort((a, b) => weakness(b.card as SrsCard) - weakness(a.card as SrsCard))
    .slice(0, limit);
}

/** Lapse count at which a card is considered a leech. */
export const LEECH_THRESHOLD = 3;

export interface LeechItem extends DueItem {
  card: SrsCard;
  lapses: number;
  suspended: boolean;
}

/**
 * Every card that keeps lapsing, worst first. Suspended cards are included
 * so they can be un-paused from the same screen.
 */
export function collectLeeches(decks: Deck[], threshold = LEECH_THRESHOLD): LeechItem[] {
  const items: LeechItem[] = [];
  for (const deck of decks) {
    const map = deck.srs ?? {};
    const paused = suspendedSet(deck);
    for (const q of deck.questions) {
      const card = map[q.id];
      if (!card || card.reps === 0) continue;
      const isPaused = paused.has(q.id);
      if (card.lapses < threshold && !isPaused) continue;
      items.push({
        deckId: deck.id,
        deckTitle: deck.title,
        deckColor: deck.color,
        question: q,
        card,
        lapses: card.lapses,
        suspended: isPaused,
      });
    }
  }
  return items.sort((a, b) => b.lapses - a.lapses || weakness(b.card) - weakness(a.card));
}

export interface ForecastDay {
  key: string;
  label: string;
  count: number;
  isToday: boolean;
}

/** Upcoming review load, starting today. */
export function forecast(decks: Deck[], days = 7, now = Date.now()): ForecastDay[] {
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) buckets.set(dayKey(now + i * DAY_MS), 0);
  const todayKey = dayKey(now);
  const lastKey = dayKey(now + (days - 1) * DAY_MS);

  for (const deck of decks) {
    const map = deck.srs ?? {};
    for (const q of deck.questions) {
      const card = map[q.id];
      const key = isDue(card, now) ? todayKey : dayKey(card!.due);
      if (key > lastKey) continue;
      const bucketKey = key < todayKey ? todayKey : key;
      buckets.set(bucketKey, (buckets.get(bucketKey) ?? 0) + 1);
    }
  }

  return Array.from(buckets.entries()).map(([key, count], i) => ({
    key,
    count,
    isToday: i === 0,
    label:
      i === 0
        ? "Today"
        : i === 1
          ? "Tmrw"
          : new Date(now + i * DAY_MS).toLocaleDateString(undefined, { weekday: "short" }),
  }));
}

/** Human phrasing for a due timestamp. */
export function formatDue(due: number | null | undefined, now = Date.now()): string {
  if (due == null) return "Not scheduled";
  const diff = due - now;
  if (diff <= 0) return "Due now";
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.round(diff / 3_600_000);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.round(diff / DAY_MS);
  if (days === 1) return "tomorrow";
  if (days < 30) return `in ${days}d`;
  const months = Math.round(days / 30);
  return `in ${months}mo`;
}

export function formatInterval(days: number): string {
  if (days <= 0) return "10m";
  if (days === 1) return "1d";
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

/** Map a study/quiz outcome onto a review grade. */
export function gradeFromOutcome(
  outcome: "correct" | "incorrect" | "skip",
  timeMs?: number,
): SrsGrade | null {
  if (outcome === "skip") return null;
  if (outcome === "incorrect") return "again";
  // fast, confident recall counts as easy
  return timeMs != null && timeMs < 6000 ? "easy" : "good";
}
