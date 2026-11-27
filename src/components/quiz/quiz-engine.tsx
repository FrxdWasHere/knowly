import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Play,
  Timer,
  Zap,
  Flame,
  Target,
  SkipForward,
  ArrowRight,
  Settings2,
  Trash2,
  Check,
  X,
  Bookmark,
  Eye,
  GraduationCap,
  Heart,
  Lightbulb,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/app-shell";
import { QuizReport } from "@/components/quiz/quiz-report";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  InteractiveQuestion,
  isInteractiveComplete,
} from "@/components/questions/interactive-question";
import { QuestionRationales } from "@/components/questions/question-rationales";
import { QuestionTutorPanel } from "@/components/questions/question-tutor-panel";
import { MathKeypad, MathText } from "@/components/math/math-text";
import { useKnowly } from "@/store/knowly";
import { useCoarsePointer } from "@/hooks/use-mobile";
import { checkAnswer, questionFeedbackExplanation, shuffleArray, TYPE_LABELS } from "@/lib/answers";
import { displayAnswer, isInteractive, parseMultipleSelect } from "@/lib/interactive";
import { xpForAnswer, comboMultiplier } from "@/lib/gamification";
import { questionTypes } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { createId } from "@/lib/id";
import { openImportPanel } from "@/lib/import-panel";
import {
  groupQuestionsBySubtopic,
  HEART_COST_XP,
  MAX_HEARTS,
  questionSubtopicKey,
  questionSubtopicTitle,
} from "@/lib/rounds";

import type {
  AnswerRecord,
  Deck,
  Difficulty,
  Question,
  QuestionType,
  QuizConfig,
  QuizResult,
  SavedQuizSession,
  QuizWidgets,
  Settings,
} from "@/lib/types";

type Phase = "setup" | "running" | "report";

type QuizFeedback = {
  question: Question;
  correct: boolean;
  skipped: boolean;
  given?: string;
};

export function QuizEngine({
  exam = false,
  initialDeckId,
  lockedDeckId,
}: { exam?: boolean; initialDeckId?: string; lockedDeckId?: string } = {}) {
  const {
    state,
    updateDeck,
    updateSettings,
    recordSession,
    saveQuizSession,
    deleteSavedQuizSession,
    spendXp,
  } = useKnowly();
  const navigate = useNavigate();
  const returnHome = () => {
    if (lockedDeckId?.startsWith("shared-")) {
      void navigate({ to: "/decks/$deckId", params: { deckId: lockedDeckId } });
      return;
    }
    void navigate({ to: "/dashboard" });
  };
  const visibleSavedSessions = lockedDeckId
    ? state.savedQuizSessions.filter((session) => session.deckIds.includes(lockedDeckId))
    : state.savedQuizSessions;
  const [phase, setPhase] = useState<Phase>("setup");
  const [config, setConfig] = useState<QuizConfig>(() =>
    exam
      ? {
          ...state.settings.defaultQuizConfig,
          deckIds: initialDeckId ? [initialDeckId] : [],
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
          feedbackOnNextQuestion: false,
          bookmarkedOnly: false,
          roundPauses: false,
          questionsPerRound: 10,
          pauseAutoAdvanceSeconds: null,
          pauseAfterSubtopic: false,
        }
      : {
          ...state.settings.defaultQuizConfig,
          ...(initialDeckId ? { deckIds: [initialDeckId] } : {}),
        },
  );

  const [pool, setPool] = useState<Question[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [resumeSession, setResumeSession] = useState<SavedQuizSession | null>(null);

  const decks = state.decks;
  const widgets = state.settings.quizWidgets;
  const deckSubjects = useMemo(
    () => new Map(decks.map((deck) => [deck.id, deck.subject])),
    [decks],
  );

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
    const ordered = config.pauseAfterSubtopic
      ? groupQuestionsBySubtopic(base, deckSubjects, config.shuffle)
      : config.shuffle
        ? shuffleArray(base)
        : base;
    setResumeSession(null);
    setPool(config.unlimited ? ordered : ordered.slice(0, config.questionCount));
    setPhase("running");
  };

  const resume = (session: SavedQuizSession) => {
    setConfig(session.config);
    setResumeSession(session);
    setPool(session.pool);
    setPhase("running");
  };

  if (!decks.length && !state.savedQuizSessions.length) {
    return (
      <div className="panel grid place-items-center p-16 text-center">
        <p className="font-medium">No decks yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Import a deck to start quizzing.</p>
        <Button className="mt-5" onClick={() => openImportPanel()}>
          Bring in a deck
        </Button>
      </div>
    );
  }

  if (phase === "report" && result) {
    return (
      <QuizReport
        result={result}
        questions={pool}
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
            .filter((deck) => !lockedDeckId || deck.id === lockedDeckId)
            .flatMap((d) => d.questions.map((q) => ({ ...q, deckId: d.id })))
            .filter((q) => wrongIds.includes(q.id));
          if (!questions.length) return;
          setResult(null);
          start(questions);
        }}
        onHome={returnHome}
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
        decks={decks}
        updateDeck={updateDeck}
        config={config}
        initialSession={resumeSession}
        widgets={widgets}
        settings={state.settings}
        xpBalance={state.progress.xp}
        spendXp={spendXp}
        exam={exam}
        mathMode={(() => {
          const selected = config.deckIds.length
            ? decks.filter((d) => config.deckIds.includes(d.id))
            : decks;
          const poolIds = new Set(pool.map((q) => (q as { deckId?: string }).deckId));
          return selected.some(
            (d) => (d.isSTEM || d.needsEquations) && (!poolIds.size || poolIds.has(d.id)),
          );
        })()}
        onQuit={() => setPhase("setup")}
        onSaveAndExit={(session) => {
          const deckIds = Array.from(
            new Set(
              session.pool
                .map((q) => (q as Question & { deckId?: string }).deckId)
                .filter((id): id is string => Boolean(id)),
            ),
          );
          const deckTitles = decks.filter((d) => deckIds.includes(d.id)).map((d) => d.title);
          saveQuizSession({
            ...session,
            id: resumeSession?.id ?? createId(),
            savedAt: Date.now(),
            deckIds,
            deckTitles,
          });
          setResumeSession(null);
          if (lockedDeckId?.startsWith("shared-")) {
            navigate({ to: "/decks/$deckId", params: { deckId: lockedDeckId } });
          } else {
            navigate({ to: "/decks" });
          }
        }}
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
          if (resumeSession) deleteSavedQuizSession(resumeSession.id);
          setResumeSession(null);
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

      {!exam && visibleSavedSessions.length > 0 && (
        <section className="panel mb-6 space-y-3 p-5">
          <h2 className="text-sm font-semibold">Saved quizzes</h2>
          {visibleSavedSessions.map((session) => (
            <div
              key={session.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div>
                <p className="text-sm font-medium">
                  {session.deckTitles.join(" · ") || "Mixed decks"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session.answers.length} of {session.pool.length} questions · Saved{" "}
                  {new Date(session.savedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => resume(session)}>
                  <Play /> Resume
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete saved quiz"
                  onClick={() => deleteSavedQuizSession(session.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="panel space-y-5 p-6">
          <h2 className="text-sm font-semibold">Decks</h2>
          {lockedDeckId ? (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
              This session is limited to{" "}
              <span className="font-semibold">
                {decks.find((deck) => deck.id === lockedDeckId)?.title ?? "this deck"}
              </span>
            </p>
          ) : (
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
          )}

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
            <Label>Question count</Label>
            <Input
              disabled={config.unlimited}
              type="number"
              min={1}
              max={1000}
              value={config.questionCount}
              onChange={(e) => {
                const val = e.target.value ? Math.max(1, parseInt(e.target.value, 10)) : 1;
                toggle("questionCount", val);
              }}
            />
          </div>

          {[
            { key: "unlimited", label: "Unlimited mode", hint: "Use every matching question" },
            { key: "shuffle", label: "Shuffle questions", hint: "Randomize order" },
            {
              key: "instantFeedback",
              label: "Instant feedback",
              hint: "Pause briefly to reveal each answer",
            },
            {
              key: "feedbackOnNextQuestion",
              label: "Feedback on next question",
              hint: "Advance immediately; show the result while answering the next question",
            },
            {
              key: "bookmarkedOnly",
              label: "Bookmarked only",
              hint: "Quiz just the questions you starred",
            },
            { key: "xpEnabled", label: "Award XP", hint: "Earn XP and combos" },
          ]
            .filter(
              (row) =>
                !exam || (row.key !== "instantFeedback" && row.key !== "feedbackOnNextQuestion"),
            )
            .map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-sm">{row.label}</Label>
                  <p className="text-[11px] text-muted-foreground">{row.hint}</p>
                </div>
                <Switch
                  checked={config[row.key as keyof QuizConfig] as boolean}
                  onCheckedChange={(v) => {
                    if (v && row.key === "instantFeedback") {
                      setConfig((current) => ({
                        ...current,
                        instantFeedback: true,
                        feedbackOnNextQuestion: false,
                      }));
                    } else if (v && row.key === "feedbackOnNextQuestion") {
                      setConfig((current) => ({
                        ...current,
                        instantFeedback: false,
                        feedbackOnNextQuestion: true,
                      }));
                    } else {
                      toggle(row.key as keyof QuizConfig, v as never);
                    }
                  }}
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
            <div className="space-y-3 rounded-xl border border-border bg-surface/50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-sm">Round pauses</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Take a break every N questions
                  </p>
                </div>
                <Switch
                  checked={config.roundPauses}
                  onCheckedChange={(v) => toggle("roundPauses", v)}
                />
              </div>

              {config.roundPauses && (
                <div className="space-y-3 border-t border-border pt-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Questions per round</Label>
                    <Input
                      type="number"
                      min={2}
                      max={100}
                      value={config.questionsPerRound}
                      onChange={(e) => {
                        const val = e.target.value ? Math.max(2, parseInt(e.target.value, 10)) : 10;
                        toggle("questionsPerRound", val);
                      }}
                    />
                  </div>
                </div>
              )}

              {(config.roundPauses || config.pauseAfterSubtopic) && (
                <div className="space-y-1.5 border-t border-border pt-3">
                  <Label className="text-xs">
                    Auto-advance after (seconds, leave empty for manual)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="off"
                    value={config.pauseAutoAdvanceSeconds ?? ""}
                    onChange={(e) =>
                      toggle(
                        "pauseAutoAdvanceSeconds",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
                <div>
                  <Label className="text-sm">Pause after each subtopic</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Finish each concept or tag before pausing. Shuffle stays within each group.
                  </p>
                </div>
                <Switch
                  checked={config.pauseAfterSubtopic}
                  onCheckedChange={(value) => toggle("pauseAfterSubtopic", value)}
                />
              </div>
            </div>
          )}

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

function QuizFeedbackPanel({
  feedback,
  previousQuestion = false,
  showExplanation = true,
}: {
  feedback: QuizFeedback;
  previousQuestion?: boolean;
  showExplanation?: boolean;
}) {
  const status = feedback.correct ? "Correct" : feedback.skipped ? "Skipped" : "Not quite";
  const explanation = questionFeedbackExplanation(
    feedback.question,
    feedback.given,
    feedback.correct,
  );
  const explanationLabel = feedback.skipped
    ? "Answer explanation"
    : feedback.question.type === "multiple-select"
      ? feedback.correct
        ? "Why these options are correct"
        : "Why this selection is incorrect"
      : feedback.question.type === "multiple-choice" || feedback.question.type === "true-false"
        ? feedback.correct
          ? "Why this option is correct"
          : "Why this option is incorrect"
        : feedback.correct
          ? "Why this answer is correct"
          : "Common misconception";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        previousQuestion ? "mb-6 anim-fade-up" : "mt-6",
        "overflow-hidden rounded-xl border shadow-sm",
        feedback.correct
          ? "border-success/30 bg-success/5"
          : "border-destructive/30 bg-destructive/5",
      )}
    >
      <div
        className={cn(
          "flex gap-3 border-l-4 p-4 sm:gap-4 sm:p-5",
          feedback.correct ? "border-success" : "border-destructive",
        )}
      >
        <div
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg",
            feedback.correct ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
          )}
        >
          {feedback.correct ? (
            <Check aria-hidden="true" className="size-4" />
          ) : feedback.skipped ? (
            <SkipForward aria-hidden="true" className="size-4" />
          ) : (
            <X aria-hidden="true" className="size-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {previousQuestion && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Previous question
              </span>
            )}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                feedback.correct
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {status}
            </span>
          </div>

          {previousQuestion && (
            <p className="mt-1.5 break-words text-sm font-medium leading-relaxed">
              <MathText text={feedback.question.question} />
            </p>
          )}

          {!feedback.correct && (
            <div
              className={cn(
                "flex flex-wrap gap-x-4 gap-y-1 text-xs",
                previousQuestion ? "mt-2" : "mt-1",
              )}
            >
              <p>
                Correct answer:{" "}
                <span className="font-semibold text-foreground">
                  <MathText text={displayAnswer(feedback.question)} />
                </span>
              </p>
              {!feedback.skipped && feedback.given && (
                <p className="text-muted-foreground">
                  Your answer:{" "}
                  <MathText
                    text={
                      feedback.question.type === "multiple-select"
                        ? parseMultipleSelect(feedback.given).join(", ")
                        : feedback.given
                    }
                  />
                </p>
              )}
            </div>
          )}

          {showExplanation && explanation && (
            <div className="mt-3 border-t border-border/70 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {explanationLabel}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                <MathText text={explanation} />
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuizRun({
  pool,
  decks,
  updateDeck,
  config,
  initialSession,
  widgets,
  settings,
  xpBalance,
  spendXp,
  exam = false,
  mathMode = false,
  onFinish,
  onQuit,
  onSaveAndExit,
}: {
  pool: Question[];
  decks: Deck[];
  updateDeck: (id: string, patch: Partial<Deck>) => void;
  config: QuizConfig;
  initialSession: SavedQuizSession | null;
  widgets: QuizWidgets;
  settings: Settings;
  xpBalance: number;
  spendXp: (amount: number) => boolean;
  /** exam mode: no hints, exam-styled quit prompt */
  exam?: boolean;
  /** the quiz covers a math/science deck: show the symbol keypad */
  mathMode?: boolean;
  onFinish: (
    answers: AnswerRecord[],
    durationMs: number,
    bestCombo: number,
    xpEarned: number,
  ) => void;
  onQuit: () => void;
  onSaveAndExit: (
    session: Omit<SavedQuizSession, "id" | "savedAt" | "deckIds" | "deckTitles">,
  ) => void;
}) {
  const [index, setIndex] = useState(initialSession?.currentIndex ?? 0);
  const [answers, setAnswers] = useState<AnswerRecord[]>(initialSession?.answers ?? []);
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<QuizFeedback | null>(null);
  const [thinkFirst, setThinkFirst] = useState(true);
  const [optionsShown, setOptionsShown] = useState(false);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [showHintText, setShowHintText] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  const [previousFeedback, setPreviousFeedback] = useState<QuizFeedback | null>(() => {
    if (!initialSession?.config.feedbackOnNextQuestion || initialSession.currentIndex < 1) {
      return null;
    }
    const previousAnswer = initialSession.answers[initialSession.answers.length - 1];
    const previousQuestion = initialSession.pool[initialSession.currentIndex - 1];
    if (!previousAnswer || !previousQuestion) return null;
    return {
      question: previousQuestion,
      correct: previousAnswer.correct,
      skipped: previousAnswer.skipped,
      given: previousAnswer.given,
    };
  });
  const [combo, setCombo] = useState(initialSession?.combo ?? 0);
  const [bestCombo, setBestCombo] = useState(initialSession?.bestCombo ?? 0);
  const [xp, setXp] = useState(initialSession?.xp ?? 0);
  const initialHearts = Math.max(
    0,
    Math.min(MAX_HEARTS, Math.floor(initialSession?.hearts ?? MAX_HEARTS)),
  );
  const [hearts, setHearts] = useState(initialHearts);
  const [outOfHearts, setOutOfHearts] = useState(initialHearts === 0);
  const [elapsed, setElapsed] = useState(initialSession?.totalElapsedMs ?? 0);
  const [questionElapsed, setQuestionElapsed] = useState(0);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [pauseScreenVisible, setPauseScreenVisible] = useState(false);
  const [pauseCountdown, setPauseCountdown] = useState<number | null>(null);
  const [completedSubtopic, setCompletedSubtopic] = useState<string | null>(null);
  const deckSubjects = useMemo(
    () => new Map(decks.map((deck) => [deck.id, deck.subject])),
    [decks],
  );
  const coarsePointer = useCoarsePointer();
  const started = useRef(Date.now() - (initialSession?.totalElapsedMs ?? 0));
  const questionStart = useRef(Date.now());
  const advanceTimer = useRef<number | null>(null);
  const answerInput = useRef<HTMLInputElement>(null);
  const committedIndex = useRef<number | null>(null);

  const question = pool[index];
  const questionDeckId = (question as (Question & { deckId?: string }) | undefined)?.deckId;
  const questionDeck = decks.find((deck) => deck.id === questionDeckId);
  const bookmarked =
    question && questionDeck ? questionDeck.bookmarks.includes(question.id) : false;
  const total = pool.length;
  const multiplier = settings.timerMultiplier || 1;
  const perQuestionSeconds = config.perQuestionSeconds
    ? Math.round(config.perQuestionSeconds * multiplier)
    : null;
  const totalMinutes = config.totalMinutes ? config.totalMinutes * multiplier : null;

  const showHint = useCallback(() => {
    if (!question || exam || !settings.showHints) return;
    setShowHintText(true);
    if (question.type !== "multiple-choice" || !question.options) return;
    const remainingWrong = question.options.filter(
      (option) => option !== question.answer && !eliminated.includes(option),
    );
    if (remainingWrong.length <= 1) return;
    const eliminatedOption = remainingWrong[Math.floor(Math.random() * remainingWrong.length)];
    setEliminated((current) => [...current, eliminatedOption]);
    setHintsUsed((current) => current + 1);
  }, [eliminated, exam, question, settings.showHints]);

  const toggleBookmark = useCallback(() => {
    if (!question || !questionDeck) return;
    updateDeck(questionDeck.id, {
      bookmarks: bookmarked
        ? questionDeck.bookmarks.filter((id) => id !== question.id)
        : [...questionDeck.bookmarks, question.id],
    });
  }, [bookmarked, question, questionDeck, updateDeck]);

  const commit = useCallback(
    (given: string | null, skipped: boolean) => {
      if (!question || committedIndex.current === index) return;
      committedIndex.current = index;
      const correct = !skipped && given !== null && checkAnswer(question, given);
      const nextHearts = !exam && !correct ? Math.max(0, hearts - 1) : hearts;
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
      const questionFeedback: QuizFeedback = {
        question,
        correct,
        skipped,
        given: given ?? undefined,
      };
      setAnswers(nextAnswers);
      setCombo(nextCombo);
      setBestCombo((b) => Math.max(b, nextCombo));
      setXp((x) => x + gained);
      if (!exam && !correct) setHearts(nextHearts);

      const advance = () => {
        if (config.feedbackOnNextQuestion) setPreviousFeedback(questionFeedback);
        if (!exam && nextHearts === 0 && index + 1 < total) {
          setFeedback(questionFeedback);
          setOutOfHearts(true);
          setIndex((current) => current + 1);
          return;
        }
        setFeedback(null);
        setInput("");
        setSelected(null);
        setOptionsShown(false);
        setEliminated([]);
        setShowHintText(false);
        setHintsUsed(0);
        setTutorOpen(false);
        setNoteOpen(false);
        setExplainOpen(false);
        questionStart.current = Date.now();
        setQuestionElapsed(0);

        // Check if we should show a round pause
        const nextQuestion = pool[index + 1];
        const subtopicFinished =
          config.pauseAfterSubtopic &&
          nextQuestion !== undefined &&
          questionSubtopicKey(question, deckSubjects) !==
            questionSubtopicKey(nextQuestion, deckSubjects);
        const roundFinished =
          config.roundPauses && nextAnswers.length % config.questionsPerRound === 0;
        if ((subtopicFinished || roundFinished) && nextAnswers.length < total) {
          setCompletedSubtopic(
            subtopicFinished ? questionSubtopicTitle(question, deckSubjects) : null,
          );
          setPauseScreenVisible(true);
          if (config.pauseAutoAdvanceSeconds !== null && config.pauseAutoAdvanceSeconds > 0) {
            setPauseCountdown(config.pauseAutoAdvanceSeconds);
          }
          return;
        }

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

      if (config.feedbackOnNextQuestion) {
        advance();
      } else if (config.instantFeedback && !skipped) {
        setFeedback(questionFeedback);
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
      config.feedbackOnNextQuestion,
      config.instantFeedback,
      config.pauseAutoAdvanceSeconds,
      config.pauseAfterSubtopic,
      config.questionsPerRound,
      config.roundPauses,
      deckSubjects,
      config.xpEnabled,
      exam,
      hearts,
      index,
      onFinish,
      pool,
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

  // Pause auto-advance countdown
  useEffect(() => {
    if (!pauseCountdown || pauseCountdown <= 0) return;
    const timer = window.setTimeout(() => {
      setPauseCountdown((c) => (c ? c - 1 : null));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [pauseCountdown]);

  // Auto-advance pause when countdown reaches 0
  useEffect(() => {
    if (pauseCountdown === 0) {
      setPauseScreenVisible(false);
      setPauseCountdown(null);
      setCompletedSubtopic(null);
      setIndex((i) => i + 1);
    }
  }, [pauseCountdown]);

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
    committedIndex.current = null;
  }, [index]);

  useEffect(() => {
    if (!perQuestionSeconds || feedback || outOfHearts) return;
    if (questionElapsed / 1000 >= perQuestionSeconds) commit(null, true);
  }, [commit, perQuestionSeconds, feedback, outOfHearts, questionElapsed]);

  useEffect(() => {
    if (!totalMinutes) return;
    if (elapsed / 60000 >= totalMinutes) {
      onFinish(answers, Date.now() - started.current, bestCombo, xp);
    }
  }, [answers, bestCombo, totalMinutes, elapsed, onFinish, xp]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (exam || feedback || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.closest("button, a, [role='button']")
      ) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case "h":
          showHint();
          break;
        case "e":
          setExplainOpen((open) => !open);
          break;
        case "t":
          setTutorOpen((open) => !open);
          break;
        case "b":
          toggleBookmark();
          break;
        case " ":
          if (
            thinkFirst &&
            !optionsShown &&
            (question?.type === "multiple-choice" || question?.type === "true-false")
          ) {
            event.preventDefault();
            setOptionsShown(true);
          }
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [exam, feedback, optionsShown, question, showHint, thinkFirst, toggleBookmark]);

  const saveAndExit = (currentIndex = index) => {
    onSaveAndExit({
      pool,
      config,
      answers,
      currentIndex,
      hearts,
      totalElapsedMs: Date.now() - started.current,
      combo,
      bestCombo,
      xp,
    });
  };

  const purchaseHeart = () => {
    if (exam || hearts >= MAX_HEARTS || !spendXp(HEART_COST_XP)) return;
    setHearts((current) => Math.min(MAX_HEARTS, current + 1));
    if (outOfHearts) {
      setOutOfHearts(false);
      setFeedback(null);
      setInput("");
      setSelected(null);
      setOptionsShown(false);
      setEliminated([]);
      setShowHintText(false);
      setHintsUsed(0);
      setTutorOpen(false);
      setNoteOpen(false);
      setExplainOpen(false);
      questionStart.current = Date.now();
      setQuestionElapsed(0);
    }
  };

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

  if (outOfHearts) {
    const correctCount = answers.filter((answer) => answer.correct).length;
    return (
      <div className="mx-auto max-w-xl">
        <div className="panel space-y-5 p-8 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <Heart className="size-6 fill-current" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">Out of hearts</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You got {correctCount} right. Buy a heart to continue, or save your progress and come
              back later.
            </p>
          </div>
          {feedback ? (
            <QuizFeedbackPanel feedback={feedback} showExplanation={settings.showExplanations} />
          ) : previousFeedback ? (
            <QuizFeedbackPanel
              feedback={previousFeedback}
              showExplanation={settings.showExplanations}
            />
          ) : null}
          <Button
            className="w-full"
            onClick={purchaseHeart}
            disabled={xpBalance < HEART_COST_XP || hearts >= MAX_HEARTS}
          >
            <Heart className="size-4" /> Buy a heart · {HEART_COST_XP} XP
          </Button>
          <p className="text-xs text-muted-foreground">
            Your balance: {xpBalance} XP. Hearts are restored to {MAX_HEARTS} at the start of a new
            quiz.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => saveAndExit()}>
              Save & Exit
            </Button>
            <Button variant="ghost" onClick={onQuit}>
              End quiz
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show round pause screen
  if (pauseScreenVisible) {
    const answered = answers.filter((a) => !a.skipped).length;
    const correctCount = answers.filter((a) => a.correct).length;
    const accuracy = answered ? Math.round((correctCount / answered) * 100) : 0;

    return (
      <div className="mx-auto max-w-3xl">
        <div className="grid place-items-center gap-6 rounded-2xl border-2 border-border bg-surface p-12 text-center">
          <div>
            <h2 className="font-display text-3xl font-bold">
              {completedSubtopic ? "Subtopic complete!" : "Round complete!"}
            </h2>
            {completedSubtopic && (
              <p className="mt-1 font-medium text-primary">{completedSubtopic}</p>
            )}
            <p className="mt-2 text-muted-foreground">
              You've completed {answers.length} questions
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full">
            <div className="rounded-lg border border-border bg-background/50 p-4">
              <p className="text-[11px] uppercase text-muted-foreground">Correct</p>
              <p className="mt-2 font-display text-2xl font-bold text-success">{correctCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-4">
              <p className="text-[11px] uppercase text-muted-foreground">Accuracy</p>
              <p className="mt-2 font-display text-2xl font-bold text-primary">{accuracy}%</p>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-4">
              <p className="text-[11px] uppercase text-muted-foreground">Remaining</p>
              <p className="mt-2 font-display text-2xl font-bold">{total - answers.length}</p>
            </div>
          </div>

          <div className="w-full space-y-3">
            <Button
              className="w-full"
              onClick={() => {
                setPauseScreenVisible(false);
                setPauseCountdown(null);
                setCompletedSubtopic(null);
                setIndex((i) => i + 1);
              }}
            >
              Continue Quiz
              {pauseCountdown ? ` (${pauseCountdown}s)` : ""}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setPauseCountdown(null);
                saveAndExit(index + 1);
              }}
            >
              Save & Exit
            </Button>
          </div>

          {config.pauseAutoAdvanceSeconds && pauseCountdown ? (
            <p className="text-xs text-muted-foreground">
              Auto-advancing in {pauseCountdown} second{pauseCountdown === 1 ? "" : "s"}...
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  const isChoice = question.type === "multiple-choice";
  const isTrueFalse = question.type === "true-false";
  const showOptions = exam || !thinkFirst || optionsShown || !!feedback;
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
        <div className="flex items-center gap-2">
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
          <Button variant="outline" size="sm" disabled={!!feedback} onClick={() => saveAndExit()}>
            Save & Exit
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 text-[11px]">
          {!exam && (
            <div
              className="flex items-center gap-2"
              role="group"
              aria-label={`${hearts} of ${MAX_HEARTS} hearts remaining`}
            >
              <span className="flex items-center gap-0.5" aria-hidden="true">
                {Array.from({ length: MAX_HEARTS }, (_, heartIndex) => (
                  <Heart
                    key={heartIndex}
                    className={cn(
                      "size-4",
                      heartIndex < hearts
                        ? "fill-destructive text-destructive"
                        : "text-muted-foreground/30",
                    )}
                  />
                ))}
              </span>
              {hearts < MAX_HEARTS && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-9"
                  onClick={purchaseHeart}
                  disabled={!!feedback || xpBalance < HEART_COST_XP}
                  title={`Buy one heart for ${HEART_COST_XP} XP; you have ${xpBalance} XP`}
                >
                  <Heart className="size-3.5" /> {HEART_COST_XP} XP
                </Button>
              )}
            </div>
          )}
          {widgets.difficulty && (
            <Badge variant="outline" className="capitalize">
              {question.difficulty}
            </Badge>
          )}
          {widgets.concept && question.concept && (
            <Badge variant="secondary">
              <MathText text={question.concept} />
            </Badge>
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
        {previousFeedback && config.feedbackOnNextQuestion && (
          <QuizFeedbackPanel
            feedback={previousFeedback}
            previousQuestion
            showExplanation={settings.showExplanations}
          />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[11px]">
            {TYPE_LABELS[question.type]}
          </Badge>
          {!exam && (isChoice || isTrueFalse) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-[40px]"
              aria-pressed={thinkFirst}
              onClick={() => {
                setThinkFirst((current) => !current);
                setOptionsShown(false);
              }}
            >
              <Eye /> Think first {thinkFirst ? "on" : "off"}
            </Button>
          )}
          {questionDeck && !exam && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto size-10"
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark question"}
              aria-pressed={bookmarked}
              onClick={toggleBookmark}
            >
              <Bookmark className={cn("size-4", bookmarked && "fill-primary text-primary")} />
            </Button>
          )}
        </div>
        <h1 className="mt-4 break-words text-2xl font-semibold leading-snug">
          <MathText text={question.question} />
        </h1>

        {showHintText && question.hint && (
          <p className="mt-3 rounded-lg bg-surface-2/70 px-3 py-2 text-xs text-muted-foreground">
            <Lightbulb className="mr-1 inline size-3.5" />
            <MathText text={question.hint} />
          </p>
        )}

        {!exam && thinkFirst && !showOptions && (isChoice || isTrueFalse) && (
          <div className="mt-6 rounded-xl border border-dashed border-border p-5 text-center">
            <p className="text-sm text-muted-foreground">
              Think of your answer first, then reveal the choices.
            </p>
            <Button
              type="button"
              className="mt-4 min-h-[44px]"
              onClick={() => setOptionsShown(true)}
            >
              Show options
            </Button>
          </div>
        )}

        {isChoice && question.options && showOptions && (
          <ul className="mt-6 grid gap-2">
            {question.options.map((o) => (
              <li key={o}>
                <button
                  disabled={!!feedback || eliminated.includes(o)}
                  onClick={() => {
                    setSelected(o);
                    commit(o, false);
                  }}
                  className={cn(
                    "w-full rounded-lg border border-border break-words px-4 py-3 text-left text-sm transition-colors hover:border-primary/60",
                    selected === o && "border-primary bg-primary/10",
                    eliminated.includes(o) && "opacity-40 line-through",
                    feedback &&
                      o === question.answer &&
                      "border-success bg-success/10 text-success",
                    feedback &&
                      selected === o &&
                      o !== question.answer &&
                      "border-destructive bg-destructive/10 text-destructive",
                  )}
                >
                  <MathText text={o} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {isTrueFalse && showOptions && (
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
            {mathMode && !feedback && <MathKeypad target={answerInput} onValue={setInput} />}
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

        {!exam && (
          <>
            <div className="mt-6 flex flex-wrap gap-2 border-t border-border/60 pt-4">
              {settings.showHints && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-[40px]"
                  disabled={!!feedback || (!question.hint && !question.options?.length)}
                  onClick={showHint}
                >
                  <Lightbulb /> Hint
                  {eliminated.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">−1 option</span>
                  )}
                </Button>
              )}
              {isChoice ||
              question.type === "multiple-select" ||
              isTrueFalse ||
              question.explanation ||
              question.incorrectExplanation ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-[40px]"
                  onClick={() => setExplainOpen((open) => !open)}
                  aria-expanded={explainOpen}
                >
                  <Sparkles /> {explainOpen ? "Hide explanation" : "Explain"}
                </Button>
              ) : null}
              <Button
                type="button"
                variant={question.tutor ? "secondary" : "outline"}
                size="sm"
                className="min-h-[40px]"
                onClick={() => setTutorOpen((open) => !open)}
                aria-expanded={tutorOpen}
              >
                <GraduationCap /> Tutor
              </Button>
              {questionDeck && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto min-h-[40px]"
                  onClick={() => setNoteOpen((open) => !open)}
                  aria-expanded={noteOpen}
                >
                  <StickyNote /> Note
                </Button>
              )}
            </div>

            {hintsUsed > 0 && !feedback && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {hintsUsed} hint{hintsUsed === 1 ? "" : "s"} used on this question.
              </p>
            )}

            {explainOpen && (
              <div className="mt-4 rounded-xl border border-border bg-surface/50 p-4">
                <QuestionRationales question={question} />
                {!question.explanation &&
                  !question.incorrectExplanation &&
                  !question.tutor?.whyCorrect &&
                  !question.tutor?.whyWrong?.length && (
                    <p className="text-sm text-muted-foreground">
                      No explanation is saved for this question yet.
                    </p>
                  )}
              </div>
            )}

            {tutorOpen && (
              <QuestionTutorPanel question={question} onClose={() => setTutorOpen(false)} />
            )}

            {noteOpen && questionDeck && (
              <Textarea
                className="mt-3"
                placeholder="Write a personal note for this question…"
                value={questionDeck.notes?.[question.id] ?? ""}
                onChange={(event) =>
                  updateDeck(questionDeck.id, {
                    notes: { ...(questionDeck.notes ?? {}), [question.id]: event.target.value },
                  })
                }
              />
            )}
          </>
        )}

        {feedback && (
          <QuizFeedbackPanel feedback={feedback} showExplanation={settings.showExplanations} />
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

      {!exam && (
        <p className="mt-4 hidden text-center text-[11px] text-muted-foreground sm:block">
          Space show choices · H hint · E explain · T tutor · B bookmark
        </p>
      )}

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
