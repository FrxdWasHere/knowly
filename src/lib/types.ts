import type { ExamTheme } from "./exam-print";

export type QuestionType =
  | "flashcard"
  | "multiple-choice"
  | "multiple-select"
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

/**
 * Pre-written tutor notes, authored with the question itself so the learner
 * never has to leave a session (or call out to an AI) for a second opinion.
 */
export interface TutorNotes {
  /** the idea in plain words, as if explaining to a beginner */
  simple?: string;
  /** why the correct multiple-choice, multiple-select, or true/false option(s) are right */
  whyCorrect?: string;
  /** a memory hook: acronym, rhyme, image or story */
  mnemonic?: string;
  /** a tiny concrete example or analogy */
  example?: string;
  /** why each wrong option is wrong */
  whyWrong?: { option: string; why: string }[];
}

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  answer: string;
  options?: string[];
  /** multiple-select: every correct option; all must be chosen for credit */
  correctOptions?: string[];
  explanation?: string;
  /** common incorrect answers and the misconceptions behind them */
  incorrectExplanation?: string;
  difficulty: Difficulty;
  concept?: string;
  hint?: string;
  tags?: string[];
  /** pre-written tutor notes: plain-words explanation, mnemonic, example, why each distractor fails */
  tutor?: TutorNotes;
  /** ordering: the items in their correct sequence */
  items?: string[];
  /** matching: prompt/answer couples the learner must pair up */
  pairs?: MatchPair[];
  /** word-bank: the correct word for each ___ blank, in order */
  blanks?: string[];
  /** word-bank: the full pool of selectable words (answers + distractors) */
  wordBank?: string[];
}

/** Shared length/detail presets used by every generation surface. */
export type LengthPreset = "shorter" | "short" | "regular" | "long" | "longer";

/**
 * Learning Path - the primary organizational structure for Deck study.
 * A path is a progressive journey through a deck's concepts: ordered stages,
 * each with activities that move from exposure to mastery.
 */
export interface LearningPath {
  id: string;
  deckId: string;
  title: string;
  description?: string;
  /** where the structure came from */
  source: "auto" | "smart" | "manual" | "imported";
  /** length/detail setting used when the path was planned */
  lengthPreset?: LengthPreset;
  stages: LearningStage[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  totalMasteryPct: number;
  conceptsCovered: string[];
  estimatedMinutes: number;
  /** concepts/cards that were missed and should come back in later practice */
  reinforcementQuestionIds: string[];
}

/** A learning milestone in a path. */
export interface LearningStage {
  id: string;
  /** position in the path, starting at 0 */
  index: number;
  title: string;
  description?: string;
  /** the pedagogical job of this stage */
  purpose: StagePurpose;
  /** what the learner should be able to do after this stage */
  objectives: string[];
  concepts: string[];
  /** concepts from earlier stages that this stage builds on */
  prerequisiteConcepts?: string[];
  /** the hardest difficulty this stage should reach */
  difficultyTarget: Difficulty;
  progress: StageProgress;
  activities: LearningActivity[];
  masteryPct: number;
  estimatedMinutes: number;
}

/** Progress tracking for a stage. */
export interface StageProgress {
  status: "not-started" | "in-progress" | "completed";
  completedAt?: number;
  startedAt?: number;
  totalQuestionsAnswered: number;
  correctAnswers: number;
  questionsRequiringReinforcement: string[];
}

/** A specific learning exercise inside a stage. */
export interface LearningActivity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  /** one line naming the skill this activity practises */
  objective?: string;
  questions: ActivityQuestionReference[];
  estimatedMinutes: number;
  masteryPct: number;
  completed: boolean;
  completedAt?: number;
}

/** A question's place inside an activity, with its own mastery history. */
export interface ActivityQuestionReference {
  questionId: string;
  /** true when this card is revisiting earlier material */
  isReinforcement?: boolean;
  mastered: boolean;
  attempts: number;
  correctAttempts: number;
  lastAnsweredAt?: number;
}

/**
 * Learning activities the planner can choose from. They are conceptual
 * formats, not a fixed template: a path only includes the ones that fit.
 */
export type ActivityType =
  | "concept-introduction"
  | "understanding-check"
  | "active-recall"
  | "application-exercises"
  | "reinforcement-practice"
  | "integration-challenge"
  | "final-assessment"
  | "review-session"
  | "practice-quiz"
  | "scenario-based"
  | "problem-solving"
  | "concept-mapping"
  | "self-assessment"
  | "mastery-check"
  | "bonus-challenge"
  | "error-analysis";

/** The learning purpose of a stage. */
export type StagePurpose =
  | "concept-exposure"
  | "comprehension"
  | "active-recall"
  | "application"
  | "reinforcement"
  | "integration"
  | "retention"
  | "mastery";

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
  /** Learning Path for progressive study (Phase 2 feature) */
  learningPath?: LearningPath;
  /** Auto-generated Learning Path configuration */
  autoGenerateLearningPath?: boolean;
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
  /** Exact visible passages the authoring AI recommends highlighting. */
  highlightedText?: string[];
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
  feedbackOnNextQuestion: boolean;
  /** only use questions bookmarked in their deck */
  bookmarkedOnly: boolean;
  /** Enable round pauses after N questions */
  roundPauses: boolean;
  /** Questions per round before showing a pause screen */
  questionsPerRound: number;
  /** Auto-advance after N seconds (0 = manual button press only) */
  pauseAutoAdvanceSeconds: number | null;
  /** Pause when a quiz reaches the end of a concept/tag group. */
  pauseAfterSubtopic: boolean;
}

/** Quiz session saved mid-quiz for resuming later */
export interface SavedQuizSession {
  id: string;
  savedAt: number;
  pool: Question[];
  config: QuizConfig;
  answers: AnswerRecord[];
  currentIndex: number;
  /** Remaining quiz hearts; omitted in older saved sessions. */
  hearts?: number;
  totalElapsedMs: number;
  deckIds: string[];
  deckTitles: string[];
  combo: number;
  bestCombo: number;
  xp: number;
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
  /** data URL of a user-uploaded avatar image, stored locally in IndexedDB */
  avatarImage: string | null;
  focusSubjects: string[];
  studyReason: string;
  dailyGoal: number;
  confirmBeforeExit: boolean;
  // appearance
  theme: "dark" | "light";
  /** Shared interior theme for Module and Course reading and print views. */
  documentTheme?: ExamTheme;
  /** legacy palette id; app theming now comes from the built-in light/dark themes */
  colorTheme: string;
  /** legacy custom palette, kept so older backups still restore cleanly */
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
  /** User-managed navigation section order, labels, and visibility. */
  sidebarGroups?: { id: string; label: string; visible: boolean }[];
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
  /** One-way local unlock for the developer dashboard. */
  developerMode: boolean;
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

export interface ReadingHighlight {
  id: string;
  documentType: "module" | "course";
  documentId: string;
  /** Module block id, or Course lesson + block id. */
  locationId: string;
  quote: string;
  prefix: string;
  suffix: string;
  startOffset: number;
  createdAt: number;
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
  savedQuizSessions: SavedQuizSession[];
  templates: PromptTemplate[];
  journal: JournalEntry[];
  /** weekly class schedule */
  timetable: TimetableSlot[];
  /** binder labels: colour-coded tags shared by decks, courses and papers */
  labels: import("./labels").BinderLabel[];
  /** printed exam papers and their sittings */
  papers: import("./papers").PaperRecord[];
  /** persistent text annotations for Module and Course reading */
  readingHighlights: ReadingHighlight[];
}
