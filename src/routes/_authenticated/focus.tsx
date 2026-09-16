import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Coffee,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  Timer as TimerIcon,
} from "lucide-react";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useKnowly } from "@/store/knowly";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/focus")({
  head: () => ({
    meta: [
      { title: "Focus Timer — Offline Pomodoro Sessions | Knowly" },
      {
        name: "description",
        content:
          "Run focused study blocks with an offline pomodoro timer: adjustable focus and break lengths, long breaks, round tracking and one-tap links into your review queue.",
      },
      { property: "og:title", content: "Focus Timer — Knowly" },
      {
        property: "og:description",
        content: "Offline pomodoro timer built for study blocks, with rounds and breaks.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <FocusPage />
    </AppPage>
  ),
});

type Phase = "focus" | "short" | "long";

const PHASE_LABEL: Record<Phase, string> = {
  focus: "Focus",
  short: "Short break",
  long: "Long break",
};

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function beep() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.75);
    setTimeout(() => void ctx.close(), 1000);
  } catch {
    /* audio is optional */
  }
}

function FocusPage() {
  const { state } = useKnowly();

  const [focusMin, setFocusMin] = useState(25);
  const [shortMin, setShortMin] = useState(5);
  const [longMin, setLongMin] = useState(15);
  const [roundsBeforeLong, setRoundsBeforeLong] = useState(4);
  const [soundOn, setSoundOn] = useState(true);

  const [phase, setPhase] = useState<Phase>("focus");
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(25 * 60);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [focusSeconds, setFocusSeconds] = useState(0);

  const phaseLength = useMemo(
    () => (phase === "focus" ? focusMin : phase === "short" ? shortMin : longMin) * 60,
    [phase, focusMin, shortMin, longMin],
  );

  const advanceRef = useRef<() => void>(() => {});

  const goToPhase = useCallback(
    (next: Phase) => {
      setPhase(next);
      setRemaining((next === "focus" ? focusMin : next === "short" ? shortMin : longMin) * 60);
    },
    [focusMin, shortMin, longMin],
  );

  const advance = useCallback(() => {
    if (phase === "focus") {
      const rounds = completedRounds + 1;
      setCompletedRounds(rounds);
      goToPhase(rounds % roundsBeforeLong === 0 ? "long" : "short");
    } else {
      goToPhase("focus");
    }
  }, [phase, completedRounds, roundsBeforeLong, goToPhase]);

  advanceRef.current = advance;

  // Tick
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (soundOn) beep();
          window.setTimeout(() => advanceRef.current(), 0);
          return 0;
        }
        return r - 1;
      });
      setFocusSeconds((f) => (phase === "focus" ? f + 1 : f));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, soundOn, phase]);

  // Keep remaining in sync when lengths change while idle
  useEffect(() => {
    if (!running) setRemaining(phaseLength);
  }, [phaseLength, running]);

  const reset = () => {
    setRunning(false);
    setPhase("focus");
    setRemaining(focusMin * 60);
    setCompletedRounds(0);
    setFocusSeconds(0);
  };

  const pct = phaseLength > 0 ? 1 - remaining / phaseLength : 0;
  const size = 260;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;

  const dueCount = useMemo(() => {
    const now = Date.now();
    let n = 0;
    for (const deck of state.decks) {
      for (const card of Object.values(deck.srs ?? {})) {
        if (card && typeof card.due === "number" && card.due <= now) n += 1;
      }
    }
    return n;
  }, [state.decks]);

  const numberRow = (
    label: string,
    value: number,
    set: (n: number) => void,
    min: number,
    max: number,
    suffix: string,
  ) => (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/50 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="outline"
          className="size-7"
          disabled={running || value <= min}
          onClick={() => set(Math.max(min, value - 1))}
          aria-label={`Decrease ${label}`}
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="w-14 text-center text-sm font-semibold tabular-nums">
          {value} {suffix}
        </span>
        <Button
          size="icon"
          variant="outline"
          className="size-7"
          disabled={running || value >= max}
          onClick={() => set(Math.min(max, value + 1))}
          aria-label={`Increase ${label}`}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Focus Timer"
        description="Offline pomodoro blocks for deep study. Nothing leaves your device."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex flex-col items-center justify-center gap-6 rounded-xl border border-border/60 bg-card/60 p-8">
          <Badge variant={phase === "focus" ? "default" : "secondary"} className="gap-1.5">
            {phase === "focus" ? <TimerIcon className="size-3.5" /> : <Coffee className="size-3.5" />}
            {PHASE_LABEL[phase]}
          </Badge>

          <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={stroke}
                className="stroke-muted/40"
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - pct)}
                className={cn(
                  "transition-[stroke-dashoffset] duration-500",
                  phase === "focus" ? "stroke-primary" : "stroke-[var(--success)]",
                )}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold tabular-nums tracking-tight">{fmt(remaining)}</span>
              <span className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                Round {completedRounds + (phase === "focus" ? 1 : 0)} of {roundsBeforeLong}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button size="lg" onClick={() => setRunning((r) => !r)}>
              {running ? <Pause className="size-4" /> : <Play className="size-4" />}
              {running ? "Pause" : remaining === phaseLength ? "Start" : "Resume"}
            </Button>
            <Button variant="outline" onClick={() => advance()}>
              <SkipForward className="size-4" />
              Skip phase
            </Button>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw className="size-4" />
              Reset
            </Button>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="space-y-3 rounded-xl border border-border/60 bg-card/60 p-4">
            <h2 className="text-sm font-semibold">Block lengths</h2>
            {numberRow("Focus", focusMin, setFocusMin, 5, 120, "min")}
            {numberRow("Short break", shortMin, setShortMin, 1, 30, "min")}
            {numberRow("Long break", longMin, setLongMin, 5, 60, "min")}
            {numberRow("Rounds to long break", roundsBeforeLong, setRoundsBeforeLong, 2, 8, "x")}
            <Button
              variant={soundOn ? "secondary" : "outline"}
              className="w-full"
              onClick={() => setSoundOn((s) => !s)}
            >
              Chime {soundOn ? "on" : "off"}
            </Button>
          </div>

          <div className="space-y-2 rounded-xl border border-border/60 bg-card/60 p-4">
            <h2 className="text-sm font-semibold">This sitting</h2>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Rounds completed</span>
              <span className="font-semibold tabular-nums">{completedRounds}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Time focused</span>
              <span className="font-semibold tabular-nums">
                {Math.floor(focusSeconds / 60)}m {focusSeconds % 60}s
              </span>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-border/60 bg-card/60 p-4">
            <h2 className="text-sm font-semibold">Study during this block</h2>
            <p className="text-xs text-muted-foreground">
              {dueCount > 0
                ? `${dueCount} card${dueCount === 1 ? " is" : "s are"} due right now.`
                : "Nothing is due — drill weak spots or cram instead."}
            </p>
            <div className="grid gap-2">
              <Button asChild variant="secondary">
                <Link to="/review">Open Daily Review</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/weak-spots">Drill weak spots</Link>
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
