import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Play, Timer, Zap, Flame, Target, SkipForward, ArrowRight, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/app-shell";
import { QuizReport } from "@/components/quiz/quiz-report";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  InteractiveQuestion,
  isInteractiveComplete,
} from "@/components/questions/interactive-question";
import { useKnowly } from "@/store/knowly";
import { useCoarsePointer } from "@/hooks/use-mobile";
import { checkAnswer, shuffleArray, TYPE_LABELS } from "@/lib/answers";
import { displayAnswer, isInteractive } from "@/lib/interactive";
import { xpForAnswer, comboMultiplier } from "@/lib/gamification";
import { questionTypes } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { createId } from "@/lib/id";

import type {
  AnswerRecord,
  Difficulty,
  Question,
  QuestionType,
  QuizConfig,
  QuizResult,
  QuizWidgets,
  Settings,
} from "@/lib/types";

type Phase = "setup" | "running" | "report";

export function QuizEngine({ exam = false }: { exam?: boolean } = {}) {
  const { state, updateSettings, recordSession } = useKnowly();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("setup");
  const [config, setConfig] = useState<QuizConfig>(() =>
    exam
      ? {
          ...state.settings.defaultQuizConfig,
          deckIds: [],
          types: [...questionTypes] as QuestionType[],
          difficulties: ["easy", "medium", "hard"],
          shuffle: true,
          perQuestionSeconds: null,
          totalMinutes: 20,
          unlimited: false,
          questionCount: 30,
          passingScore: 60,
          xpEnabled: true,
          instantFeedback: false,
          bookmarkedOnly: false,
        }
      : state.settings.defaultQuizConfig,
  );
  const [pool, setPool] = useState<Question[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);

  const decks = state.decks;
  const widgets = state.settings.quizWidgets;

  const availableQuestions = useMemo(() => {
    const selected = config.deckIds.length
      ? decks.filter((d) => config.deckIds.includes(d.id))
      : decks;
    return selected.flatMap((d) =>
      d.questions
        .filter((q) => config.types.includes(q.type))
        .filter((q) => config.difficulties.includes(q.difficulty))
        .filter((q) => !config.bookmarkedOnly || d.bookmarks.includes(q.id))
        .map((q) => ({ ...q, deckId: d.id })),
    );
  }, [config.bookmarkedOnly, config.deckIds, config.difficulties, config.types, decks]);

  const start = (questions?: Question[]) => {
    const base = questions ?? availableQuestions;
    const ordered = config.shuffle ? shuffleArray(base) : base;
    setPool(config.unlimited ? ordered : ordered.slice(0, config.questionCount));
    setPhase("running");
  };

  if (!decks.length) {
    return (
      <div className="panel grid place-items-center p-16 text-center">
        <p className="font-medium">No decks yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Import a deck to start quizzing.</p>
        <Button className="mt-5" asChild>
          <Link to="/import">Import JSON</Link>
        </Button>
      </div>
    );
  }

  if (phase === "report" && result) {
    return (
      <QuizReport
        result={result}
        exam={exam}
        onOverride={(index) => {
          setResult((r) => {
            if (!r) return r;
            const answers = r.answers.map((a, i) =>
              i === index && !a.correct ? { ...a, correct: true, overridden: true } : a,
            );
            const answered = answers.filter((a) => !a.skipped).length;
            const score = answers.filter((a) => a.correct).length;
            const percentage = answered ? Math.round((score / answered) * 100) : 0;
            return {
              ...r,
              answers,
              score,
              percentage,
              passed: percentage >= r.config.passingScore,
            };
          });
        }}
        onRetry={() => {
          setResult(null);
          start();
        }}
        onRetryIncorrect={() => {
          const wrongIds = result.answers.filter((a) => !a.correct).map((a) => a.questionId);
          const questions = decks
            .flatMap((d) => d.questions)
            .filter((q) => wrongIds.includes(q.id));
          if (!questions.length) return;
          setResult(null);
          start(questions);
        }}
        onHome={() => navigate({ to: "/dashboard" })}
        onBackToSetup={() => {
          setResult(null);
          setPhase("setup");
        }}
      />
    );
  }

  if (phase === "running") {
    return (
      <QuizRun
        pool={pool}
        config={config}
        widgets={widgets}
        settings={state.settings}
        exam={exam}
        onQuit={() => setPhase("setup")}
        onFinish={(answers, durationMs, bestCombo, xpEarned) => {
          const answered = answers.filter((a) => !a.skipped).length;
          const correct = answers.filter((a) => a.correct).length;
          const percentage = answered ? Math.round((correct / answered) * 100) : 0;
          const deckIds = Array.from(new Set(answers.map((a) => a.deckId)));
          const deckTitles = decks.filter((d) => deckIds.includes(d.id)).map((d) => d.title);
          const conceptStats: Record<string, { correct: number; total: number }> = {};
          answers.forEach((a) => {
            if (!a.concept || a.skipped) return;
            const prev = conceptStats[a.concept] ?? { correct: 0, total: 0 };
            conceptStats[a.concept] = {
              correct: prev.correct + (a.correct ? 1 : 0),
              total: prev.total + 1,
            };
          });
          const quizResult: QuizResult = {
            id: createId(),
            createdAt: Date.now(),
            deckIds,
            deckTitles,
            config,
            answers,
            durationMs,
            xpEarned: config.xpEnabled && state.settings.xpEnabled ? xpEarned : 0,
            score: correct,
            total: answers.length,
            percentage,
            passed: percentage >= config.passingScore,
          };
          recordSession({
            mode: "quiz",
            deckIds,
            deckTitles,
            answered,
            correct,
            skipped: answers.filter((a) => a.skipped).length,
            durationMs,
            xpEarned: quizResult.xpEarned,
            bestCombo,
            masteredIds: answers
              .filter((a) => a.correct)
              .reduce<Record<string, string[]>>((acc, a) => {
                acc[a.deckId] = [...(acc[a.deckId] ?? []), a.questionId];
                return acc;
              }, {}),
            conceptStats,
            result: quizResult,
          });
          setResult(quizResult);
          setPhase("report");
        }}
      />
    );
  }

  const toggle = <K extends keyof QuizConfig>(key: K, value: QuizConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={exam ? "Exam Simulator" : "Practice Quiz"}
        description={
          exam
            ? `${availableQuestions.length} question${availableQuestions.length === 1 ? "" : "s"} across your decks. One clock, no feedback until the end, then a graded report.`
            : `${availableQuestions.length} question${availableQuestions.length === 1 ? "" : "s"} match your current filters.`
        }
        action={
          <Button
            size="lg"
            className="min-h-[44px]"
            disabled={!availableQuestions.length}
            onClick={() => start()}
          >
            <Play /> {exam ? "Start exam" : "Start quiz"}
          </Button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="panel space-y-5 p-6">
          <h2 className="text-sm font-semibold">Decks</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => toggle("deckIds", [])}
              className={cn(
                "rounded-full border border-border px-3 py-1.5 text-xs",
                !config.deckIds.length && "border-primary bg-primary/15 text-primary",
              )}
            >
              All decks (mixed)
            </button>
            {decks.map((d) => (
              <button
                key={d.id}
                onClick={() =>
                  toggle(
                    "deckIds",
                    config.deckIds.includes(d.id)
                      ? config.deckIds.filter((x) => x !== d.id)
                      : [...config.deckIds, d.id],
                  )
                }
                className={cn(
                  "rounded-full border border-border px-3 py-1.5 text-xs",
                  config.deckIds.includes(d.id) && "border-primary bg-primary/15 text-primary",
                )}
              >
                {d.title}
              </button>
            ))}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold">Question types</h2>
            <div className="flex flex-wrap gap-2">
              {questionTypes.map((t) => (
                <button
                  key={t}
                  onClick={() =>
                    toggle(
                      "types",
                      config.types.includes(t)
                        ? config.types.filter((x) => x !== t)
                        : [...config.types, t as QuestionType],
                    )
                  }
                  className={cn(
                    "rounded-full border border-border px-3 py-1.5 text-xs",
                    config.types.includes(t) && "border-primary bg-primary/15 text-primary",
                  )}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold">Difficulty</h2>
            <div className="flex flex-wrap gap-2">
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() =>
                    toggle(
                      "difficulties",
                      config.difficulties.includes(d)
                        ? config.difficulties.filter((x) => x !== d)
                        : [...config.difficulties, d],
                    )
                  }
                  className={cn(
                    "rounded-full border border-border px-3 py-1.5 text-xs capitalize",
                    config.difficulties.includes(d) && "border-primary bg-primary/15 text-primary",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="panel space-y-5 p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Settings2 className="size-4 text-primary" /> Session rules
          </h2>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <Label>Question count</Label>
              <Badge variant="secondary">
                {config.unlimited ? "Unlimited" : config.questionCount}
              </Badge>
            </div>
            <Slider
              disabled={config.unlimited}
              value={[config.questionCount]}
              min={5}
              max={100}
              step={5}
              onValueChange={([v]) => toggle("questionCount", v)}
            />
          </div>

          {[
            { key: "unlimited", label: "Unlimited mode", hint: "Use every matching question" },
            { key: "shuffle", label: "Shuffle questions", hint: "Randomize order" },
            { key: "instantFeedback", label: "Instant feedback", hint: "Reveal after each answer" },
            {
              key: "bookmarkedOnly",
              label: "Bookmarked only",
              hint: "Quiz just the questions you starred",
            },
            { key: "xpEnabled", label: "Award XP", hint: "Earn XP and combos" },
          ]
            .filter((row) => !exam || row.key !== "instantFeedback")
            .map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-sm">{row.label}</Label>
                  <p className="text-[11px] text-muted-foreground">{row.hint}</p>
                </div>
                <Switch
                  checked={config[row.key as keyof QuizConfig] as boolean}
                  onCheckedChange={(v) => toggle(row.key as keyof QuizConfig, v as never)}
                />
              </div>
            ))}

          <div className="grid grid-cols-2 gap-3">
            {!exam && (
              <div className="space-y-1.5">
                <Label className="text-xs">Seconds per question</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="off"
                  value={config.perQuestionSeconds ?? ""}
                  onChange={(e) =>
                    toggle("perQuestionSeconds", e.target.value ? Number(e.target.value) : null)
                  }
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Total minutes</Label>
              <Input
                type="number"
                min={0}
                placeholder="off"
                value={config.totalMinutes ?? ""}
                onChange={(e) =>
                  toggle("totalMinutes", e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <Label>Passing score</Label>
              <Badge variant="secondary">{config.passingScore}%</Badge>
            </div>
            <Slider
              value={[config.passingScore]}
              min={40}
              max={100}
              step={5}
              onValueChange={([v]) => toggle("passingScore", v)}
            />
          </div>

          {!exam && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSettings({ defaultQuizConfig: config })}
            >
              Save as my default
            </Button>
          )}
        </section>

        <section className="panel p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold">Visible widgets during the quiz</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(widgets).map(([key, value]) => (
              <button
                key={key}
                onClick={() => updateSettings({ quizWidgets: { ...widgets, [key]: !value } })}
                className={cn(
                  "rounded-full border border-border px-3 py-1.5 text-xs capitalize",
                  value && "border-primary bg-primary/15 text-primary",
                )}
              >
                {key.replace(/([A-Z])/g, " $1")}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function QuizRun({
  pool,
  config,
  widgets,
  settings,
  exam = false,
  onFinish,
  onQuit,
}: {
  pool: Question[];
  config: QuizConfig;
  widgets: QuizWidgets;
  settings: Settings;
  /** exam mode: no hints, exam-styled quit prompt */
  exam?: boolean;
  onFinish: (
    answers: AnswerRecord[],
    durationMs: number,
    bestCombo: number,
    xpEarned: number,
  ) => void;
  onQuit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<null | { correct: boolean }>(null);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [xp, setXp] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [questionElapsed, setQuestionElapsed] = useState(0);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const coarsePointer = useCoarsePointer();
  const started = useRef(Date.now());
  const questionStart = useRef(Date.now());
  const advanceTimer = useRef<number | null>(null);
  const answerInput = useRef<HTMLInputElement>(null);

  const question = pool[index];
  const total = pool.length;
  const multiplier = settings.timerMultiplier || 1;
  const perQuestionSeconds = config.perQuestionSeconds
    ? Math.round(config.perQuestionSeconds * multiplier)
    : null;
  const totalMinutes = config.totalMinutes ? config.totalMinutes * multiplier : null;

  const commit = useCallback(
    (given: string | null, skipped: boolean) => {
      if (!question) return;
      const correct = !skipped && given !== null && checkAnswer(question, given);
      const record: AnswerRecord = {
        questionId: question.id,
        deckId: (question as Question & { deckId?: string }).deckId ?? "",
        type: question.type,
        difficulty: question.difficulty,
        concept: question.concept,
        correct,
        skipped,
        timeMs: Date.now() - questionStart.current,
        given: given ?? undefined,
      };
      const gained = config.xpEnabled ? xpForAnswer(record, combo) : 0;
      const nextCombo = correct ? combo + 1 : 0;
      const nextAnswers = [...answers, record];
      setAnswers(nextAnswers);
      setCombo(nextCombo);
      setBestCombo((b) => Math.max(b, nextCombo));
      setXp((x) => x + gained);

      const advance = () => {
        setFeedback(null);
        setInput("");
        setSelected(null);
        questionStart.current = Date.now();
        setQuestionElapsed(0);
        if (index + 1 >= total) {
          onFinish(
            nextAnswers,
            Date.now() - started.current,
            Math.max(bestCombo, nextCombo),
            xp + gained,
          );
        } else {
          setIndex((i) => i + 1);
        }
      };

      if (config.instantFeedback && !skipped) {
        setFeedback({ correct });
        if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
        advanceTimer.current = window.setTimeout(advance, 1400);
      } else {
        advance();
      }
    },
    [
      answers,
      bestCombo,
      combo,
      config.instantFeedback,
      config.xpEnabled,
      index,
      onFinish,
      question,
      total,
      xp,
    ],
  );

  // timers
  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsed(Date.now() - started.current);
      setQuestionElapsed(Date.now() - questionStart.current);
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  // Cancel a pending instant-feedback advance if the quiz unmounts (e.g. quit)
  // so an abandoned quiz can never be recorded.
  useEffect(
    () => () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    },
    [],
  );

  // Focus the answer box as soon as a question that has one appears, and again
  // after instant feedback re-enables it. Touch devices are skipped so the
  // on-screen keyboard doesn't pop up over every card.
  useEffect(() => {
    if (coarsePointer || feedback) return;
    const el = answerInput.current;
    if (!el || el.disabled) return;
    el.focus({ preventScroll: true });
  }, [coarsePointer, feedback, index]);

  useEffect(() => {
    if (!perQuestionSeconds || feedback) return;
    if (questionElapsed / 1000 >= perQuestionSeconds) commit(null, true);
  }, [commit, perQuestionSeconds, feedback, questionElapsed]);

  useEffect(() => {
    if (!totalMinutes) return;
    if (elapsed / 60000 >= totalMinutes) {
      onFinish(answers, Date.now() - started.current, bestCombo, xp);
    }
  }, [answers, bestCombo, totalMinutes, elapsed, onFinish, xp]);

  if (!question) {
    return (
      <div className="panel grid place-items-center p-16 text-center">
        <p>No questions matched your filters.</p>
        <Button className="mt-4" onClick={onQuit}>
          Back to setup
        </Button>
      </div>
    );
  }

  const answered = answers.filter((a) => !a.skipped).length;
  const correctCount = answers.filter((a) => a.correct).length;
  const accuracy = answered ? Math.round((correctCount / answered) * 100) : 0;

  const stats = [
    widgets.questionNumber && { icon: Target, label: "Question", value: `${index + 1}/${total}` },
    widgets.timer && {
      icon: Timer,
      label: perQuestionSeconds ? "Question timer" : "Elapsed",
      value: perQuestionSeconds
        ? `${Math.max(0, perQuestionSeconds - Math.floor(questionElapsed / 1000))}s`
        : `${Math.floor(elapsed / 60000)}:${String(Math.floor(elapsed / 1000) % 60).padStart(2, "0")}`,
    },
    widgets.accuracy && { icon: Target, label: "Accuracy", value: `${accuracy}%` },
    widgets.score && { icon: Target, label: "Score", value: `${correctCount}` },
    widgets.xp && { icon: Zap, label: "XP", value: `+${xp}` },
    widgets.combo && {
      icon: Flame,
      label: "Combo",
      value: `${combo}x (${comboMultiplier(combo)}×)`,
    },
    widgets.remaining && { icon: ArrowRight, label: "Remaining", value: `${total - index - 1}` },
  ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (settings.confirmBeforeExit && answers.length > 0) {
              setConfirmQuit(true);
              return;
            }
            onQuit();
          }}
        >
          Quit quiz
        </Button>
        <div className="flex gap-2 text-[11px]">
          {widgets.difficulty && (
            <Badge variant="outline" className="capitalize">
              {question.difficulty}
            </Badge>
          )}
          {widgets.concept && question.concept && (
            <Badge variant="secondary">{question.concept}</Badge>
          )}
        </div>
      </div>

      {widgets.progress && settings.showProgressBars && (
        <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(index / total) * 100}%` }}
          />
        </div>
      )}

      {stats.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-surface/70 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="font-display text-sm font-bold">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <article className="panel p-8">
        <Badge variant="outline" className="text-[11px]">
          {TYPE_LABELS[question.type]}
        </Badge>
        <h1 className="mt-4 break-words text-2xl font-semibold leading-snug">
          {question.question}
        </h1>

        {question.hint && settings.showHints && !exam && !feedback && (
          <p className="mt-3 text-xs text-muted-foreground">Hint: {question.hint}</p>
        )}

        {question.type === "multiple-choice" && question.options && (
          <ul className="mt-6 grid gap-2">
            {question.options.map((o) => (
              <li key={o}>
                <button
                  disabled={!!feedback}
                  onClick={() => {
                    setSelected(o);
                    commit(o, false);
                  }}
                  className={cn(
                    "w-full rounded-lg border border-border break-words px-4 py-3 text-left text-sm transition-colors hover:border-primary/60",
                    selected === o && "border-primary bg-primary/10",
                    feedback &&
                      o === question.answer &&
                      "border-success bg-success/10 text-success",
                    feedback &&
                      selected === o &&
                      o !== question.answer &&
                      "border-destructive bg-destructive/10 text-destructive",
                  )}
                >
                  {o}
                </button>
              </li>
            ))}
          </ul>
        )}

        {question.type === "true-false" && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            {["true", "false"].map((o) => (
              <button
                key={o}
                disabled={!!feedback}
                onClick={() => {
                  setSelected(o);
                  commit(o, false);
                }}
                className={cn(
                  "rounded-lg border border-border py-4 text-sm font-medium capitalize transition-colors hover:border-primary/60",
                  feedback &&
                    o === question.answer.toLowerCase() &&
                    "border-success bg-success/10 text-success",
                  feedback &&
                    selected === o &&
                    o !== question.answer.toLowerCase() &&
                    "border-destructive bg-destructive/10 text-destructive",
                )}
              >
                {o}
              </button>
            ))}
          </div>
        )}

        {["fill-blank", "short-answer", "flashcard"].includes(question.type) && (
          <div className="mt-6 space-y-3">
            <Input
              ref={answerInput}
              enterKeyHint="go"
              value={input}
              disabled={!!feedback}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim()) commit(input, false);
              }}
              placeholder="Type your answer and press Enter…"
            />
            <Button
              className="min-h-[44px]"
              disabled={!input.trim() || !!feedback}
              onClick={() => commit(input, false)}
            >
              Submit answer
            </Button>
          </div>
        )}

        {isInteractive(question.type) && (
          <div className="space-y-3">
            <InteractiveQuestion
              question={question}
              value={input}
              onChange={setInput}
              disabled={!!feedback}
              revealed={!!feedback}
            />
            <Button
              className="min-h-[44px]"
              disabled={!!feedback || !isInteractiveComplete(question, input)}
              onClick={() => commit(input, false)}
            >
              Submit answer
            </Button>
          </div>
        )}

        {feedback && (
          <div
            className={cn(
              "mt-6 rounded-xl border p-5",
              feedback.correct
                ? "border-success/40 bg-success/10"
                : "border-destructive/40 bg-destructive/10",
            )}
          >
            <p
              className={cn(
                "text-sm font-semibold",
                feedback.correct ? "text-success" : "text-destructive",
              )}
            >
              {feedback.correct ? "Correct" : `Answer: ${displayAnswer(question)}`}
            </p>
            {question.explanation && settings.showExplanations && (
              <p className="mt-1 text-xs text-muted-foreground">{question.explanation}</p>
            )}
          </div>
        )}

        <div className="mt-8 flex gap-2">
          <Button
            variant="outline"
            className="min-h-[44px]"
            disabled={!!feedback}
            onClick={() => commit(null, true)}
          >
            <SkipForward /> Skip
          </Button>
        </div>
      </article>

      <ConfirmDialog
        open={confirmQuit}
        onOpenChange={setConfirmQuit}
        title="Quit this quiz?"
        description="Your progress in this session will be lost."
        confirmLabel="Quit quiz"
        cancelLabel="Keep going"
        destructive
        onConfirm={onQuit}
      />
    </div>
  );
}
