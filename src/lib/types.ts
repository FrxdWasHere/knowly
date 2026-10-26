export type QuestionType =
  | "flashcard"
  | "multiple-choice"
  | "true-false"
  | "fill-blank"
  | "short-answer"
  | "ordering"
  | "matching"
  | "word-bank";

export type Difficulty = "easy" | "medium" | "hard";

export interface MatchPair {
  left: string;
  right: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  answer: string;
  options?: string[];
  explanation?: string;
  difficulty: Difficulty;
  concept?: string;
  hint?: string;
  tags?: string[];
  /** ordering: the items in their correct sequence */
  items?: string[];
  /** matching: prompt/answer couples the learner must pair up */
  pairs?: MatchPair[];
  /** word-bank: the correct word for each ___ blank, in order */
  blanks?: string[];
  /** word-bank: the full pool of selectable words (answers + distractors) */
  wordBank?: string[];
}

export interface Deck {
  id: string;
  title: string;
  subject: string;
  description?: string;
  color: string;
  tags: string[];
  /** math or science subject: shows math helpers and STEM-tuned instructions */
  isSTEM?: boolean;
  /** questions contain LaTeX equations ($…$), rendered locally by KaTeX */
  needsEquations?: boolean;
  /** questions may reference graphs and diagrams */
  needsGraphs?: boolean;
  /** binder labels stuck on this deck */
  labelIds?: string[];
  createdAt: number;
  lastStudiedAt?: number;
  favorite: boolean;
  questions: Question[];
  /** ids of questions answered correctly at least once */
  masteredIds: string[];
  bookmarks: string[];
  notes: Record<string, string>;
  /** spaced repetition schedule, keyed by question id */
  srs?: Record<string, import("./srs").SrsCard>;
  /** ids of questions paused: excluded from reviews and due counts */
  suspended?: string[];
  /** modules that imported this deck as an activity */
  linkedModuleIds?: string[];
}

/* ------------------------------------------------------------------ *
 * Courses
 * ------------------------------------------------------------------ */

export type CourseBlockType =
  "markdown" | "callout" | "example" | "image" | "checkpoint" | "divider" | "activity";

export interface CourseBlock {
  id: string;
  type: CourseBlockType;
  /** markdown / callout / example body */
  markdown?: string;
  /** callout tone */
  tone?: "info" | "tip" | "warning" | "definition";
  title?: string;
  /** image blocks */
  url?: string;
  alt?: string;
  caption?: string;
  /** checkpoint blocks reference a question in the lesson */
  questionId?: string;
}

export interface CourseLesson {
  id: string;
  title: string;
  summary?: string;
  objectives: string[];
  estimatedMinutes?: number;
  blocks: CourseBlock[];
  /** course-owned checkpoint questions */
  questions: Question[];
  linkedDeckIds: string[];
}

export interface CourseAssessment {
  id: string;
  title: string;
  questions: Question[];
  passingScore: number;
  timeLimitMinutes?: number;
}

export interface CourseModule {
  id: string;
  title: string;
  summary?: string;
  objectives: string[];
  lessons: CourseLesson[];
  quiz?: CourseAssessment;
  linkedDeckIds: string[];
}

export interface CourseSource {
  id: string;
  title: string;
  content: string;
}

export interface Course {
  id: string;
  title: string;
  subject: string;
  description?: string;
  level?: string;
  color: string;
  emoji?: string;
  tags: string[];
  /** math or science subject: shows math helpers and STEM-tuned instructions */
  isSTEM?: boolean;
  /** lesson text and questions contain LaTeX equations ($…$ / $$…$$) */
  needsEquations?: boolean;
  /** lessons and questions may reference graphs and diagrams */
  needsGraphs?: boolean;
  /** binder labels stuck on this course */
  labelIds?: string[];
  objectives: string[];
  estimatedMinutes?: number;
  sources: CourseSource[];
  modules: CourseModule[];
  finalExam?: CourseAssessment;
  linkedDeckIds: string[];
  createdAt: number;
  updatedAt: number;
  archived?: boolean;
}

export interface CourseLessonProgress {
  status: "not-started" | "in-progress" | "completed";
  openedAt?: number;
  completedAt?: number;
  /** spaced-repetition schedule for this lesson's checkpoints */
  srs: Record<string, import("./srs").SrsCard>;
  notes?: string;
  bookmarks?: string[];
}

export interface Module {
  id: string;
  title: string;
  subject: string;
  color: string;
  emoji: string;
  tags: string[];
  isSTEM: boolean;
  needsEquations: boolean;
  needsGraphs: boolean;
  objectives: string[];
  blocks: CourseBlock[];
  questions: Question[];
  linkedDeckIds: string[];
  estimatedMinutes: number;
  difficulty: 1 | 2 | 3;
  notes?: string;
  /** home textbook notebook id, if this module lives inside one */
  notebookId?: string;
  createdAt: number;
  updatedAt: number;
  archived?: boolean;
}

export interface ModuleProgress {
  moduleId: string;
  status: "not-started" | "in-progress" | "completed";
  openedAt: number;
  completedAt?: number;
  questionStats: Record<string, { attempts: number; correct: number; lastAnsweredAt: number }>;
  notes?: string;
  bookmarks?: string[];
}
export interface CourseAssessmentResult {
  id: string;
  assessmentId: string;
  createdAt: number;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  durationMs: number;
}

export interface CourseProgress {
  courseId: string;
  startedAt: number;
  lastStudiedAt?: number;
  lessons: Record<string, CourseLessonProgress>;
  questionStats: Record<string, { attempts: number; correct: number; lastSeen: number }>;
  assessments: Record<string, CourseAssessmentResult[]>;
}

export interface AnswerRecord {
  questionId: string;
  deckId: string;
  type: QuestionType;
  difficulty: Difficulty;
  concept?: string;
  correct: boolean;
  skipped: boolean;
  overridden?: boolean;
  timeMs: number;
  given?: string;
}

export interface QuizConfig {
  deckIds: string[];
  questionCount: number;
  types: QuestionType[];
  difficulties: Difficulty[];
  shuffle: boolean;
  perQuestionSeconds: number | null;
  totalMinutes: number | null;
  unlimited: boolean;
  passingScore: number;
  xpEnabled: boolean;
  instantFeedback: boolean;
  /** only use questions bookmarked in their deck */
  bookmarkedOnly: boolean;
}

export interface QuizResult {
  id: string;
  createdAt: number;
  deckIds: string[];
  deckTitles: string[];
  config: QuizConfig;
  answers: AnswerRecord[];
  durationMs: number;
  xpEarned: number;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
}

export interface SessionSummary {
  id: string;
  date: number;
  mode: "study" | "quiz";
  deckTitles: string[];
  answered: number;
  correct: number;
  skipped: number;
  durationMs: number;
  xpEarned: number;
  percentage: number;
}

export interface Progress {
  xp: number;
  lifetimeXp: number;
  totalAnswered: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalSkipped: number;
  studyTimeMs: number;
  streak: number;
  longestStreak: number;
  lastStudyDay: string | null;
  studyDays: Record<string, number>;
  /** studied between midnight and 4am at least once */
  nightOwl: boolean;
  /** studied between 4am and 7am at least once */
  earlyBird: boolean;
  unlockedAchievements: string[];
  perfectQuizzes: number;
  quizzesCompleted: number;
  bestAccuracy: number;
  bestCombo: number;
  conceptStats: Record<string, { correct: number; total: number }>;
}

export interface QuizWidgets {
  progress: boolean;
  timer: boolean;
  questionNumber: boolean;
  accuracy: boolean;
  score: boolean;
  xp: boolean;
  combo: boolean;
  remaining: boolean;
  difficulty: boolean;
  concept: boolean;
}

export interface Settings {
  // general
  displayName: string;
  gradeLevel: string;
  school: string;
  avatarEmoji: string;
  focusSubjects: string[];
  studyReason: string;
  dailyGoal: number;
  confirmBeforeExit: boolean;
  // appearance
  theme: "dark" | "light";
  /** preset palette id from COLOR_THEMES, a user theme id, "custom", or "default" */
  colorTheme: string;
  /** hex palette used when colorTheme === "custom" */
  customTheme: {
    background: string;
    surface: string;
    surface2: string;
    foreground: string;
    primary: string;
    accent: string;
  };
  /** user-created / edited palettes */
  customThemes?: {
    id: string;
    label: string;
    mode: "dark" | "light";
    colors: {
      background: string;
      surface: string;
      surface2: string;
      foreground: string;
      primary: string;
      accent: string;
    };
  }[];
  accent: string;
  /** data URL of a user-uploaded wallpaper image, stored locally */
  wallpaper: string | null;
  wallpaperOpacity: number;
  wallpaperBlur: number;
  fontScale: number;
  density: "compact" | "cozy" | "spacious";
  radius: number;
  buttonSize: "sm" | "default" | "lg";
  animationSpeed: number;
  showProgressBars: boolean;
  sidebarCollapsed: boolean;
  // accessibility
  reducedMotion: boolean;
  highContrast: boolean;
  colorblindPalette: boolean;
  focusIndicators: boolean;
  timerMultiplier: number;
  // study
  autoReveal: boolean;
  shuffleStudy: boolean;
  showHints: boolean;
  showExplanations: boolean;
  /** spaced-repetition scheduler tuning */
  srs: import("./srs").SrsConfig;
  // quiz defaults
  defaultQuizConfig: QuizConfig;
  quizWidgets: QuizWidgets;
  // gamification
  xpEnabled: boolean;
  achievementPopups: boolean;
  // dashboard
  hiddenWidgets: string[];
}

export interface PromptTemplate {
  id: string;
  name: string;
  body: string;
}

export type JournalMood = "great" | "good" | "okay" | "rough";

export interface JournalEntry {
  id: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  body: string;
  mood: JournalMood;
  tags: string[];
  /** optional session this entry reflects on */
  sessionId?: string;
}

import { TimetableSlot } from "./timetable";

export type { TimetableSlot };

export interface AppState {
  version: number;
  onboardingComplete: boolean;
  decks: Deck[];
  courses: Course[];
  courseProgress: Record<string, CourseProgress>;
  modules: Module[];
  moduleProgress: Record<string, ModuleProgress>;
  settings: Settings;
  progress: Progress;
  history: SessionSummary[];
  results: QuizResult[];
  templates: PromptTemplate[];
  journal: JournalEntry[];
  /** weekly class schedule */
  timetable: TimetableSlot[];
  /** binder labels: colour-coded tags shared by decks, courses and papers */
  labels: import("./labels").BinderLabel[];
  /** printed exam papers and their sittings */
  papers: import("./papers").PaperRecord[];
}
