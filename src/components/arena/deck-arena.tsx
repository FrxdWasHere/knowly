import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Flame,
  Heart,
  RotateCcw,
  Swords,
  Timer,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { checkAnswer, formatDuration, shuffleArray, TYPE_LABELS } from "@/lib/answers";
import { displayAnswer, isInteractive } from "@/lib/interactive";
import {
  InteractiveQuestion,
  isInteractiveComplete,
} from "@/components/questions/interactive-question";
import { useKnowly } from "@/store/knowly";
import { cn } from "@/lib/utils";
import type { Question } from "@/lib/types";


const BASE_XP: Record<string, number> = { easy: 8, medium: 12, hard: 18 };
const PENALTY: Record<string, number> = { easy: 6, medium: 8, hard: 10 };
const ROUND_SECONDS = 30;
const START_LIVES = 3;

type Phase = "intro" | "playing" | "over";

interface Floater {
  id: number;
  text: string;
  good: boolean;
}

export function DeckArena({ deckId }: { deckId: string }) {
  const { state, recordSession } = useKnowly();
  const navigate = useNavigate();
  const deck = state.decks.find((d) => d.id === deckId);

  const [phase, setPhase] = useState<Phase>("intro");
  const [queue, setQueue] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [roundXp, setRoundXp] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [mastered, setMastered] = useState<string[]>([]);
  const [concepts, setConcepts] = useState<Record<string, { correct: number; total: number }>>({});
  const [seconds, setSeconds] = useState(ROUND_SECONDS);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const startedAt = useRef(Date.now());
  const banked = useRef(false);
  const floatId = useRef(0);

  const question = queue[index];
  const shuffledOptions = useMemo(
    () => (question?.options ? shuffleArray(question.options) : []),
    [question],
  );

  const pushFloater = (text: string, good: boolean) => {
    const id = ++floatId.current;
    setFloaters((f) => [...f, { id, text, good }]);
    window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 1100);
  };

  const start = () => {
    if (!deck) return;
    setQueue(shuffleArray(deck.questions));
    setPhase("playing");
    setIndex(0);
    setInput("");
    setRevealed(false);
    setWasCorrect(null);
    setRoundXp(0);
    setCombo(0);
    setBestCombo(0);
    setLives(START_LIVES);
    setCorrect(0);
    setAnswered(0);
    setMastered([]);
    setConcepts({});
    setSeconds(ROUND_SECONDS);
    banked.current = false;
    startedAt.current = Date.now();
  };

  const resolve = useCallback(
    (isCorrect: boolean, timedOut = false) => {
      if (!question || revealed) return;
      const multiplier = 1 + Math.min(combo, 5) * 0.25;
      const delta = isCorrect
        ? Math.round((BASE_XP[question.difficulty] ?? 10) * multiplier)
        : -(PENALTY[question.difficulty] ?? 8);

      setRoundXp((x) => x + delta);
      pushFloater(`${delta > 0 ? "+" : ""}${delta} XP`, isCorrect);
      setRevealed(true);
      setWasCorrect(isCorrect);
      setAnswered((a) => a + 1);

      if (isCorrect) {
        setCorrect((c) => c + 1);
        setCombo((c) => {
          const next = c + 1;
          setBestCombo((b) => Math.max(b, next));
          return next;
        });
        setMastered((m) => [...m, question.id]);
      } else {
        setCombo(0);
        setLives((l) => l - 1);
        if (timedOut) pushFloater("Time!", false);
      }

      const key = question.concept ?? "General";
      setConcepts((c) => ({
        ...c,
        [key]: {
          correct: (c[key]?.correct ?? 0) + (isCorrect ? 1 : 0),
          total: (c[key]?.total ?? 0) + 1,
        },
      }));
    },
    [combo, question, revealed],
  );

  const next = () => {
    if (lives <= 0 || index + 1 >= queue.length) {
      setPhase("over");
      return;
    }
    setIndex((i) => i + 1);
    setInput("");
    setRevealed(false);
    setWasCorrect(null);
    setSeconds(ROUND_SECONDS);
  };

  // Countdown per round.
  useEffect(() => {
    if (phase !== "playing" || revealed) return;
    const t = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          window.clearInterval(t);
          resolve(false, true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [phase, revealed, resolve]);

  // Bank the surviving XP into the profile once the round ends.
  useEffect(() => {
    if (phase !== "over" || banked.current || !deck) return;
    banked.current = true;
    recordSession({
      mode: "quiz",
      deckIds: [deck.id],
      deckTitles: [deck.title],
      answered,
      correct,
      skipped: 0,
      durationMs: Date.now() - startedAt.current,
      xpEarned: Math.max(0, roundXp),
      bestCombo,
      masteredIds: { [deck.id]: mastered },
      conceptStats: concepts,
    });
  }, [
    phase,
    deck,
    recordSession,
    answered,
    correct,
    roundXp,
    bestCombo,
    mastered,
    concepts,
  ]);

  if (!deck) {
    return (
      <div className="panel anim-pop grid place-items-center p-16 text-center">
        <p className="font-medium">Deck not found</p>
        <Button className="mt-4" asChild>
          <Link to="/decks">Back to library</Link>
        </Button>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="panel anim-fade-up mx-auto max-w-2xl overflow-hidden p-0">
        <div className="relative grid place-items-center bg-primary/10 px-8 py-12 text-center">
          <Swords className="anim-float size-10 text-primary" />
          <h1 className="mt-4 font-display text-3xl font-bold">Arena · {deck.title}</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            A fast XP duel against your own deck. Answer correctly to bank XP and build a combo
            multiplier — miss and you lose XP and a life.
          </p>
        </div>
        <div className="stagger grid gap-3 p-8 sm:grid-cols-3">
          <Stat icon={Zap} label="Correct" value="+8 to +18 XP" />
          <Stat icon={X} label="Wrong" value="−6 to −10 XP" />
          <Stat icon={Flame} label="Combo" value="up to ×2.25" />
          <Stat icon={Heart} label="Lives" value={`${START_LIVES}`} />
          <Stat icon={Timer} label="Per question" value={`${ROUND_SECONDS}s`} />
          <Stat icon={Trophy} label="Questions" value={`${deck.questions.length}`} />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-border p-6">
          <Button size="lg" className="press anim-glow" onClick={start}>
            <Swords /> Enter the arena
          </Button>
          <Button size="lg" variant="ghost" asChild>
            <Link to="/decks/$deckId" params={{ deckId: deck.id }}>
              Back to deck
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "over") {
    const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
    const survived = Math.max(0, roundXp);
    return (
      <div className="panel anim-pop mx-auto max-w-2xl p-8 text-center">
        <Trophy className="anim-float mx-auto size-10 text-primary" />
        <h1 className="mt-4 font-display text-3xl font-bold">
          {lives > 0 ? "Round complete" : "Out of lives"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {survived.toLocaleString()} XP banked into your profile.
        </p>
        <div className="stagger mt-8 grid gap-3 sm:grid-cols-4">
          <Stat icon={Zap} label="XP banked" value={`${survived}`} />
          <Stat icon={Check} label="Accuracy" value={`${accuracy}%`} />
          <Stat icon={Flame} label="Best combo" value={`${bestCombo}`} />
          <Stat
            icon={Timer}
            label="Duration"
            value={formatDuration(Date.now() - startedAt.current)}
          />
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button className="press" onClick={start}>
            <RotateCcw /> Play again
          </Button>
          <Button
            variant="outline"
            className="press"
            onClick={() => navigate({ to: "/decks/$deckId", params: { deckId: deck.id } })}
          >
            Back to deck
          </Button>
        </div>
      </div>
    );
  }

  const progress = ((index + (revealed ? 1 : 0)) / queue.length) * 100;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="anim-fade-in flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {Array.from({ length: START_LIVES }).map((_, i) => (
            <Heart
              key={i}
              className={cn(
                "size-5 transition-all duration-300",
                i < lives ? "fill-destructive text-destructive" : "scale-90 text-muted-foreground/40",
              )}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary" className="gap-1">
            <Zap className="size-3 text-primary" /> {roundXp} XP
          </Badge>
          <Badge variant="secondary" className={cn("gap-1", combo >= 2 && "anim-pop text-primary")}>
            <Flame className="size-3" /> ×{(1 + Math.min(combo, 5) * 0.25).toFixed(2)}
          </Badge>
          <Badge
            variant="secondary"
            className={cn("gap-1", seconds <= 5 && !revealed && "anim-shake text-destructive")}
          >
            <Timer className="size-3" /> {seconds}s
          </Badge>
          <Badge variant="secondary">
            {index + 1}/{queue.length}
          </Badge>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div
        key={question.id}
        className={cn(
          "panel relative mt-6 overflow-hidden p-8",
          revealed && wasCorrect === true && "border-success/60",
          revealed && wasCorrect === false && "anim-shake border-destructive/60",
          !revealed && "anim-slide-left",
        )}
      >
        <div className="pointer-events-none absolute right-6 top-6 flex flex-col items-end gap-1">
          {floaters.map((f) => (
            <span
              key={f.id}
              className={cn(
                "anim-rise text-sm font-bold",
                f.good ? "text-success" : "text-destructive",
              )}
            >
              {f.text}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{TYPE_LABELS[question.type]}</Badge>
          <Badge variant="outline">{question.difficulty}</Badge>
          {question.concept && <Badge variant="outline">{question.concept}</Badge>}
        </div>

        <h2 className="mt-5 font-display text-2xl font-bold leading-snug">{question.question}</h2>

        {question.type === "multiple-choice" || question.type === "true-false" ? (
          <div className="stagger mt-6 grid gap-2">
            {(question.type === "true-false" ? ["True", "False"] : shuffledOptions).map((opt) => {
              const isAnswer = opt.trim().toLowerCase() === question.answer.trim().toLowerCase();
              const chosen = input === opt;
              return (
                <button
                  key={opt}
                  disabled={revealed}
                  onClick={() => {
                    setInput(opt);
                    resolve(checkAnswer(question, opt));
                  }}
                  className={cn(
                    "press rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-left text-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60",
                    revealed && isAnswer && "border-success bg-success/15",
                    revealed && chosen && !isAnswer && "border-destructive bg-destructive/15",
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : question.type === "flashcard" ? (
          <div className="mt-6">
            {revealed ? (
              <p className="anim-fade-up rounded-xl border border-border bg-surface-2/60 p-4 text-sm">
                {question.answer}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button className="press" onClick={() => resolve(true)}>
                  <Check /> I knew it
                </Button>
                <Button variant="outline" className="press" onClick={() => resolve(false)}>
                  <X /> I missed it
                </Button>
              </div>
            )}
          </div>
        ) : isInteractive(question.type) ? (
          <div className="space-y-3">
            <InteractiveQuestion
              question={question}
              value={input}
              onChange={setInput}
              disabled={revealed}
              revealed={revealed}
            />
            <Button
              className="press"
              disabled={revealed || !isInteractiveComplete(question, input)}
              onClick={() => resolve(checkAnswer(question, input))}
            >
              Lock in
            </Button>
          </div>
        ) : (
          <form
            className="mt-6 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!revealed && input.trim()) resolve(checkAnswer(question, input));
            }}
          >
            <Input
              autoFocus
              value={input}
              disabled={revealed}
              placeholder="Type your answer…"
              onChange={(e) => setInput(e.target.value)}
              className="min-w-56 flex-1"
            />
            <Button type="submit" className="press" disabled={revealed || !input.trim()}>
              Lock in
            </Button>
          </form>
        )}


        {revealed && (
          <div className="anim-fade-up mt-6 border-t border-border pt-5">
            <p
              className={cn(
                "text-sm font-semibold",
                wasCorrect ? "text-success" : "text-destructive",
              )}
            >
              {wasCorrect ? "Correct" : `Answer: ${displayAnswer(question)}`}
            </p>
            {question.explanation && (
              <p className="mt-2 text-sm text-muted-foreground">{question.explanation}</p>
            )}
            <Button className="press anim-pop mt-5" onClick={next}>
              {lives <= 0 || index + 1 >= queue.length ? "See results" : "Next"} <ArrowRight />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="hover-lift rounded-xl border border-border bg-surface-2/60 p-4 text-center">
      <Icon className="mx-auto size-4 text-primary" />
      <p className="mt-2 text-sm font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
