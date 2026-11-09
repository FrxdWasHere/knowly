import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChevronRight,
  Crown,
  Eye,
  Flame,
  GraduationCap,
  Heart,
  Lightbulb,
  Play,
  RotateCcw,
  SkipForward,
  Sparkles,
  StickyNote,
  Skull,
  Timer,
  X,
  Zap,
} from "lucide-react";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { InteractiveQuestion } from "@/components/questions/interactive-question";
import { MathKeypad, MathText } from "@/components/math/math-text";
import { checkAnswer, formatDuration, TYPE_LABELS } from "@/lib/answers";
import { displayAnswer, isInteractive } from "@/lib/interactive";
import { xpForAnswer } from "@/lib/gamification";
import { gradeFromOutcome } from "@/lib/srs";
import {
  bossHealth,
  buildRounds,
  fragmentDeck,
  hardestQuestions,
  HEART_COST_XP,
  MAX_HEARTS,
  nextPart,
  partCleared,
  ROUND_MODE_META,
  ROUND_SIZE,
  SPEED_SECONDS,
  type DeckPart,
  type RoundMode,
} from "@/lib/rounds";
import { useKnowly } from "@/store/knowly";
import { cn } from "@/lib/utils";
import type { AnswerRecord, Question } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/study/$deckId")({
  validateSearch: (search: Record<string, unknown>) => ({
    part: typeof search.part === "string" ? search.part : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Rounds — Deck Study Session | Knowly" },
      {
        name: "description",
        content:
          "Study a deck in short rounds: hearts, hints, explanations, speed runs and a boss round built from the cards you keep missing.",
      },
      { property: "og:title", content: "Rounds — Knowly" },
      {
        property: "og:description",
        content: "A deck split into parts and short rounds, with hearts and boss fights.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <RoundsSession />
    </AppPage>
  ),
});

type Phase = "plan" | "run" | "recap" | "failed" | "done";

function RoundsSession() {
  const { deckId } = Route.useParams();
  const { part: requestedPart } = Route.useSearch();
  const { state, updateDeck, recordSession, reviewQuestion, spendXp } = useKnowly();
  const navigate = useNavigate();
  const deck = state.decks.find((d) => d.id === deckId);
  const settings = state.settings;

  const parts = useMemo(() => (deck ? fragmentDeck(deck) : []), [deck]);
  const [partId, setPartId] = useState<string | null>(requestedPart ?? null);

  const part = parts.find((p) => p.id === partId) ?? (deck ? nextPart(parts) : undefined);

  const [phase, setPhase] = useState<Phase>("plan");
  const [mode, setMode] = useState<RoundMode>("normal");
  const [rounds, setRounds] = useState<Question[][]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [queue, setQueue] = useState<Question[]>([]);
  const [qi, setQi] = useState(0);

  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [xp, setXp] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [roundStartXp, setRoundStartXp] = useState(0);
  const [roundAnswers, setRoundAnswers] = useState<AnswerRecord[]>([]);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [bossHp, setBossHp] = useState(0);
  const [bossMax, setBossMax] = useState(0);

  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<null | { correct: boolean }>(null);
  const [revealed, setRevealed] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [optionsShown, setOptionsShown] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHintText, setShowHintText] = useState(false);
  const [thinkFirst, setThinkFirst] = useState(true);
  const [noteOpen, setNoteOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(SPEED_SECONDS);

  const startedAt = useRef(Date.now());
  const questionStart = useRef(Date.now());
  const answering = useRef(false);
  const answerInput = useRef<HTMLInputElement>(null);
  const retried = useRef(new Set<string>());
  const bossHits = useRef(new Set<string>());
  const saved = useRef(false);

  const question = queue[qi];
  const modeMeta = ROUND_MODE_META[mode];
  const isBoss = mode === "boss";

  const resetQuestionUi = useCallback(() => {
    setInput("");
    setSelected(null);
    setFeedback(null);
    setRevealed(false);
    setExplainOpen(false);
    setEliminated([]);
    setOptionsShown(false);
    setShowHintText(false);
    setNoteOpen(false);
    setTutorOpen(false);
    setSecondsLeft(SPEED_SECONDS);
    questionStart.current = Date.now();
    answering.current = false;
  }, []);

  const finishSession = useCallback(
    (finalAnswers: AnswerRecord[], finalXp: number) => {
      if (!deck || saved.current || !finalAnswers.length) return;
      saved.current = true;
      const conceptStats: Record<string, { correct: number; total: number }> = {};
      finalAnswers.forEach((a) => {
        if (!a.concept || a.skipped) return;
        const prev = conceptStats[a.concept] ?? { correct: 0, total: 0 };
        conceptStats[a.concept] = {
          correct: prev.correct + (a.correct ? 1 : 0),
          total: prev.total + 1,
        };
      });
      recordSession({
        mode: "study",
        deckIds: [deck.id],
        deckTitles: [deck.title],
        answered: finalAnswers.filter((a) => !a.skipped).length,
        correct: finalAnswers.filter((a) => a.correct).length,
        skipped: finalAnswers.filter((a) => a.skipped).length,
        durationMs: Date.now() - startedAt.current,
        xpEarned: settings.xpEnabled ? finalXp : 0,
        bestCombo,
        masteredIds: { [deck.id]: finalAnswers.filter((a) => a.correct).map((a) => a.questionId) },
        conceptStats,
      });
    },
    [bestCombo, deck, recordSession, settings.xpEnabled],
  );

  /** Begins a round (or the whole part) in the requested mode. */
  const startRound = useCallback(
    (nextMode: RoundMode) => {
      if (!deck || !part) return;
      const built = buildRounds(deck, part.questions, nextMode);
      if (!built.length) return;
      const planned = nextMode === "normal" ? built : built.slice(0, 1);
      setMode(nextMode);
      setRounds(planned);
      setRoundIndex(0);
      setQueue(planned[0]);
      setQi(0);
      setRoundAnswers([]);
      setRoundStartXp(xp);
      if (nextMode === "boss") {
        const hp = bossHealth(planned[0].length);
        setBossHp(hp);
        setBossMax(hp);
        bossHits.current = new Set();
      }
      startedAt.current = Date.now();
      resetQuestionUi();
      setPhase("run");
    },
    [deck, part, resetQuestionUi, xp],
  );

  const commit = useCallback(
    (outcome: "correct" | "incorrect" | "skip", given?: string) => {
      if (!question || !deck || answering.current) return;
      answering.current = true;
      const record: AnswerRecord = {
        questionId: question.id,
        deckId: deck.id,
        type: question.type,
        difficulty: question.difficulty,
        concept: question.concept,
        correct: outcome === "correct",
        skipped: outcome === "skip",
        timeMs: Date.now() - questionStart.current,
        given,
      };
      const grade = gradeFromOutcome(outcome, record.timeMs);
      if (grade) reviewQuestion(deck.id, question.id, grade);

      const nextCombo = outcome === "correct" ? combo + 1 : 0;
      const gained =
        outcome === "skip" ? 0 : Math.round(xpForAnswer(record, combo) * modeMeta.xpMultiplier);

      setAnswers((a) => [...a, record]);
      setRoundAnswers((a) => [...a, record]);
      setCombo(nextCombo);
      setBestCombo((b) => Math.max(b, nextCombo));
      setXp((x) => x + gained);
      setFeedback({ correct: outcome === "correct" });

      if (outcome === "incorrect") {
        setHearts((h) => Math.max(0, h - 1));
        // A missed card comes back once at the end of this round.
        if (!retried.current.has(question.id)) {
          retried.current.add(question.id);
          setQueue((q) => [...q, question]);
        }
      }

      if (isBoss && outcome === "correct" && !bossHits.current.has(question.id)) {
        bossHits.current.add(question.id);
        setBossHp((hp) => Math.max(0, hp - 1));
      }
    },
    [combo, deck, isBoss, modeMeta.xpMultiplier, question, reviewQuestion],
  );

  const advance = useCallback(() => {
    if (hearts <= 0) {
      setPhase("failed");
      return;
    }
    if (qi + 1 >= queue.length) {
      setPhase("recap");
      return;
    }
    setQi((i) => i + 1);
    resetQuestionUi();
  }, [hearts, qi, queue.length, resetQuestionUi]);

  const nextRound = useCallback(() => {
    const next = roundIndex + 1;
    if (next >= rounds.length) return;
    setRoundIndex(next);
    setQueue(rounds[next]);
    setQi(0);
    setRoundAnswers([]);
    setRoundStartXp(xp);
    resetQuestionUi();
    setPhase("run");
  }, [resetQuestionUi, roundIndex, rounds, xp]);

  const endSession = useCallback(() => {
    finishSession(answers, xp);
    setPhase("done");
  }, [answers, finishSession, xp]);

  /** Clears the running totals after they have been recorded. */
  const resetSession = useCallback(() => {
    setAnswers([]);
    setXp(0);
    setCombo(0);
    setBestCombo(0);
    setHearts(MAX_HEARTS);
    setRounds([]);
    setRoundIndex(0);
    setQueue([]);
    setQi(0);
    setBossHp(0);
    setBossMax(0);
    retried.current.clear();
    bossHits.current.clear();
    saved.current = false;
    startedAt.current = Date.now();
  }, []);

  /** Saves the current session, then lands on the part picker. */
  const leaveSession = useCallback(
    (nextPartId: string | null) => {
      finishSession(answers, xp);
      resetSession();
      setPartId(nextPartId);
      setPhase("plan");
    },
    [answers, finishSession, resetSession, xp],
  );

  // Speed runs: one clock per card.
  useEffect(() => {
    if (phase !== "run" || mode !== "speed" || feedback) return;
    const id = window.setInterval(() => {
      const left = SPEED_SECONDS - (Date.now() - questionStart.current) / 1000;
      setSecondsLeft(Math.max(0, left));
      if (left <= 0) commit("incorrect", undefined);
    }, 200);
    return () => window.clearInterval(id);
  }, [commit, feedback, mode, phase, qi]);

  const reveal = () => {
    setRevealed(true);
    if (!optionsShown) setOptionsShown(true);
  };

  const explain = () => {
    setRevealed(true);
    setOptionsShown(true);
    setExplainOpen(true);
    setShowHintText(true);
  };

  const hint = () => {
    if (!question?.options?.length) {
      setShowHintText(true);
      return;
    }
    setOptionsShown(true);
    const wrong = question.options.filter((o) => o !== question.answer && !eliminated.includes(o));
    if (wrong.length <= 1) return;
    const cut = wrong[Math.floor(Math.random() * wrong.length)];
    setEliminated((e) => [...e, cut]);
    setHintsUsed((n) => n + 1);
    setShowHintText(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== "run") return;
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if (typing) return;
      if (e.key === " " && !feedback) {
        e.preventDefault();
        if (revealed) setRevealed(false);
        else reveal();
      }
      if (e.key === "Enter" && feedback) {
        e.preventDefault();
        advance();
      }
      if (e.key.toLowerCase() === "h") hint();
      if (e.key.toLowerCase() === "e") explain();
      if (e.key.toLowerCase() === "t") setTutorOpen((open) => !open);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!deck) {
    return (
      <div className="panel grid place-items-center p-16 text-center">
        <p>Deck not found.</p>
        <Button className="mt-4" asChild>
          <Link to="/decks">Back to library</Link>
        </Button>
      </div>
    );
  }

  if (!deck.questions.length) {
    return (
      <div className="panel grid place-items-center p-16 text-center">
        <p className="font-medium">This deck has no cards yet</p>
        <Button className="mt-4" asChild>
          <Link to="/decks/$deckId" params={{ deckId: deck.id }}>
            Back to the deck
          </Link>
        </Button>
      </div>
    );
  }

  if (!part) return null;

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (settings.confirmBeforeExit && answers.length && phase !== "done") {
              setConfirmLeave(true);
              return;
            }
            navigate({ to: "/decks/$deckId", params: { deckId: deck.id } });
          }}
        >
          <ArrowLeft /> {deck.title}
        </Button>
        <HeartBar hearts={hearts} />
      </div>
      {children}
      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Leave this session?"
        description="Your progress so far won't be saved."
        confirmLabel="Leave"
        cancelLabel="Keep studying"
        destructive
        onConfirm={() => navigate({ to: "/decks/$deckId", params: { deckId: deck.id } })}
      />
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Plan                                                             */
  /* ---------------------------------------------------------------- */

  if (phase === "plan") {
    return shell(
      <div>
        <PageHeader
          title={part.title}
          description={`${part.questions.length} cards in this part · ${part.roundCount} round${
            part.roundCount === 1 ? "" : "s"
          } · ${part.masteryPct}% mastered`}
          action={
            <Button size="lg" className="min-h-[44px]" onClick={() => startRound("normal")}>
              <Play /> Start round
            </Button>
          }
        />

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <Button
            variant="outline"
            className="h-auto justify-start gap-3 py-3 text-left"
            onClick={() => startRound("normal")}
          >
            <Play className="size-4 text-primary" />
            <span>
              <span className="block text-sm font-medium">{ROUND_MODE_META.normal.blurb}</span>
              <span className="block text-xs text-muted-foreground">Rounds of {ROUND_SIZE}</span>
            </span>
          </Button>
          <Button
            variant="outline"
            className="h-auto justify-start gap-3 py-3 text-left"
            onClick={() => startRound("hard")}
          >
            <Flame className="size-4 text-primary" />
            <span>
              <span className="block text-sm font-medium">Hard round</span>
              <span className="block text-xs text-muted-foreground">Only the hard cards</span>
            </span>
          </Button>
          <Button
            variant="outline"
            className="h-auto justify-start gap-3 py-3 text-left"
            onClick={() => startRound("speed")}
          >
            <Timer className="size-4 text-primary" />
            <span>
              <span className="block text-sm font-medium">Speed run</span>
              <span className="block text-xs text-muted-foreground">
                {SPEED_SECONDS}s per card · 2× XP
              </span>
            </span>
          </Button>
        </div>

        <div className="panel mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium">Think first</p>
            <p className="text-xs text-muted-foreground">
              Multiple-choice cards hide their options until you have an answer in mind.
            </p>
          </div>
          <Button
            variant={thinkFirst ? "default" : "outline"}
            size="sm"
            onClick={() => setThinkFirst((v) => !v)}
          >
            {thinkFirst ? "On" : "Off"}
          </Button>
        </div>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Parts of this deck</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Big decks are split by concept so you never face all {deck.questions.length} cards at
            once.
          </p>
          <ul className="mt-4 grid gap-2">
            {parts.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => setPartId(p.id)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition-colors",
                    p.id === part.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{p.title}</span>
                    {partCleared(p) && (
                      <Badge className="bg-success text-success-foreground">Cleared</Badge>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {p.questions.length} cards · {p.due} due
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${p.masteryPct}%` }}
                    />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>,
    );
  }

  /* ---------------------------------------------------------------- */
  /* Recap                                                            */
  /* ---------------------------------------------------------------- */

  if (phase === "recap") {
    const done = roundAnswers.filter((a) => !a.skipped);
    const right = done.filter((a) => a.correct).length;
    const pct = done.length ? Math.round((right / done.length) * 100) : 0;
    const roundXp = xp - roundStartXp;
    const moreRounds = roundIndex + 1 < rounds.length;
    const bossAvailable = mode === "normal" || mode === "hard";
    const bossQuestions = hardestQuestions(deck, 6, part.questions);

    return shell(
      <div>
        <div className="panel p-6 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {isBoss ? "Boss round" : `${modeMeta.label} ${roundIndex + 1} complete`}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold">
            {isBoss ? "Boss defeated" : pct >= 80 ? "Round complete" : "Round done"}
          </h1>
          <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3">
            <Stat label="Accuracy" value={`${pct}%`} />
            <Stat label="XP" value={`+${roundXp}`} />
            <Stat label="Hearts" value={`${hearts}/${MAX_HEARTS}`} />
          </div>
          <div className="mx-auto mt-6 h-2 max-w-md overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {moreRounds ? (
              <Button className="min-h-[44px]" onClick={nextRound}>
                Next round <ArrowRight />
              </Button>
            ) : (
              <Button
                className="min-h-[44px]"
                onClick={() => {
                  setRoundAnswers([]);
                  setRoundStartXp(xp);
                  startRound("normal");
                }}
              >
                <RotateCcw /> Study this part again
              </Button>
            )}
            {!moreRounds && (
              <Button variant="outline" className="min-h-[44px]" onClick={() => startRound("hard")}>
                <Flame /> Try a hard round
              </Button>
            )}
            {!moreRounds && (
              <Button
                variant="outline"
                className="min-h-[44px]"
                onClick={() => startRound("speed")}
              >
                <Timer /> Try a speed run
              </Button>
            )}
            {!moreRounds && (
              <Button variant="secondary" className="min-h-[44px]" onClick={endSession}>
                <Check /> Finish session
              </Button>
            )}
            <Button variant="ghost" className="min-h-[44px]" onClick={() => leaveSession(null)}>
              Choose another part
            </Button>
          </div>
        </div>

        {!moreRounds && bossAvailable && bossQuestions.length > 0 && (
          <div className="panel mt-4 border-warning/40 bg-warning/5 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-warning/15 text-warning">
                <Skull className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold">The Forgetting Curve</p>
                <p className="text-xs text-muted-foreground">
                  {bossQuestions.length} of your hardest cards, back to back. Perfect answers only.
                </p>
              </div>
              <Button className="min-h-[44px]" onClick={() => startRound("boss")}>
                <Crown /> Fight the boss
              </Button>
            </div>
          </div>
        )}

        <RecapList answers={roundAnswers} questions={queue} />
      </div>,
    );
  }

  /* ---------------------------------------------------------------- */
  /* Out of hearts                                                    */
  /* ---------------------------------------------------------------- */

  if (phase === "failed") {
    const canBuy = state.progress.xp >= HEART_COST_XP;
    return shell(
      <div className="panel p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-destructive/15 text-destructive">
          <Heart className="size-7" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold">Out of hearts</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You have {state.progress.xp.toLocaleString()} XP banked. A fresh heart costs{" "}
          {HEART_COST_XP.toLocaleString()} XP.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            className="min-h-[44px]"
            disabled={!canBuy}
            onClick={() => {
              if (spendXp(HEART_COST_XP)) {
                setHearts(1);
                setPhase("run");
              }
            }}
          >
            <Heart /> Buy a heart
          </Button>
          <Button variant="outline" className="min-h-[44px]" onClick={endSession}>
            End session
          </Button>
        </div>
      </div>,
    );
  }

  /* ---------------------------------------------------------------- */
  /* Done                                                             */
  /* ---------------------------------------------------------------- */

  if (phase === "done") {
    const answeredNow = answers.filter((a) => !a.skipped).length;
    const correctNow = answers.filter((a) => a.correct).length;
    const pct = answeredNow ? Math.round((correctNow / answeredNow) * 100) : 0;
    return shell(
      <div className="panel p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="size-7" />
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold">Session complete</h1>
        <p className="mt-1 text-sm text-muted-foreground">{deck.title}</p>
        <div className="mx-auto mt-6 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Accuracy" value={`${pct}%`} />
          <Stat label="XP earned" value={`+${settings.xpEnabled ? xp : 0}`} />
          <Stat label="Best combo" value={`${bestCombo}`} />
          <Stat label="Time" value={formatDuration(Date.now() - startedAt.current)} />
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              resetSession();
              setPartId(null);
              setPhase("plan");
            }}
          >
            <Play /> Study another part
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/decks/$deckId", params: { deckId: deck.id } })}
          >
            Back to deck
          </Button>
        </div>
      </div>,
    );
  }

  /* ---------------------------------------------------------------- */
  /* Running                                                          */
  /* ---------------------------------------------------------------- */

  if (!question) return null;

  const isChoice = question.type === "multiple-choice";
  const isTrueFalse = question.type === "true-false";
  const showOptions = !thinkFirst || optionsShown || revealed || !!feedback;
  const bookmarked = deck.bookmarks.includes(question.id);
  const roundPct = queue.length ? Math.round((qi / queue.length) * 100) : 0;

  return shell(
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Badge variant="outline" className="capitalize">
            {modeMeta.label}
          </Badge>
          {!isBoss && (
            <span>
              Round {roundIndex + 1}
              {rounds.length > 1 ? ` of ${rounds.length}` : ""} · card {qi + 1}/{queue.length}
            </span>
          )}
          {isBoss && <span>card {qi + 1}</span>}
        </span>
        <span className="inline-flex items-center gap-3">
          {settings.xpEnabled && (
            <span className="inline-flex items-center gap-1 text-primary">
              <Zap className="size-3.5" /> +{xp}
            </span>
          )}
          {combo > 1 && (
            <span className="inline-flex items-center gap-1 text-primary">
              <Flame className="size-3.5" /> {combo}x
            </span>
          )}
          {mode === "speed" && !feedback && (
            <span className="inline-flex items-center gap-1 text-warning">
              <Timer className="size-3.5" /> {Math.ceil(secondsLeft)}s
            </span>
          )}
        </span>
      </div>

      {isBoss && (
        <div className="mb-4 rounded-xl border border-warning/40 bg-warning/5 p-3">
          <div className="flex items-center justify-between text-[11px] text-warning">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Skull className="size-3.5" /> The Forgetting Curve
            </span>
            <span>
              {bossHp}/{bossMax} HP
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-warning transition-all"
              style={{ width: `${bossMax ? (bossHp / bossMax) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {settings.showProgressBars && !isBoss && (
        <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${roundPct}%` }}
          />
        </div>
      )}

      <article className="panel p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <Badge variant="outline">{TYPE_LABELS[question.type]}</Badge>
          <Badge variant="outline" className="capitalize">
            {question.difficulty}
          </Badge>
          {question.concept && (
            <Badge variant="secondary">
              <MathText text={question.concept} />
            </Badge>
          )}
          <button
            className="ml-auto grid min-h-[44px] min-w-[44px] place-items-center"
            aria-label="Bookmark question"
            onClick={() =>
              updateDeck(deck.id, {
                bookmarks: bookmarked
                  ? deck.bookmarks.filter((b) => b !== question.id)
                  : [...deck.bookmarks, question.id],
              })
            }
          >
            <Bookmark className={cn("size-4", bookmarked && "fill-primary text-primary")} />
          </button>
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

        {(isChoice || isTrueFalse) && thinkFirst && !showOptions && (
          <div className="mt-6 rounded-xl border border-dashed border-border p-5 text-center">
            <p className="text-sm text-muted-foreground">
              Answer it in your head first — that is where the learning happens.
            </p>
            <Button className="mt-4 min-h-[44px]" onClick={() => setOptionsShown(true)}>
              Show options
            </Button>
          </div>
        )}

        {isChoice && question.options && showOptions && (
          <ul className="mt-6 grid gap-2">
            {question.options.map((option) => {
              const gone = eliminated.includes(option);
              const isAnswer = option === question.answer;
              return (
                <li key={option}>
                  <button
                    disabled={!!feedback || eliminated.includes(option)}
                    onClick={() => {
                      setSelected(option);
                      commit(checkAnswer(question, option) ? "correct" : "incorrect", option);
                    }}
                    className={cn(
                      "w-full rounded-lg border border-border break-words px-4 py-3 text-left text-sm transition-colors",
                      !feedback && "hover:border-primary/60",
                      eliminated.includes(option) && "opacity-40 line-through",
                      selected === option && !feedback && "border-primary bg-primary/10",
                      (revealed || feedback) &&
                        isAnswer &&
                        "border-success bg-success/10 text-success",
                      feedback &&
                        selected === option &&
                        !isAnswer &&
                        "border-destructive bg-destructive/10 text-destructive",
                      !gone && revealed && !isAnswer && "opacity-70",
                    )}
                  >
                    <MathText text={option} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {isTrueFalse && showOptions && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            {["true", "false"].map((option) => {
              const isAnswer = option === question.answer.toLowerCase();
              return (
                <button
                  key={option}
                  disabled={!!feedback}
                  onClick={() => {
                    setSelected(option);
                    commit(checkAnswer(question, option) ? "correct" : "incorrect", option);
                  }}
                  className={cn(
                    "rounded-lg border border-border py-4 text-sm font-medium capitalize transition-colors hover:border-primary/60",
                    selected === option && !feedback && "border-primary bg-primary/10",
                    (revealed || feedback) &&
                      isAnswer &&
                      "border-success bg-success/10 text-success",
                    feedback &&
                      selected === option &&
                      !isAnswer &&
                      "border-destructive bg-destructive/10 text-destructive",
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        )}

        {["fill-blank", "short-answer", "flashcard"].includes(question.type) && (
          <div className="mt-6 space-y-3">
            <Input
              ref={answerInput}
              value={input}
              disabled={!!feedback}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (!revealed) reveal();
                  else if (feedback) advance();
                }
              }}
              placeholder={
                question.type === "flashcard"
                  ? "Recall it, then reveal to check"
                  : "Type your answer and press Enter…"
              }
            />
            {["fill-blank", "short-answer"].includes(question.type) && revealed && !feedback && (
              <div className="flex flex-wrap gap-2">
                <Button
                  className="min-h-[44px]"
                  onClick={() => commit("correct", input)}
                  disabled={!input.trim()}
                >
                  <Check /> Submit
                </Button>
                <Button variant="outline" className="min-h-[44px]" onClick={() => commit("skip")}>
                  <SkipForward /> Skip
                </Button>
              </div>
            )}
          </div>
        )}

        {(deck.isSTEM || deck.needsEquations) &&
          ["fill-blank", "short-answer"].includes(question.type) &&
          !feedback &&
          !revealed && <MathKeypad target={answerInput} onValue={setInput} />}

        {isInteractive(question.type) && !feedback && (
          <div className="mt-6 space-y-3">
            <InteractiveQuestion
              question={question}
              value={input}
              onChange={setInput}
              disabled={revealed}
              revealed={revealed}
            />
            {!revealed ? (
              <Button className="min-h-[44px]" onClick={reveal}>
                <Eye /> Reveal answer
              </Button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  className="min-h-[44px] bg-success text-success-foreground hover:brightness-95"
                  onClick={() =>
                    commit(checkAnswer(question, input) ? "correct" : "incorrect", input)
                  }
                >
                  <Check /> Check
                </Button>
              </div>
            )}
          </div>
        )}

        {revealed && !feedback && (
          <div className="mt-6 rounded-xl border border-success/40 bg-success/10 p-5">
            <p className="text-xs uppercase tracking-widest text-success">Answer</p>
            <p className="mt-2 text-lg font-medium">
              <MathText text={displayAnswer(question)} />
            </p>
            {question.type === "flashcard" && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  className="min-h-[44px] bg-success text-success-foreground hover:brightness-95"
                  onClick={() => commit("correct")}
                >
                  <Check /> I knew it
                </Button>
                <Button
                  variant="destructive"
                  className="min-h-[44px]"
                  onClick={() => commit("incorrect")}
                >
                  <X /> I missed it
                </Button>
              </div>
            )}
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
              {feedback.correct ? "Correct" : "Not quite"}
            </p>
            {!feedback.correct && (
              <p className="mt-2 text-sm">
                <span className="text-muted-foreground">Answer: </span>
                <MathText text={displayAnswer(question)} />
              </p>
            )}
            {explainOpen && (
              <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                {question.explanation ? (
                  <p className="text-sm text-muted-foreground">
                    <MathText text={question.explanation} />
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No explanation is saved for this card yet.
                  </p>
                )}
                {question.options && (
                  <ul className="mt-2 grid gap-1.5 text-xs">
                    {question.options.map((option) => {
                      const why = question.tutor?.whyWrong?.find(
                        (entry) => entry.option === option,
                      )?.why;
                      return (
                        <li
                          key={option}
                          className={cn(
                            "flex gap-2",
                            option === question.answer ? "text-success" : "text-muted-foreground",
                          )}
                        >
                          {option === question.answer ? (
                            <Check className="mt-0.5 size-3.5 shrink-0" />
                          ) : (
                            <X className="mt-0.5 size-3.5 shrink-0" />
                          )}
                          <span>
                            <MathText text={option} />
                            {why && (
                              <span className="mt-0.5 block opacity-80">
                                <MathText text={why} />
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* Hint · Reveal · Explain — the MCQ action bar */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-border/60 pt-4">
          <Button
            variant="outline"
            size="sm"
            className="min-h-[40px]"
            disabled={!!feedback || revealed}
            onClick={hint}
          >
            <Lightbulb /> Hint
            {eliminated.length > 0 && (
              <span className="text-[10px] text-muted-foreground">−1 option</span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[40px]"
            disabled={!!feedback || revealed}
            onClick={reveal}
          >
            <Eye /> Reveal
          </Button>
          <Button variant="outline" size="sm" className="min-h-[40px]" onClick={explain}>
            <Sparkles /> Explain
          </Button>
          <Button
            variant={question.tutor ? "secondary" : "outline"}
            size="sm"
            className="min-h-[40px]"
            onClick={() => setTutorOpen((open) => !open)}
            aria-expanded={tutorOpen}
          >
            <GraduationCap /> Tutor
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto min-h-[40px]"
            onClick={() => setNoteOpen((n) => !n)}
          >
            <StickyNote /> Note
          </Button>
        </div>

        {tutorOpen && <TutorPanel question={question} onClose={() => setTutorOpen(false)} />}

        {hintsUsed > 0 && !feedback && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Hints used this round: {hintsUsed}. Hints don't cost a heart.
          </p>
        )}

        {noteOpen && (
          <Textarea
            className="mt-3"
            placeholder="Write a personal note for this card…"
            value={deck.notes[question.id] ?? ""}
            onChange={(e) =>
              updateDeck(deck.id, { notes: { ...deck.notes, [question.id]: e.target.value } })
            }
          />
        )}

        {feedback && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {hearts > 0 ? (
              <Button className="min-h-[44px]" onClick={advance}>
                {qi + 1 >= queue.length ? "Finish round" : "Next card"} <ArrowRight />
              </Button>
            ) : (
              <Button
                variant="destructive"
                className="min-h-[44px]"
                onClick={() => setPhase("failed")}
              >
                <Heart /> Out of hearts
              </Button>
            )}
            {question.type !== "multiple-choice" &&
              question.type !== "true-false" &&
              question.type !== "flashcard" &&
              ["short-answer", "fill-blank"].includes(question.type) && (
                <Button variant="outline" className="min-h-[44px]" onClick={() => commit("skip")}>
                  <SkipForward /> Skip
                </Button>
              )}
          </div>
        )}

        {!feedback && !revealed && !isChoice && !isTrueFalse && !isInteractive(question.type) && (
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="secondary" className="min-h-[44px]" onClick={reveal}>
              Reveal answer
            </Button>
          </div>
        )}
      </article>

      <p className="mt-4 hidden text-center text-[11px] text-muted-foreground sm:block">
        Space reveal · Enter next · H hint · E explain · T tutor
      </p>
    </div>,
  );
}

/* ------------------------------------------------------------------ */

/**
 * The tutor, pre-written into the question JSON. No AI call, no network — the
 * notes travel with the card, so they work in a session and offline.
 */
function TutorPanel({ question, onClose }: { question: Question; onClose: () => void }) {
  const tutor = question.tutor;
  const wrong = (tutor?.whyWrong ?? []).filter(
    (entry) => entry.option !== question.answer && entry.why.trim(),
  );

  return (
    <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary">
          <GraduationCap className="size-3.5" /> Tutor
        </p>
        <button
          onClick={onClose}
          aria-label="Close tutor notes"
          className="grid min-h-[28px] min-w-[28px] place-items-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {!tutor && !question.explanation && (
        <p className="mt-3 text-sm text-muted-foreground">
          This card was written without tutor notes. Add a few in Deck tools and they will appear
          here while you study.
        </p>
      )}

      {tutor?.simple && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            In plain words
          </p>
          <p className="mt-1 text-sm">
            <MathText text={tutor.simple} />
          </p>
        </div>
      )}

      {tutor?.mnemonic && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Remember it</p>
          <p className="mt-1 text-sm font-medium text-primary">
            <MathText text={tutor.mnemonic} />
          </p>
        </div>
      )}

      {tutor?.example && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Example</p>
          <p className="mt-1 text-sm text-muted-foreground">
            <MathText text={tutor.example} />
          </p>
        </div>
      )}

      {wrong.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Why the others are wrong
          </p>
          <ul className="mt-1 grid gap-1.5 text-sm">
            {wrong.map((entry) => (
              <li key={entry.option} className="flex gap-2">
                <X className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                <span>
                  <span className="font-medium">
                    <MathText text={entry.option} />
                  </span>{" "}
                  <span className="text-muted-foreground">
                    <MathText text={entry.why} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!tutor && question.explanation && (
        <p className="mt-3 text-sm text-muted-foreground">
          <MathText text={question.explanation} />
        </p>
      )}
    </div>
  );
}

function HeartBar({ hearts }: { hearts: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${hearts} of ${MAX_HEARTS} hearts left`}>
      {Array.from({ length: MAX_HEARTS }, (_, i) => (
        <Heart
          key={i}
          className={cn(
            "size-4",
            i < hearts ? "fill-destructive text-destructive" : "text-muted-foreground/40",
          )}
        />
      ))}
      <span className="ml-1 text-[11px] text-muted-foreground">
        {hearts}/{MAX_HEARTS}
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2/60 p-3">
      <p className="font-display text-lg font-bold leading-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function RecapList({ answers, questions }: { answers: AnswerRecord[]; questions: Question[] }) {
  if (!answers.length) return null;
  const byId = new Map(questions.map((q) => [q.id, q]));
  return (
    <section className="panel mt-4 p-5">
      <h2 className="text-sm font-semibold">This round, in order</h2>
      <ul className="mt-3 grid gap-2">
        {answers.map((a, i) => {
          const q = byId.get(a.questionId);
          return (
            <li
              key={`${a.questionId}-${i}`}
              className="flex items-start gap-2 rounded-lg bg-surface-2/50 px-3 py-2 text-sm"
            >
              <span
                className={cn(
                  "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[9px] text-white",
                  a.skipped ? "bg-muted-foreground" : a.correct ? "bg-success" : "bg-destructive",
                )}
              >
                {a.skipped ? "–" : a.correct ? "✓" : "✗"}
              </span>
              <span className="min-w-0">
                <span className="block break-words">
                  {q ? <MathText text={q.question} /> : a.questionId}
                </span>
                {!a.correct && q && (
                  <span className="mt-0.5 block text-xs text-success">
                    <MathText text={displayAnswer(q)} />
                  </span>
                )}
              </span>
              <ChevronRight className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
