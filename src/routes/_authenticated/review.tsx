import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Brain, CheckCircle2, Eye, RotateCcw, Sparkles } from "lucide-react";
import { AppPage } from "@/components/app-page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GradeButtons } from "@/components/srs/grade-buttons";
import { InteractiveQuestion } from "@/components/questions/interactive-question";
import { displayAnswer, isInteractive } from "@/lib/interactive";
import { TYPE_LABELS, formatDuration } from "@/lib/answers";
import { xpForAnswer } from "@/lib/gamification";
import {
  collectDue,
  collectWeak,
  formatInterval,
  previewInterval,
  type DueItem,
  type SrsGrade,
} from "@/lib/srs";
import { useKnowly } from "@/store/knowly";
import { cn } from "@/lib/utils";
import type { AnswerRecord } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/review")({
  validateSearch: (search: Record<string, unknown>): { deck?: string; mode?: "weak" } => ({
    ...(typeof search["deck"] === "string" ? { deck: search["deck"] as string } : {}),
    ...(search["mode"] === "weak" ? { mode: "weak" as const } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Daily Review — Spaced Repetition | Knowly" },
      {
        name: "description",
        content:
          "Review only the cards your spaced repetition schedule says are due today, grading each one Again, Hard, Good or Easy.",
      },
      { property: "og:title", content: "Daily Review — Knowly" },
      {
        property: "og:description",
        content: "Work through today's due cards with an SM-2 style spaced repetition scheduler.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <ReviewSession />
    </AppPage>
  ),
});

function ReviewSession() {
  const { deck: deckFilter, mode } = Route.useSearch();
  const weakMode = mode === "weak";
  const { state, reviewQuestion, recordSession } = useKnowly();
  const navigate = useNavigate();
  const settings = state.settings;

  // frozen at mount so grading doesn't reshuffle the queue underfoot
  const [queue, setQueue] = useState<DueItem[]>(() => []);
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [input, setInput] = useState("");
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [xp, setXp] = useState(0);
  const [gradeCounts, setGradeCounts] = useState<Record<SrsGrade, number>>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });
  const [done, setDone] = useState(false);
  const started = useRef(Date.now());
  const questionStart = useRef(Date.now());
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const decks = deckFilter
      ? stateRef.current.decks.filter((d) => d.id === deckFilter)
      : stateRef.current.decks;
    setQueue(weakMode ? collectWeak(decks) : collectDue(decks));
    setReady(true);
    started.current = Date.now();
    questionStart.current = Date.now();
  }, [deckFilter, weakMode]);

  const item = queue[index];
  const total = queue.length;

  // live card (post-grade) for interval previews
  const liveCard = useMemo(() => {
    if (!item) return undefined;
    return state.decks.find((d) => d.id === item.deckId)?.srs?.[item.question.id];
  }, [item, state.decks]);

  const finish = useCallback(
    (final: AnswerRecord[], finalXp: number) => {
      const deckIds = Array.from(new Set(final.map((a) => a.deckId)));
      const deckTitles = deckIds.map(
        (id) => stateRef.current.decks.find((d) => d.id === id)?.title ?? "Deck",
      );
      const conceptStats: Record<string, { correct: number; total: number }> = {};
      final.forEach((a) => {
        if (!a.concept) return;
        const prev = conceptStats[a.concept] ?? { correct: 0, total: 0 };
        conceptStats[a.concept] = {
          correct: prev.correct + (a.correct ? 1 : 0),
          total: prev.total + 1,
        };
      });
      const masteredIds: Record<string, string[]> = {};
      final
        .filter((a) => a.correct)
        .forEach((a) => {
          masteredIds[a.deckId] = [...(masteredIds[a.deckId] ?? []), a.questionId];
        });
      recordSession({
        mode: "study",
        deckIds,
        deckTitles,
        answered: final.length,
        correct: final.filter((a) => a.correct).length,
        skipped: 0,
        durationMs: Date.now() - started.current,
        xpEarned: settings.xpEnabled ? finalXp : 0,
        bestCombo: 0,
        masteredIds,
        conceptStats,
      });
      setDone(true);
    },
    [recordSession, settings.xpEnabled],
  );

  const grade = useCallback(
    (g: SrsGrade) => {
      if (!item) return;
      reviewQuestion(item.deckId, item.question.id, g);
      const record: AnswerRecord = {
        questionId: item.question.id,
        deckId: item.deckId,
        type: item.question.type,
        difficulty: item.question.difficulty,
        concept: item.question.concept,
        correct: g !== "again",
        skipped: false,
        timeMs: Date.now() - questionStart.current,
      };
      const nextAnswers = [...answers, record];
      const nextXp = xp + xpForAnswer(record, 0) + (g === "easy" ? 2 : 0);
      setAnswers(nextAnswers);
      setXp(nextXp);
      setGradeCounts((c) => ({ ...c, [g]: c[g] + 1 }));
      setRevealed(false);
      setInput("");
      questionStart.current = Date.now();
      if (index + 1 >= total) finish(nextAnswers, nextXp);
      else setIndex((i) => i + 1);
    },
    [answers, finish, index, item, reviewQuestion, total, xp],
  );

  useEffect(() => {
    if (settings.autoReveal) setRevealed(true);
  }, [index, settings.autoReveal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " ") {
        e.preventDefault();
        setRevealed(true);
        return;
      }
      if (!revealed) return;
      const map: Record<string, SrsGrade> = { "1": "again", "2": "hard", "3": "good", "4": "easy" };
      const g = map[e.key];
      if (g) grade(g);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, grade, revealed]);

  if (!ready) return null;

  if (!total) {
    return (
      <div className="panel mx-auto max-w-xl p-12 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" />
        <h1 className="mt-5 font-display text-2xl font-bold">Nothing due right now</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your spaced repetition schedule is clear. Come back when cards ripen, or study a deck
          ahead of time.
        </p>
        <div className="mt-7 flex justify-center gap-2">
          <Button asChild>
            <Link to="/decks">Browse decks</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="panel mx-auto max-w-xl p-10 text-center">
        <Sparkles className="mx-auto size-9 text-primary" />
        <h1 className="mt-4 font-display text-3xl font-bold">Review complete</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {answers.length} card{answers.length === 1 ? "" : "s"} rescheduled
        </p>
        <div className="mt-8 grid grid-cols-4 gap-3">
          {(["again", "hard", "good", "easy"] as SrsGrade[]).map((g) => (
            <div key={g} className="rounded-xl bg-surface-2/60 p-3">
              <p className="font-display text-xl font-bold">{gradeCounts[g]}</p>
              <p className="text-[11px] capitalize text-muted-foreground">{g}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-2/60 p-3">
            <p className="font-display text-xl font-bold">+{settings.xpEnabled ? xp : 0}</p>
            <p className="text-[11px] text-muted-foreground">XP earned</p>
          </div>
          <div className="rounded-xl bg-surface-2/60 p-3">
            <p className="font-display text-xl font-bold">
              {formatDuration(Date.now() - started.current)}
            </p>
            <p className="text-[11px] text-muted-foreground">Time</p>
          </div>
        </div>
        <div className="mt-8 flex justify-center gap-2">
          <Button onClick={() => window.location.reload()}>
            <RotateCcw /> Review again
          </Button>
          <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
            Return home
          </Button>
        </div>
      </div>
    );
  }

  if (!item) return null;
  const question = item.question;
  const progress = (index / total) * 100;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard" })}>
          <ArrowLeft /> Daily review
        </Button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 text-primary">
            <Brain className="size-3.5" /> {total - index} left
          </span>
          <span>
            {index + 1} / {total}
          </span>
          {settings.xpEnabled && <span className="text-primary">+{xp} XP</span>}
        </div>
      </div>

      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <article className="panel p-8">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 font-medium"
            title={item.deckTitle}
          >
            <span className="size-2 rounded-full" style={{ background: item.deckColor }} />
            {item.deckTitle}
          </span>
          <Badge variant="outline">{TYPE_LABELS[question.type]}</Badge>
          <Badge variant="outline" className="capitalize">
            {question.difficulty}
          </Badge>
          {question.concept && <Badge variant="secondary">{question.concept}</Badge>}
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
            {item.card && item.card.reps > 0
              ? `rep ${item.card.reps} · ease ${item.card.ease} · was ${formatInterval(item.card.interval)}`
              : "new card"}
          </span>
        </div>

        <h1 className="mt-6 text-2xl font-semibold leading-snug">{question.question}</h1>

        {question.hint && settings.showHints && !revealed && (
          <p className="mt-3 text-xs text-muted-foreground">Hint: {question.hint}</p>
        )}

        {question.type === "multiple-choice" && question.options && (
          <ul className="mt-6 grid gap-2">
            {question.options.map((o) => (
              <li
                key={o}
                className={cn(
                  "rounded-lg border border-border px-4 py-3 text-sm",
                  revealed && o === question.answer && "border-success bg-success/10 text-success",
                )}
              >
                {o}
              </li>
            ))}
          </ul>
        )}

        {(question.type === "fill-blank" || question.type === "short-answer") && (
          <Input
            className="mt-6"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer…"
            onKeyDown={(e) => {
              if (e.key === "Enter") setRevealed(true);
            }}
          />
        )}

        {isInteractive(question.type) && (
          <InteractiveQuestion
            question={question}
            value={input}
            onChange={setInput}
            disabled={revealed}
            revealed={revealed}
          />
        )}

        {revealed ? (
          <>
            <div className="mt-6 rounded-xl border border-success/40 bg-success/10 p-5">
              <p className="text-xs uppercase tracking-widest text-success">Answer</p>
              <p className="mt-2 text-lg font-medium">{displayAnswer(question)}</p>
              {question.explanation && settings.showExplanations && (
                <p className="mt-2 text-sm text-muted-foreground">{question.explanation}</p>
              )}
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              How well did you recall it? Your answer sets the next review date.
            </p>
            <GradeButtons card={liveCard ?? item.card} onGrade={grade} className="mt-2" />
          </>
        ) : (
          <Button className="mt-6" variant="secondary" onClick={() => setRevealed(true)}>
            <Eye /> Reveal answer <span className="ml-1 text-[10px] opacity-60">Space</span>
          </Button>
        )}
      </article>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Space reveals · 1 Again ({formatInterval(previewInterval(item.card, "again"))}) · 2 Hard · 3
        Good · 4 Easy
      </p>
    </div>
  );
}
