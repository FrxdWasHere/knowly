import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  ACCENTS,
  AVATAR_EMOJIS,
  DEFAULT_PROGRESS,
  DEFAULT_SETTINGS,
  DEFAULT_STATE,
  STATE_VERSION,
  oceanDeckColor,
} from "@/lib/defaults";
import { evaluateAchievements, ACHIEVEMENTS } from "@/lib/gamification";
import { dayKey } from "@/lib/answers";
import { applyThemeToRoot } from "@/lib/theme-dom";
import { loadWallpaper, saveWallpaper } from "@/lib/wallpaper-store";
import { createId } from "@/lib/id";
import { schedule, DAY_MS, type SrsGrade } from "@/lib/srs";
import type {
  AppState,
  Course,
  CourseAssessmentResult,
  CourseProgress,
  Deck,
  Module,
  ModuleProgress,
  Progress,
  Question,
  QuizResult,
  SessionSummary,
  Settings,
  PromptTemplate,
  TimetableSlot,
} from "@/lib/types";
import type { BinderLabel } from "@/lib/labels";
import type { PaperRecord } from "@/lib/papers";

const STORAGE_KEY = "studyforge.state.v1";
const HISTORY_LIMIT = 200;
const RESULTS_LIMIT = 50;

/**
 * Repairs older persisted progress: earlier versions stored the night-owl and
 * early-bird achievements as `__nightowl` / `__earlybird` keys inside
 * `studyDays`, which polluted per-day statistics. Pull them out into booleans.
 * Idempotent — safe to run on any state.
 */
function normalizeProgress(input: Progress): Progress {
  const studyDays = input.studyDays ?? {};
  const days: Record<string, number> = {};
  for (const [key, value] of Object.entries(studyDays)) {
    if (!key.startsWith("__")) days[key] = value;
  }
  return {
    ...input,
    studyDays: days,
    nightOwl: Boolean(input.nightOwl) || Boolean(studyDays["__nightowl"]),
    earlyBird: Boolean(input.earlyBird) || Boolean(studyDays["__earlybird"]),
  };
}

/** Upgrades a state snapshot by exactly one version. */
type Migration = (state: AppState) => AppState;

/**
 * Oldest-first list of migrations, keyed by the version they upgrade *from*.
 * Saves written before versioning existed are treated as v1.
 */
const MIGRATIONS: Partial<Record<number, Migration>> = {
  // v1 → v2: sentinels moved out of `studyDays` into dedicated booleans.
  1: (state) => ({ ...state, progress: normalizeProgress(state.progress) }),
  // v2 → v3: first-class courses and their learning progress.
  2: (state) => ({
    ...state,
    courses: state.courses ?? [],
    courseProgress: state.courseProgress ?? {},
  }),
  // v3 → v4: timetable, binder labels and the past-paper shelf.
  3: (state) => ({
    ...state,
    timetable: state.timetable ?? [],
    labels: state.labels ?? [],
    papers: state.papers ?? [],
  }),
  // v4 → v5: standalone modules and their progress.
  4: (state) => ({
    ...state,
    modules: state.modules ?? [],
    moduleProgress: state.moduleProgress ?? {},
  }),
};

/** Applies every migration needed to bring `parsed` up to `STATE_VERSION`. */
function migrate(parsed: Partial<AppState>): AppState {
  let state = { ...DEFAULT_STATE, ...parsed } as AppState;
  let version = typeof state.version === "number" ? state.version : 1;
  while (version < STATE_VERSION) {
    const step = MIGRATIONS[version];
    if (step) state = step(state);
    version += 1;
  }
  return { ...state, version: STATE_VERSION };
}

/** Merges defaults, applies migrations, and repairs known field shapes. */
function normalizeState(parsed: Partial<AppState>): AppState {
  const state = migrate(parsed);
  const settings = state.settings ?? DEFAULT_SETTINGS;
  const accent = ACCENTS.some((item) => item.id === settings.accent)
    ? settings.accent
    : DEFAULT_SETTINGS.accent;
  const avatarEmoji = AVATAR_EMOJIS.includes(settings.avatarEmoji)
    ? settings.avatarEmoji
    : DEFAULT_SETTINGS.avatarEmoji;
  return {
    ...state,
    settings: {
      ...DEFAULT_SETTINGS,
      ...settings,
      accent,
      avatarEmoji,
      defaultQuizConfig: {
        ...DEFAULT_SETTINGS.defaultQuizConfig,
        ...(settings.defaultQuizConfig ?? {}),
      },
      srs: { ...DEFAULT_SETTINGS.srs, ...(settings.srs ?? {}) },
    },
    decks: (state.decks ?? []).map((deck) => ({ ...deck, color: oceanDeckColor(deck.color) })),
    courses: state.courses ?? [],
    courseProgress: state.courseProgress ?? {},
    modules: state.modules ?? [],
    moduleProgress: state.moduleProgress ?? {},
    timetable: state.timetable ?? [],
    labels: state.labels ?? [],
    papers: state.papers ?? [],
    progress: normalizeProgress({ ...DEFAULT_PROGRESS, ...state.progress }),
  };
}

function loadPersistedState(): AppState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return normalizeState(JSON.parse(raw) as Partial<AppState>);
  } catch {
    return DEFAULT_STATE;
  }
}

interface Ctx {
  state: AppState;
  hydrated: boolean;
  setState: (updater: (s: AppState) => AppState) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  /** Persist (or clear) the wallpaper. Stored in IndexedDB, not the state blob. */
  setWallpaper: (dataUrl: string | null) => void;
  resetSettings: () => void;
  addDeck: (deck: Deck) => void;
  addQuestions: (deckId: string, questions: Question[]) => void;
  updateDeck: (id: string, patch: Partial<Deck>) => void;
  deleteDeck: (id: string) => void;
  addCourse: (course: Course) => void;
  updateCourse: (id: string, patch: Partial<Course>) => void;
  deleteCourse: (id: string) => void;
  updateCourseProgress: (
    courseId: string,
    updater: (progress: CourseProgress) => CourseProgress,
  ) => void;
  addModule: (module: Module) => void;
  updateModule: (id: string, patch: Partial<Module>) => void;
  deleteModule: (id: string) => void;
  updateModuleProgress: (moduleId: string, updater: (p: ModuleProgress) => ModuleProgress) => void;
  recordModuleQuestion: (moduleId: string, questionId: string, correct: boolean) => void;
  markCourseLesson: (
    courseId: string,
    lessonId: string,
    status: "not-started" | "in-progress" | "completed",
  ) => void;
  recordCourseQuestion: (
    courseId: string,
    lessonId: string,
    questionId: string,
    correct: boolean,
    grade: SrsGrade,
  ) => void;
  recordCourseAssessment: (courseId: string, result: CourseAssessmentResult) => void;
  /** grade one question's spaced-repetition card */
  reviewQuestion: (deckId: string, questionId: string, grade: SrsGrade) => void;
  recordSession: (input: RecordSessionInput) => void;
  saveTemplate: (t: PromptTemplate) => void;
  deleteTemplate: (id: string) => void;
  completeOnboarding: () => void;
  /** weekly timetable */
  upsertSlot: (slot: TimetableSlot) => void;
  deleteSlot: (id: string) => void;
  /** binder labels */
  upsertLabel: (label: BinderLabel) => void;
  deleteLabel: (id: string) => void;
  /** past-paper shelf */
  addPaper: (paper: PaperRecord) => void;
  updatePaper: (id: string, patch: Partial<PaperRecord>) => void;
  deletePaper: (id: string) => void;
  addPaperSitting: (paperId: string, sitting: PaperRecord["sittings"][number]) => void;
  resetAll: () => void;
  exportState: () => string;
  importState: (json: string) => boolean;
}

export interface RecordSessionInput {
  mode: "study" | "quiz";
  deckIds: string[];
  deckTitles: string[];
  /** cards actually answered — excludes skipped cards */
  answered: number;
  correct: number;
  /** cards the learner skipped; disjoint from `answered` */
  skipped: number;
  durationMs: number;
  xpEarned: number;
  bestCombo: number;
  masteredIds: Record<string, string[]>;
  conceptStats: Record<string, { correct: number; total: number }>;
  result?: QuizResult;
}

// Keep one shared context even when this file hot-reloads, so the provider
// and the pages never end up holding two different copies.
const g = globalThis as unknown as { __knowlyCtx?: import("react").Context<Ctx | null> };
const KnowlyContext = (g.__knowlyCtx ??= createContext<Ctx | null>(null));

export function KnowlyProvider({ children }: { children: ReactNode }) {
  const [state, setInternal] = useState<AppState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const seenAchievements = useRef<string[] | null>(null);
  const saveErrorShown = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    // Parse + swap the persisted blob as a transition so the first paint and
    // the first interactions stay responsive even with a large study history.
    const persisted = loadPersistedState();
    startTransition(() => {
      setInternal(persisted);
    });
    let cancelled = false;
    void (async () => {
      // Migrate a legacy inline wallpaper out of the blob, otherwise hydrate
      // the wallpaper from its own store.
      const legacy = persisted.settings.wallpaper;
      if (legacy) {
        await saveWallpaper(legacy);
      } else {
        const stored = await loadWallpaper();
        if (!cancelled && stored) {
          setInternal((s) => ({ ...s, settings: { ...s.settings, wallpaper: stored } }));
        }
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setState = useCallback((updater: (s: AppState) => AppState) => {
    setInternal((prev) => updater(prev));
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      try {
        // The wallpaper is persisted separately (IndexedDB) so a large image
        // can never exhaust the state blob's quota.
        const snapshot: AppState = {
          ...stateRef.current,
          settings: { ...stateRef.current.settings, wallpaper: null },
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        saveErrorShown.current = false;
      } catch {
        if (!saveErrorShown.current) {
          saveErrorShown.current = true;
          toast.error("Couldn't save your work — Knowly is running out of space", {
            id: "storage-full",
            description:
              "Save a backup of your library first, then remove large wallpapers to free up room.",
          });
        }
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    applyThemeToRoot(state.settings);
  }, [state.settings, hydrated]);

  /** Pure: returns progress with any newly-earned achievements unlocked. */
  const flushAchievements = useCallback((progress: Progress, decks: Deck[]): Progress => {
    const unlocked = evaluateAchievements(progress, decks);
    if (!unlocked.length) return progress;
    return {
      ...progress,
      unlockedAchievements: [...progress.unlockedAchievements, ...unlocked.map((a) => a.id)],
    };
  }, []);

  // Announce achievements that appear after this session has hydrated. The ref
  // seeds a baseline so already-unlocked achievements aren't re-announced.
  useEffect(() => {
    if (!hydrated) return;
    const unlockedIds = state.progress.unlockedAchievements;
    if (seenAchievements.current === null) {
      seenAchievements.current = unlockedIds;
      return;
    }
    const previous = seenAchievements.current;
    seenAchievements.current = unlockedIds;
    if (!state.settings.achievementPopups) return;
    const fresh = [...new Set(unlockedIds.filter((id) => !previous.includes(id)))];
    fresh.forEach((id, i) => {
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (!a) return;
      window.setTimeout(() => {
        toast.success(`Achievement unlocked — ${a.name}`, {
          id: `achievement-${a.id}`,
          description: a.description,
        });
      }, i * 500);
    });
  }, [hydrated, state.progress.unlockedAchievements, state.settings.achievementPopups]);

  const addDeck = useCallback(
    (deck: Deck) => {
      setState((s) => {
        const decks = [deck, ...s.decks];
        return { ...s, decks, progress: flushAchievements(s.progress, decks) };
      });
    },
    [flushAchievements, setState],
  );

  const addQuestions = useCallback(
    (deckId: string, questions: Question[]) => {
      setState((s) => {
        const decks = s.decks.map((d) => {
          if (d.id !== deckId) return d;
          const existing = new Set(d.questions.map((q) => q.id));
          const fresh = questions.filter((q) => !existing.has(q.id));
          return { ...d, questions: [...d.questions, ...fresh] };
        });
        return { ...s, decks, progress: flushAchievements(s.progress, decks) };
      });
    },
    [flushAchievements, setState],
  );

  const updateDeck = useCallback(
    (id: string, patch: Partial<Deck>) => {
      setState((s) => ({
        ...s,
        decks: s.decks.map((d) => (d.id === id ? { ...d, ...patch } : d)),
      }));
    },
    [setState],
  );

  const reviewQuestion = useCallback(
    (deckId: string, questionId: string, grade: SrsGrade) => {
      setState((s) => ({
        ...s,
        decks: s.decks.map((d) =>
          d.id === deckId
            ? {
                ...d,
                lastStudiedAt: Date.now(),
                srs: {
                  ...(d.srs ?? {}),
                  [questionId]: schedule(d.srs?.[questionId], grade, Date.now(), s.settings.srs),
                },
              }
            : d,
        ),
      }));
    },
    [setState],
  );

  const deleteDeck = useCallback(
    (id: string) => {
      setState((s) => ({
        ...s,
        decks: s.decks.filter((d) => d.id !== id),
        courses: s.courses.map((course) => ({
          ...course,
          linkedDeckIds: course.linkedDeckIds.filter((deckId) => deckId !== id),
          modules: course.modules.map((module) => ({
            ...module,
            linkedDeckIds: module.linkedDeckIds.filter((deckId) => deckId !== id),
            lessons: module.lessons.map((lesson) => ({
              ...lesson,
              linkedDeckIds: lesson.linkedDeckIds.filter((deckId) => deckId !== id),
            })),
          })),
        })),
        modules: s.modules.map((m) => ({
          ...m,
          linkedDeckIds: m.linkedDeckIds.filter((deckId) => deckId !== id),
        })),
      }));
    },
    [setState],
  );

  /** Returns existing course progress or a fresh record. */
  const ensureProgress = (state: AppState, courseId: string): CourseProgress =>
    state.courseProgress[courseId] ?? {
      courseId,
      startedAt: Date.now(),
      lessons: {},
      questionStats: {},
      assessments: {},
    };

  const addCourse = useCallback(
    (course: Course) => {
      setState((s) => ({
        ...s,
        courses: [course, ...s.courses.filter((c) => c.id !== course.id)],
        courseProgress: {
          ...s.courseProgress,
          [course.id]: ensureProgress(s, course.id),
        },
      }));
    },
    [setState],
  );

  const updateCourse = useCallback(
    (id: string, patch: Partial<Course>) => {
      setState((s) => ({
        ...s,
        courses: s.courses.map((course) =>
          course.id === id ? { ...course, ...patch, updatedAt: Date.now() } : course,
        ),
      }));
    },
    [setState],
  );

  const addModule = useCallback(
    (module: Module) => {
      setState((s) => ({
        ...s,
        modules: [module, ...s.modules.filter((m) => m.id !== module.id)],
        moduleProgress: {
          ...s.moduleProgress,
          [module.id]: s.moduleProgress[module.id] ?? {
            moduleId: module.id,
            status: "not-started",
            openedAt: Date.now(),
            questionStats: {},
          },
        },
      }));
    },
    [setState],
  );

  const updateModule = useCallback(
    (id: string, patch: Partial<Module>) => {
      setState((s) => ({
        ...s,
        modules: s.modules.map((m) =>
          m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m,
        ),
      }));
    },
    [setState],
  );

  const deleteModule = useCallback(
    (id: string) => {
      setState((s) => {
        const { [id]: _removed, ...rest } = s.moduleProgress;
        return {
          ...s,
          modules: s.modules.filter((m) => m.id !== id),
          moduleProgress: rest,
          // peel from decks that linked to it
          decks: s.decks.map((d) => ({
            ...d,
            linkedModuleIds: (d.linkedModuleIds ?? []).filter((x) => x !== id),
          })),
        };
      });
    },
    [setState],
  );

  const updateModuleProgress = useCallback(
    (moduleId: string, updater: (p: ModuleProgress) => ModuleProgress) => {
      setState((s) => {
        const current = s.moduleProgress[moduleId] ?? {
          moduleId,
          status: "not-started",
          openedAt: Date.now(),
          questionStats: {},
        };
        const next = updater(current);
        return { ...s, moduleProgress: { ...s.moduleProgress, [moduleId]: next } };
      });
    },
    [setState],
  );

  const recordModuleQuestion = useCallback(
    (moduleId: string, questionId: string, correct: boolean) => {
      setState((s) => {
        const current = s.moduleProgress[moduleId] ?? {
          moduleId,
          status: "not-started",
          openedAt: Date.now(),
          questionStats: {},
        };
        const prev = current.questionStats[questionId] ?? {
          attempts: 0,
          correct: 0,
          lastAnsweredAt: 0,
        };
        const next: ModuleProgress = {
          ...current,
          questionStats: {
            ...current.questionStats,
            [questionId]: {
              attempts: prev.attempts + 1,
              correct: prev.correct + (correct ? 1 : 0),
              lastAnsweredAt: Date.now(),
            },
          },
        };
        return { ...s, moduleProgress: { ...s.moduleProgress, [moduleId]: next } };
      });
    },
    [setState],
  );

  const upsertSlot = useCallback(
    (slot: TimetableSlot) => {
      setState((s) => ({
        ...s,
        timetable: s.timetable.some((x) => x.id === slot.id)
          ? s.timetable.map((x) => (x.id === slot.id ? slot : x))
          : [...s.timetable, slot],
      }));
    },
    [setState],
  );

  const deleteSlot = useCallback(
    (id: string) => {
      setState((s) => ({ ...s, timetable: s.timetable.filter((x) => x.id !== id) }));
    },
    [setState],
  );

  const upsertLabel = useCallback(
    (label: BinderLabel) => {
      setState((s) => ({
        ...s,
        labels: s.labels.some((x) => x.id === label.id)
          ? s.labels.map((x) => (x.id === label.id ? label : x))
          : [...s.labels, label],
      }));
    },
    [setState],
  );

  const deleteLabel = useCallback(
    (id: string) => {
      setState((s) => ({
        ...s,
        labels: s.labels.filter((x) => x.id !== id),
        // peel the label off everything it was stuck to
        decks: s.decks.map((d) => ({
          ...d,
          labelIds: (d.labelIds ?? []).filter((x) => x !== id),
        })),
        courses: s.courses.map((c) => ({
          ...c,
          labelIds: (c.labelIds ?? []).filter((x) => x !== id),
        })),
        papers: s.papers.map((p) => ({
          ...p,
          labelIds: (p.labelIds ?? []).filter((x) => x !== id),
        })),
      }));
    },
    [setState],
  );

  const addPaper = useCallback(
    (paper: PaperRecord) => {
      setState((s) => ({
        ...s,
        papers: [paper, ...s.papers.filter((p) => p.id !== paper.id)],
      }));
    },
    [setState],
  );

  const updatePaper = useCallback(
    (id: string, patch: Partial<PaperRecord>) => {
      setState((s) => ({
        ...s,
        papers: s.papers.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
    },
    [setState],
  );

  const deletePaper = useCallback(
    (id: string) => {
      setState((s) => ({ ...s, papers: s.papers.filter((p) => p.id !== id) }));
    },
    [setState],
  );

  const addPaperSitting = useCallback(
    (paperId: string, sitting: PaperRecord["sittings"][number]) => {
      setState((s) => ({
        ...s,
        papers: s.papers.map((p) =>
          p.id === paperId ? { ...p, sittings: [sitting, ...p.sittings] } : p,
        ),
      }));
    },
    [setState],
  );

  const deleteCourse = useCallback(
    (id: string) => {
      setState((s) => {
        const { [id]: _removed, ...rest } = s.courseProgress;
        return {
          ...s,
          courses: s.courses.filter((course) => course.id !== id),
          courseProgress: rest,
        };
      });
    },
    [setState],
  );

  const updateCourseProgress = useCallback(
    (courseId: string, updater: (progress: CourseProgress) => CourseProgress) => {
      setState((s) => {
        const current = ensureProgress(s, courseId);
        const next = updater(current);
        return {
          ...s,
          courseProgress: {
            ...s.courseProgress,
            [courseId]: { ...next, lastStudiedAt: Date.now() },
          },
        };
      });
    },
    [setState],
  );

  const markCourseLesson = useCallback(
    (courseId: string, lessonId: string, status: "not-started" | "in-progress" | "completed") => {
      setState((s) => {
        const progress = ensureProgress(s, courseId);
        const existing = progress.lessons[lessonId];
        const now = Date.now();
        const lessonProgress = {
          status,
          openedAt: existing?.openedAt ?? now,
          completedAt: status === "completed" ? (existing?.completedAt ?? now) : undefined,
          srs: existing?.srs ?? {},
          notes: existing?.notes,
          bookmarks: existing?.bookmarks ?? [],
        };
        return {
          ...s,
          courseProgress: {
            ...s.courseProgress,
            [courseId]: {
              ...progress,
              lastStudiedAt: now,
              lessons: { ...progress.lessons, [lessonId]: lessonProgress },
            },
          },
        };
      });
    },
    [setState],
  );

  const recordCourseQuestion = useCallback(
    (courseId: string, lessonId: string, questionId: string, correct: boolean, grade: SrsGrade) => {
      setState((s) => {
        const progress = ensureProgress(s, courseId);
        const existing = progress.lessons[lessonId];
        const now = Date.now();
        const stats = progress.questionStats[questionId] ?? {
          attempts: 0,
          correct: 0,
          lastSeen: now,
        };
        return {
          ...s,
          courseProgress: {
            ...s.courseProgress,
            [courseId]: {
              ...progress,
              lastStudiedAt: now,
              lessons: {
                ...progress.lessons,
                [lessonId]: {
                  status: existing?.status === "completed" ? "completed" : "in-progress",
                  openedAt: existing?.openedAt ?? now,
                  completedAt: existing?.completedAt,
                  srs: {
                    ...(existing?.srs ?? {}),
                    [questionId]: schedule(existing?.srs?.[questionId], grade, now, s.settings.srs),
                  },
                  notes: existing?.notes,
                  bookmarks: existing?.bookmarks ?? [],
                },
              },
              questionStats: {
                ...progress.questionStats,
                [questionId]: {
                  attempts: stats.attempts + 1,
                  correct: stats.correct + (correct ? 1 : 0),
                  lastSeen: now,
                },
              },
            },
          },
        };
      });
    },
    [setState],
  );

  const recordCourseAssessment = useCallback(
    (courseId: string, result: CourseAssessmentResult) => {
      setState((s) => {
        const progress = ensureProgress(s, courseId);
        const attempts = progress.assessments[result.assessmentId] ?? [];
        return {
          ...s,
          courseProgress: {
            ...s.courseProgress,
            [courseId]: {
              ...progress,
              lastStudiedAt: Date.now(),
              assessments: {
                ...progress.assessments,
                [result.assessmentId]: [result, ...attempts].slice(0, 20),
              },
            },
          },
        };
      });
    },
    [setState],
  );

  const recordSession = useCallback(
    (input: RecordSessionInput) => {
      setState((s) => {
        const today = dayKey();
        const p = s.progress;
        const yesterday = dayKey(Date.now() - DAY_MS);
        const streak =
          p.lastStudyDay === today ? p.streak : p.lastStudyDay === yesterday ? p.streak + 1 : 1;
        const hour = new Date().getHours();
        const conceptStats = { ...p.conceptStats };
        for (const [k, v] of Object.entries(input.conceptStats)) {
          const prev = conceptStats[k] ?? { correct: 0, total: 0 };
          conceptStats[k] = { correct: prev.correct + v.correct, total: prev.total + v.total };
        }
        const accuracy = input.answered ? (input.correct / input.answered) * 100 : 0;

        let progress: Progress = {
          ...p,
          xp: p.xp + input.xpEarned,
          lifetimeXp: p.lifetimeXp + input.xpEarned,
          totalAnswered: p.totalAnswered + input.answered,
          totalCorrect: p.totalCorrect + input.correct,
          // `answered` already excludes skipped cards, so incorrect is simply the remainder.
          totalIncorrect: p.totalIncorrect + (input.answered - input.correct),
          totalSkipped: p.totalSkipped + input.skipped,
          studyTimeMs: p.studyTimeMs + input.durationMs,
          streak,
          longestStreak: Math.max(p.longestStreak, streak),
          lastStudyDay: today,
          studyDays: {
            ...p.studyDays,
            [today]: (p.studyDays[today] ?? 0) + input.answered,
          },
          nightOwl: p.nightOwl || hour < 4,
          earlyBird: p.earlyBird || (hour >= 4 && hour < 7),
          quizzesCompleted: p.quizzesCompleted + (input.mode === "quiz" ? 1 : 0),
          perfectQuizzes:
            p.perfectQuizzes +
            (input.mode === "quiz" && input.answered > 0 && input.correct === input.answered
              ? 1
              : 0),
          bestAccuracy: Math.max(p.bestAccuracy, accuracy),
          bestCombo: Math.max(p.bestCombo, input.bestCombo),
          conceptStats,
        };

        const now = Date.now();
        const decks = s.decks.map((d) => {
          const mastered = input.masteredIds[d.id];
          if (!mastered && !input.deckIds.includes(d.id)) return d;
          return {
            ...d,
            lastStudiedAt: now,
            masteredIds: Array.from(new Set([...d.masteredIds, ...(mastered ?? [])])),
          };
        });

        progress = flushAchievements(progress, decks);

        const summary: SessionSummary = {
          id: createId(),
          date: now,
          mode: input.mode,
          deckTitles: input.deckTitles,
          answered: input.answered,
          correct: input.correct,
          skipped: input.skipped,
          durationMs: input.durationMs,
          xpEarned: input.xpEarned,
          percentage: Math.round(accuracy),
        };

        return {
          ...s,
          decks,
          progress,
          history: [summary, ...s.history].slice(0, HISTORY_LIMIT),
          results: input.result ? [input.result, ...s.results].slice(0, RESULTS_LIMIT) : s.results,
        };
      });
    },
    [flushAchievements, setState],
  );

  const value = useMemo<Ctx>(
    () => ({
      state,
      hydrated,
      setState,
      updateSettings: (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      setWallpaper: (dataUrl) => {
        setState((s) => ({ ...s, settings: { ...s.settings, wallpaper: dataUrl } }));
        void saveWallpaper(dataUrl);
      },
      resetSettings: () => {
        setState((s) => ({ ...s, settings: DEFAULT_SETTINGS }));
        void saveWallpaper(null);
      },
      addDeck,
      addQuestions,
      updateDeck,
      deleteDeck,
      addCourse,
      updateCourse,
      deleteCourse,
      updateCourseProgress,
      addModule,
      updateModule,
      deleteModule,
      updateModuleProgress,
      recordModuleQuestion,
      markCourseLesson,
      recordCourseQuestion,
      recordCourseAssessment,
      reviewQuestion,
      recordSession,
      saveTemplate: (t) =>
        setState((s) => ({
          ...s,
          templates: [t, ...s.templates.filter((x) => x.id !== t.id)],
        })),
      deleteTemplate: (id) =>
        setState((s) => ({ ...s, templates: s.templates.filter((t) => t.id !== id) })),
      completeOnboarding: () => setState((s) => ({ ...s, onboardingComplete: true })),
      upsertSlot,
      deleteSlot,
      upsertLabel,
      deleteLabel,
      addPaper,
      updatePaper,
      deletePaper,
      addPaperSitting,
      resetAll: () => {
        setState(() => ({ ...DEFAULT_STATE, onboardingComplete: true }));
        void saveWallpaper(null);
      },
      exportState: () => JSON.stringify(state, null, 2),
      importState: (json) => {
        try {
          const parsed = JSON.parse(json) as Partial<AppState> | null;
          if (!parsed || typeof parsed !== "object") return false;
          const next = normalizeState(parsed);
          setState(() => next);
          void saveWallpaper(next.settings.wallpaper ?? null);
          return true;
        } catch {
          return false;
        }
      },
    }),
    [
      state,
      hydrated,
      setState,
      addDeck,
      addQuestions,
      updateDeck,
      deleteDeck,
      addCourse,
      updateCourse,
      deleteCourse,
      updateCourseProgress,
      addModule,
      updateModule,
      deleteModule,
      updateModuleProgress,
      recordModuleQuestion,
      markCourseLesson,
      recordCourseQuestion,
      recordCourseAssessment,
      reviewQuestion,
      recordSession,
      upsertSlot,
      deleteSlot,
      upsertLabel,
      deleteLabel,
      addPaper,
      updatePaper,
      deletePaper,
      addPaperSitting,
    ],
  );

  return <KnowlyContext.Provider value={value}>{children}</KnowlyContext.Provider>;
}

export function useKnowly() {
  const ctx = useContext(KnowlyContext);
  if (!ctx) throw new Error("useKnowly must be used inside KnowlyProvider");
  return ctx;
}
