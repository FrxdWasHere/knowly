import type { AppState, Progress, QuizConfig, Settings } from "./types";
import { DEFAULT_CUSTOM_THEME } from "./themes";
import { DEFAULT_SRS_CONFIG } from "./srs";

export const ACCENTS: { id: string; label: string; value: string; glow: string }[] = [
  { id: "ocean", label: "Ocean", value: "oklch(0.7 0.15 240)", glow: "oklch(0.79 0.12 225)" },
  {
    id: "deep-blue",
    label: "Deep Blue",
    value: "oklch(0.62 0.18 255)",
    glow: "oklch(0.74 0.15 245)",
  },
  { id: "cyan", label: "Arc Blue", value: "oklch(0.75 0.12 220)", glow: "oklch(0.84 0.09 215)" },
  { id: "azure", label: "Azure", value: "oklch(0.68 0.17 235)", glow: "oklch(0.79 0.13 225)" },
  { id: "midnight", label: "Midnight", value: "oklch(0.55 0.2 270)", glow: "oklch(0.68 0.17 260)" },
  { id: "tidal", label: "Tidal", value: "oklch(0.66 0.15 205)", glow: "oklch(0.78 0.12 210)" },
];

export const DECK_COLORS = [
  "var(--deck-1)",
  "var(--deck-2)",
  "var(--deck-3)",
  "var(--deck-4)",
  "var(--deck-5)",
  "var(--deck-6)",
];

export function oceanDeckColor(color: string) {
  if (DECK_COLORS.includes(color)) return color;
  const index =
    Array.from(color).reduce((sum, char) => sum + char.charCodeAt(0), 0) % DECK_COLORS.length;
  return DECK_COLORS[index];
}

export const DEFAULT_QUIZ_CONFIG: QuizConfig = {
  deckIds: [],
  questionCount: 10,
  types: [
    "multiple-choice",
    "true-false",
    "fill-blank",
    "short-answer",
    "flashcard",
    "ordering",
    "matching",
    "word-bank",
  ],
  difficulties: ["easy", "medium", "hard"],
  shuffle: true,
  perQuestionSeconds: null,
  totalMinutes: null,
  unlimited: false,
  passingScore: 70,
  xpEnabled: true,
  instantFeedback: true,
  bookmarkedOnly: false,
};

export const DEFAULT_SETTINGS: Settings = {
  displayName: "Scholar",
  gradeLevel: "",
  school: "",
  avatarEmoji: "🌊",
  focusSubjects: [],
  studyReason: "",
  dailyGoal: 20,
  confirmBeforeExit: true,
  theme: "dark",
  colorTheme: "default",
  customTheme: { ...DEFAULT_CUSTOM_THEME },
  accent: "ocean",
  wallpaper: null,
  wallpaperOpacity: 0.35,
  wallpaperBlur: 4,
  fontScale: 1,
  density: "cozy",
  radius: 0.5,
  buttonSize: "default",
  animationSpeed: 1,
  showProgressBars: true,
  sidebarCollapsed: false,
  reducedMotion: false,
  highContrast: false,
  colorblindPalette: false,
  focusIndicators: true,
  timerMultiplier: 1,
  autoReveal: false,
  shuffleStudy: false,
  showHints: true,
  showExplanations: true,
  srs: DEFAULT_SRS_CONFIG,
  defaultQuizConfig: DEFAULT_QUIZ_CONFIG,
  quizWidgets: {
    progress: true,
    timer: true,
    questionNumber: true,
    accuracy: true,
    score: true,
    xp: true,
    combo: true,
    remaining: true,
    difficulty: true,
    concept: true,
  },
  xpEnabled: true,
  achievementPopups: true,
  hiddenWidgets: [],
};

export const DEFAULT_PROGRESS: Progress = {
  xp: 0,
  lifetimeXp: 0,
  totalAnswered: 0,
  totalCorrect: 0,
  totalIncorrect: 0,
  totalSkipped: 0,
  studyTimeMs: 0,
  streak: 0,
  longestStreak: 0,
  lastStudyDay: null,
  studyDays: {},
  nightOwl: false,
  earlyBird: false,
  unlockedAchievements: [],
  perfectQuizzes: 0,
  quizzesCompleted: 0,
  bestAccuracy: 0,
  bestCombo: 0,
  conceptStats: {},
};

/**
 * Persisted schema version. Bump this whenever the shape of `AppState` changes
 * in a way that older saves need repair; add a matching entry to the migration
 * table in `src/store/knowly.tsx`.
 */
export const STATE_VERSION = 3;

export const DEFAULT_STATE: AppState = {
  version: STATE_VERSION,
  onboardingComplete: false,
  decks: [],
  courses: [],
  courseProgress: {},
  settings: DEFAULT_SETTINGS,
  progress: DEFAULT_PROGRESS,
  history: [],
  results: [],
  templates: [],
  journal: [],
};

export const GRADE_LEVELS = [
  "Primary school",
  "Middle school",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "College / TAFE",
  "Undergraduate",
  "Honours",
  "Masters",
  "PhD / research",
  "Professional / certification",
  "Bootcamp",
  "Self-directed learner",
  "Teacher / tutor",
];

export const SUBJECT_SUGGESTIONS = [
  "Mathematics",
  "Further Maths",
  "Statistics",
  "Biology",
  "Chemistry",
  "Physics",
  "Psychology",
  "Health & Medicine",
  "Nursing",
  "History",
  "Geography",
  "Politics",
  "Philosophy",
  "Literature",
  "Writing",
  "Languages",
  "Computer Science",
  "Data Science",
  "Engineering",
  "Economics",
  "Accounting",
  "Business",
  "Marketing",
  "Law",
  "Art & Design",
  "Music",
  "Sport Science",
];

export const AVATAR_EMOJIS = [
  "🌊",
  "💧",
  "🐋",
  "🐬",
  "🐙",
  "🦈",
  "🐚",
  "⚓",
  "🧠",
  "📘",
  "📐",
  "🔬",
  "🧪",
  "🌀",
  "🫐",
  "🩵",
  "💙",
  "⚡",
  "🔥",
  "🏆",
  "🎯",
  "🚀",
  "🦉",
  "🐺",
];

export const STUDY_REASONS = [
  "Exam prep",
  "Daily revision",
  "Certification",
  "Assignments",
  "Interview prep",
  "Language fluency",
  "Teaching others",
  "Curiosity",
];

export const STUDY_TIMES = ["Early morning", "Daytime", "Evening", "Late night", "Whenever I can"];

export const SESSION_LENGTHS = [
  { label: "Quick", detail: "5–10 min bursts", goal: 10 },
  { label: "Balanced", detail: "20 min a day", goal: 25 },
  { label: "Deep", detail: "45 min sessions", goal: 60 },
  { label: "Marathon", detail: "Cramming season", goal: 120 },
];
