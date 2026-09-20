import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { ACCENTS, AVATAR_EMOJIS, DEFAULT_PROGRESS, DEFAULT_SETTINGS, DEFAULT_STATE, oceanDeckColor } from "@/lib/defaults";
import { evaluateAchievements, ACHIEVEMENTS } from "@/lib/gamification";
import { dayKey } from "@/lib/answers";
import {
  getColorTheme,
  luminance,
  sanitizePalette,
  themeCssVars,
  THEME_VAR_NAMES,
  type ThemeColors,
} from "@/lib/themes";
import { schedule, type SrsGrade } from "@/lib/srs";
import type {
  AppState,
  Deck,
  Progress,
  Question,
  QuizResult,
  SessionSummary,
  Settings,
  PromptTemplate,
} from "@/lib/types";

const STORAGE_KEY = "studyforge.state.v1";
const HISTORY_LIMIT = 200;
const RESULTS_LIMIT = 50;

function loadPersistedState(): AppState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const state = { ...DEFAULT_STATE, ...parsed } as AppState;
    const accent = ACCENTS.some((item) => item.id === state.settings.accent)
      ? state.settings.accent
      : DEFAULT_SETTINGS.accent;
    const avatarEmoji = AVATAR_EMOJIS.includes(state.settings.avatarEmoji)
      ? state.settings.avatarEmoji
      : DEFAULT_SETTINGS.avatarEmoji;
    return {
      ...state,
      settings: {
        ...DEFAULT_SETTINGS,
        ...state.settings,
        accent,
        avatarEmoji,
        defaultQuizConfig: {
          ...DEFAULT_SETTINGS.defaultQuizConfig,
          ...(state.settings.defaultQuizConfig ?? {}),
        },
      },
      decks: state.decks.map((deck) => ({ ...deck, color: oceanDeckColor(deck.color) })),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

interface Ctx {
  state: AppState;
  hydrated: boolean;
  setState: (updater: (s: AppState) => AppState) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetSettings: () => void;
  addDeck: (deck: Deck) => void;
  addQuestions: (deckId: string, questions: Question[]) => void;
  updateDeck: (id: string, patch: Partial<Deck>) => void;
  deleteDeck: (id: string) => void;
  /** grade one question's spaced-repetition card */
  reviewQuestion: (deckId: string, questionId: string, grade: SrsGrade) => void;
  recordSession: (input: RecordSessionInput) => void;
  saveTemplate: (t: PromptTemplate) => void;
  deleteTemplate: (id: string) => void;
  completeOnboarding: () => void;
  resetAll: () => void;
  exportState: () => string;
  importState: (json: string) => boolean;
}

export interface RecordSessionInput {
  mode: "study" | "quiz";
  deckIds: string[];
  deckTitles: string[];
  answered: number;
  correct: number;
  skipped: number;
  durationMs: number;
  xpEarned: number;
  bestCombo: number;
  masteredIds: Record<string, string[]>;
  conceptStats: Record<string, { correct: number; total: number }>;
  result?: QuizResult;
}

const KnowlyContext = createContext<Ctx | null>(null);

export function KnowlyProvider({ children }: { children: ReactNode }) {
  const [state, setInternal] = useState<AppState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const pendingAchievements = useRef<string[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setInternal(loadPersistedState());
    setHydrated(true);
  }, []);

  const setState = useCallback((updater: (s: AppState) => AppState) => {
    setInternal((prev) => updater(prev));
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current));
      } catch {
        /* quota — ignore */
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated || typeof document === "undefined") return;
    const s = state.settings;
    const root = document.documentElement;
    const preset = getColorTheme(s.colorTheme);
    const palette: ThemeColors | undefined =
      s.colorTheme === "custom" ? sanitizePalette(s.customTheme) : preset?.colors;
    const mode = palette
      ? (preset?.mode ?? (luminance(palette.background) > 0.5 ? "light" : "dark"))
      : s.theme;
    root.classList.toggle("light", mode === "light");
    for (const name of THEME_VAR_NAMES) root.style.removeProperty(name);
    if (palette) {
      const vars = themeCssVars(palette);
      for (const name of Object.keys(vars)) root.style.setProperty(name, vars[name]!);
    }
    root.classList.toggle("contrast-high", s.highContrast);
    root.classList.toggle("colorblind", s.colorblindPalette);
    root.classList.toggle("reduce-motion", s.reducedMotion);
    root.classList.toggle("focus-strong", s.focusIndicators);
    root.dataset.btn = s.buttonSize;
    root.style.setProperty("--font-scale", String(s.fontScale));
    root.style.setProperty("--radius", `${s.radius}rem`);
    root.style.setProperty("--speed", String(s.animationSpeed));
    if (!palette) {
      const accent = ACCENTS.find((a) => a.id === s.accent) ?? ACCENTS[0];
      root.style.setProperty("--primary", accent.value);
      root.style.setProperty("--primary-glow", accent.glow);
      root.style.setProperty("--ring", accent.value);
      root.style.setProperty("--sidebar-primary", accent.value);
    }
  }, [state.settings, hydrated]);

  const flushAchievements = useCallback((progress: Progress, decks: Deck[]) => {
    const unlocked = evaluateAchievements(progress, decks);
    if (!unlocked.length) return progress;
    pendingAchievements.current.push(...unlocked.map((a) => a.id));
    return {
      ...progress,
      unlockedAchievements: [...progress.unlockedAchievements, ...unlocked.map((a) => a.id)],
    };
  }, []);

  useEffect(() => {
    if (!pendingAchievements.current.length || !state.settings.achievementPopups) {
      pendingAchievements.current = [];
      return;
    }
    const ids = [...pendingAchievements.current];
    pendingAchievements.current = [];
    ids.forEach((id, i) => {
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (!a) return;
      window.setTimeout(() => {
        toast.success(`Achievement unlocked — ${a.name}`, { description: a.description });
      }, i * 500);
    });
  }, [state, state.settings.achievementPopups]);

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
                srs: { ...(d.srs ?? {}), [questionId]: schedule(d.srs?.[questionId], grade) },
              }
            : d,
        ),
      }));
    },
    [setState],
  );

  const deleteDeck = useCallback(
    (id: string) => {
      setState((s) => ({ ...s, decks: s.decks.filter((d) => d.id !== id) }));
    },
    [setState],
  );

  const recordSession = useCallback(
    (input: RecordSessionInput) => {
      setState((s) => {
        const today = dayKey();
        const p = s.progress;
        const yesterday = dayKey(Date.now() - 86400000);
        const streak =
          p.lastStudyDay === today
            ? p.streak
            : p.lastStudyDay === yesterday
              ? p.streak + 1
              : 1;
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
          totalIncorrect: p.totalIncorrect + (input.answered - input.correct - input.skipped),
          totalSkipped: p.totalSkipped + input.skipped,
          studyTimeMs: p.studyTimeMs + input.durationMs,
          streak,
          longestStreak: Math.max(p.longestStreak, streak),
          lastStudyDay: today,
          studyDays: {
            ...p.studyDays,
            [today]: (p.studyDays[today] ?? 0) + input.answered,
            ...(hour < 4 ? { __nightowl: 1 } : {}),
            ...(hour >= 4 && hour < 7 ? { __earlybird: 1 } : {}),
          },
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
          id: Math.random().toString(36).slice(2),
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
      updateSettings: (patch) =>
        setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      resetSettings: () => setState((s) => ({ ...s, settings: DEFAULT_SETTINGS })),
      addDeck,
      addQuestions,
      updateDeck,
      deleteDeck,
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
      resetAll: () => {
        setState(() => ({ ...DEFAULT_STATE, onboardingComplete: true }));
      },
      exportState: () => JSON.stringify(state, null, 2),
      importState: (json) => {
        try {
          const parsed = JSON.parse(json) as AppState;
          if (!parsed || typeof parsed !== "object") return false;
          const next = {
            ...DEFAULT_STATE,
            ...parsed,
            settings: {
              ...DEFAULT_SETTINGS,
              ...parsed.settings,
              accent: ACCENTS.some((item) => item.id === parsed.settings?.accent)
                ? parsed.settings.accent
                : DEFAULT_SETTINGS.accent,
              avatarEmoji: AVATAR_EMOJIS.includes(parsed.settings?.avatarEmoji ?? "")
                ? parsed.settings.avatarEmoji
                : DEFAULT_SETTINGS.avatarEmoji,
            },
            decks: (parsed.decks ?? []).map((deck) => ({
              ...deck,
              color: oceanDeckColor(deck.color),
            })),
          };
          setState(() => next);
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
      reviewQuestion,
      recordSession,
    ],
  );

  return <KnowlyContext.Provider value={value}>{children}</KnowlyContext.Provider>;
}

export function useKnowly() {
  const ctx = useContext(KnowlyContext);
  if (!ctx) throw new Error("useKnowly must be used inside KnowlyProvider");
  return ctx;
}
