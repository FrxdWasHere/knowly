import type { AnswerRecord, Deck, Progress } from "./types";

export const XP_PER_ANSWER = 2;
export const XP_PER_CORRECT = 8;
export const XP_SESSION_BONUS = 25;
export const XP_PERFECT_BONUS = 100;
export const XP_STREAK_BONUS = 15;
export const XP_DECK_COMPLETE = 250;

/** Level curve: level n requires 100 * n^1.35 cumulative-ish XP. */
export function levelFromXp(xp: number) {
  let level = 1;
  let required = 100;
  let remaining = xp;
  while (remaining >= required) {
    remaining -= required;
    level += 1;
    required = Math.round(100 * Math.pow(level, 1.35));
  }
  return { level, intoLevel: remaining, needed: required, pct: (remaining / required) * 100 };
}

export function comboMultiplier(combo: number) {
  if (combo >= 15) return 3;
  if (combo >= 10) return 2.5;
  if (combo >= 5) return 2;
  if (combo >= 3) return 1.5;
  return 1;
}

export function xpForAnswer(record: AnswerRecord, combo: number) {
  if (record.skipped) return 0;
  const base = XP_PER_ANSWER + (record.correct ? XP_PER_CORRECT : 0);
  const diffBonus = record.difficulty === "hard" ? 4 : record.difficulty === "medium" ? 2 : 0;
  return Math.round((base + (record.correct ? diffBonus : 0)) * comboMultiplier(combo));
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  check: (p: Progress, decks: Deck[]) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-deck",
    name: "First Deck",
    description: "Import your first deck into Knowly.",
    icon: "Layers",
    check: (_p, decks) => decks.length >= 1,
  },
  {
    id: "hundred",
    name: "100 Questions",
    description: "Answer 100 questions.",
    icon: "Target",
    check: (p) => p.totalAnswered >= 100,
  },
  {
    id: "thousand",
    name: "1000 Questions",
    description: "Answer 1,000 questions.",
    icon: "Crosshair",
    check: (p) => p.totalAnswered >= 1000,
  },
  {
    id: "perfect",
    name: "Perfect Quiz",
    description: "Finish a quiz with 100% accuracy.",
    icon: "Sparkles",
    check: (p) => p.perfectQuizzes >= 1,
  },
  {
    id: "streak-7",
    name: "7 Day Streak",
    description: "Study seven days in a row.",
    icon: "Flame",
    check: (p) => p.longestStreak >= 7,
  },
  {
    id: "streak-30",
    name: "30 Day Streak",
    description: "Study thirty days in a row.",
    icon: "Trophy",
    check: (p) => p.longestStreak >= 30,
  },
  {
    id: "night-owl",
    name: "Night Owl",
    description: "Study between midnight and 4am.",
    icon: "Moon",
    check: (p) => Boolean(p.studyDays["__nightowl"]),
  },
  {
    id: "early-bird",
    name: "Early Bird",
    description: "Study between 4am and 7am.",
    icon: "Sunrise",
    check: (p) => Boolean(p.studyDays["__earlybird"]),
  },
  {
    id: "deck-master",
    name: "Deck Master",
    description: "Master every question in a deck.",
    icon: "Award",
    check: (_p, decks) =>
      decks.some((d) => d.questions.length > 0 && d.masteredIds.length >= d.questions.length),
  },
  {
    id: "quiz-master",
    name: "Quiz Master",
    description: "Complete 25 quizzes.",
    icon: "Medal",
    check: (p) => p.quizzesCompleted >= 25,
  },
  {
    id: "recall-expert",
    name: "Active Recall Expert",
    description: "Reach a 90% lifetime accuracy over 200+ answers.",
    icon: "Brain",
    check: (p) => p.totalAnswered >= 200 && p.totalCorrect / p.totalAnswered >= 0.9,
  },
  {
    id: "combo-10",
    name: "On Fire",
    description: "Hit a 10-answer correct combo.",
    icon: "Zap",
    check: (p) => p.bestCombo >= 10,
  },
];

export function evaluateAchievements(progress: Progress, decks: Deck[]) {
  return ACHIEVEMENTS.filter(
    (a) => !progress.unlockedAchievements.includes(a.id) && a.check(progress, decks),
  );
}

export function gradeFor(pct: number) {
  if (pct >= 97) return "A+";
  if (pct >= 93) return "A";
  if (pct >= 90) return "A-";
  if (pct >= 87) return "B+";
  if (pct >= 83) return "B";
  if (pct >= 80) return "B-";
  if (pct >= 75) return "C+";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  return "F";
}