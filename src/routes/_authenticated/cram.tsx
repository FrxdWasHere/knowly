import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Eye, Flame, RotateCcw, Timer, X, Zap } from "lucide-react";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useKnowly } from "@/store/knowly";
import { TYPE_LABELS, formatDuration, shuffleArray } from "@/lib/answers";
import { displayAnswer } from "@/lib/interactive";
import { xpForAnswer } from "@/lib/gamification";
import { cardStage, weakness, type SrsCard } from "@/lib/srs";
import { cn } from "@/lib/utils";
import type { AnswerRecord, Deck, Question } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/cram")({
  head: () => ({
    meta: [
      { title: "Cram Mode — Rapid-Fire Pre-Exam Blitz | Knowly" },
      {
        name: "description",
        content:
          "Blitz through as many cards as you can before an exam. Cram Mode ignores your review schedule, keeps a combo going and never changes your spaced repetition dates.",
      },
      { property: "og:title", content: "Cram Mode — Knowly" },
      {
        property: "og:description",
        content: "A fast, schedule-free blitz through your decks right before an exam.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <CramPage />
    </AppPage>
  ),
});

type Order = "random" | "weakest" | "unseen";
type CramItem = { deckId: string; deckTitle: string; deckColor: string; question: Question };

const COUNTS = [10, 20, 50, 100, 0] as const;
const SECONDS = [0, 5, 10, 20] as const;
const ORDERS: { id: Order; label: string; hint: string }[] = [
  { id: "random", label: "Shuffled", hint: "Pure random order" },
  { id: "weakest", label: "Weakest first", hint: "Lapses and low ease lead" },
  { id: "unseen", label: "Unseen first", hint: "Cards you have never reviewed" },
];

function buildQueue(decks: Deck[], ids: string[], order: Order, count: number): CramItem[] {
  let items: CramItem[] = [];
  for (const deck of decks) {
    if (!ids.includes(deck.id)) continue;
    for (const q of deck.questions) {
      items.push({ deckId: deck.id, deckTitle: deck.title, deckColor: deck.color, question: q });
    }
  }
  const srsOf = (item: CramItem): SrsCard | undefined =>
    decks.find((d) => d.id === item.deckId)?.srs?.[item.question.id];

  if (order === "random") {
    items = shuffleArray(items);
  } else if (order === "weakest") {
    items.sort((a, b) => {
      const ca = srsOf(a);
      const cb = srsOf(b);
      return (cb ? weakness(cb) : 0) - (ca ? weakness(ca) : 0);
    });
  } else {
    items.sort((a, b) => {
      const av = cardStage(srsOf(a)) === "new" ? 0 : 1;
      const bv = cardStage(srsOf(b)) === "new" ? 0 : 1;
      return av - bv;
    });
  }
  return count > 0 ? items.slice(0, count) : items;
}

function CramPage() {
  const { state, recordSession } = useKnowly();
  const navigate = useNavigate();
  const decks = state.decks;

  const [selected, setSelected] = useState<string[]>(() => decks.map((d) => d.id));
  const [order, setOrder] = useState<Order>("random");
  const [count, setCount] = useState<number>(20);
  const [seconds, setSeconds] = useState<number>(0);
  const [queue, setQueue] = useState<CramItem[] | null>(null);

  const available = useMemo(
    () => decks.filter((d) => selected.includes(d.id)).reduce((n, d) => n + d.questions.length, 0),
    [decks, selected],
  );

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  if (queue) {
    return (
      <CramRun
        items={queue}
        seconds={seconds}
        xpEnabled={state.settings.xpEnabled}
        onRecord={recordSession}
        onExit={() => setQueue(null)}
        onHome={() => navigate({ to: "/dashboard" })}
      />
    );
  }

  if (!decks.length) {
    return (
      <div className="panel mx-auto max-w-xl p-12 text-center">
        <Flame className="mx-auto size-10 text-primary" />
        <h1 className="mt-5 font-display text-2xl font-bold">Nothing to cram yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add a deck first, then come back here the night before your exam.
        </p>
        <Button className="mt-7" asChild>
          <Link to="/decks">Browse decks</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Cram Mode"
        description="A schedule-free blitz for the night before an exam. Answer fast, keep the combo alive — your spaced repetition dates stay untouched."
      />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="panel p-6">
          <h2 className="text-sm font-semibold">Decks</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {decks.map((d) => {
              const on = selected.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggle(d.id)}
                  className={cn(
                    "press flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                    on ? "border-primary/60 bg-primary/10" : "border-border hover:bg-surface-2/60",
                  )}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: d.color }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{d.title}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {d.questions.length} cards
                    </span>
                  </span>
                  {on && <Check className="size-4 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(decks.map((d) => d.id))}>
              Select all
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              Clear
            </Button>
          </div>
        </section>

        <section className="panel p-6">
          <h2 className="text-sm font-semibold">Blitz settings</h2>

          <p className="mt-5 text-xs uppercase tracking-widest text-muted-foreground">Cards</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {COUNTS.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={count === c ? "default" : "outline"}
                onClick={() => setCount(c)}
              >
                {c === 0 ? "All" : c}
              </Button>
            ))}
          </div>

          <p className="mt-5 text-xs uppercase tracking-widest text-muted-foreground">Order</p>
          <div className="mt-2 grid gap-2">
            {ORDERS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setOrder(o.id)}
                className={cn(
                  "press rounded-lg border px-4 py-2.5 text-left transition-colors",
                  order === o.id
                    ? "border-primary/60 bg-primary/10"
                    : "border-border hover:bg-surface-2/60",
                )}
              >
                <span className="block text-sm font-medium">{o.label}</span>
                <span className="block text-[11px] text-muted-foreground">{o.hint}</span>
              </button>
            ))}
          </div>

          <p className="mt-5 text-xs uppercase tracking-widest text-muted-foreground">
            Seconds per card
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SECONDS.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={seconds === s ? "default" : "outline"}
                onClick={() => setSeconds(s)}
              >
                {s === 0 ? "Off" : `${s}s`}
              </Button>
            ))}
          </div>

          <Button
            className="mt-7 w-full"
            disabled={!selected.length || available === 0}
            onClick={() => setQueue(buildQueue(decks, selected, order, count))}
          >
            <Flame /> Start blitz
          </Button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            {available} card{available === 1 ? "" : "s"} available ·{" "}
            {count === 0 ? "all" : Math.min(count, available)} in this run
          </p>
        </section>
      </div>
    </div>
  );
}

function CramRun({
  items,
  seconds,
  xpEnabled,
  onRecord,
  onExit,
  onHome,
}: {
  items: CramItem[];
  seconds: number;
  xpEnabled: boolean;
  onRecord: ReturnType<typeof useKnowly>["recordSession"];
  onExit: () => void;
  onHome: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState<CramItem[]>([]);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [xp, setXp] = useState(0);
  const [left, setLeft] = useState(seconds);
  const [done, setDone] = useState(false);
  const started = useRef(Date.now());
  const questionStart = useRef(Date.now());
  const answers = useRef<AnswerRecord[]>([]);
  const recorded = useRef(false);

  const item = items[index];
  const total = items.length;

  const finish = useCallback(() => {
    if (recorded.current) return;
    recorded.current = true;
    const all = answers.current;
    const deckIds = Array.from(new Set(all.map((a) => a.deckId)));
    const deckTitles = Array.from(
      new Set(items.filter((i) => deckIds.includes(i.deckId)).map((i) => i.deckTitle)),
    );
    const conceptStats: Record<string, { correct: number; total: number }> = {};
    all.forEach((a) => {
      if (!a.concept) return;
      const prev = conceptStats[a.concept] ?? { correct: 0, total: 0 };
      conceptStats[a.concept] = {
        correct: prev.correct + (a.correct ? 1 : 0),
        total: prev.total + 1,
      };
    });
    onRecord({
      mode: "study",
      deckIds,
      deckTitles,
      answered: all.length,
      correct: all.filter((a) => a.correct).length,
      skipped: 0,
      durationMs: Date.now() - started.current,
      xpEarned: xpEnabled ? xp : 0,
      bestCombo,
      masteredIds: {},
      conceptStats,
    });
    setDone(true);
  }, [bestCombo, items, onRecord, xp, xpEnabled]);

  const answer = useCallback(
    (correct: boolean) => {
      if (!item) return;
      const record: AnswerRecord = {
        questionId: item.question.id,
        deckId: item.deckId,
        type: item.question.type,
        difficulty: item.question.difficulty,
        concept: item.question.concept,
        correct,
        skipped: false,
        timeMs: Date.now() - questionStart.current,
      };
      answers.current = [...answers.current, record];
      const nextCombo = correct ? combo + 1 : 0;
      setCombo(nextCombo);
      setBestCombo((b) => Math.max(b, nextCombo));
      if (correct) {
        setHits((h) => h + 1);
        setXp((x) => x + xpForAnswer(record, nextCombo));
      } else {
        setMisses((m) => [...m, item]);
      }
      setRevealed(false);
      setLeft(seconds);
      questionStart.current = Date.now();
      if (index + 1 >= total) finish();
      else setIndex((i) => i + 1);
    },
    [combo, finish, index, item, seconds, total],
  );

  // per-card countdown
  useEffect(() => {
    if (!seconds || done) return;
    setLeft(seconds);
    const id = window.setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          window.clearInterval(id);
          answer(false);
          return seconds;
        }
        return l - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, seconds, done]);

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
      if (e.key === "1" || e.key.toLowerCase() === "j") answer(false);
      if (e.key === "2" || e.key.toLowerCase() === "k") answer(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, done, revealed]);

  if (done) {
    const answered = answers.current.length;
    const pct = answered ? Math.round((hits / answered) * 100) : 0;
    return (
      <div className="panel mx-auto max-w-xl p-10 text-center">
        <Flame className="mx-auto size-9 text-primary" />
        <h1 className="mt-4 font-display text-3xl font-bold">Blitz complete</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {answered} card{answered === 1 ? "" : "s"} · schedule untouched
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { v: `${pct}%`, l: "Accuracy" },
            { v: String(hits), l: "Got it" },
            { v: String(misses.length), l: "Missed" },
            { v: `${bestCombo}x`, l: "Best combo" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl bg-surface-2/60 p-3">
              <p className="font-display text-xl font-bold">{s.v}</p>
              <p className="text-[11px] text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-2/60 p-3">
            <p className="font-display text-xl font-bold">+{xpEnabled ? xp : 0}</p>
            <p className="text-[11px] text-muted-foreground">XP earned</p>
          </div>
          <div className="rounded-xl bg-surface-2/60 p-3">
            <p className="font-display text-xl font-bold">
              {formatDuration(Date.now() - started.current)}
            </p>
            <p className="text-[11px] text-muted-foreground">Time</p>
          </div>
        </div>

        {misses.length > 0 && (
          <ul className="mt-6 max-h-52 space-y-1.5 overflow-y-auto text-left">
            {misses.map((m) => (
              <li
                key={`${m.deckId}-${m.question.id}`}
                className="truncate rounded-lg border border-border px-3 py-2 text-xs"
              >
                {m.question.question}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 flex justify-center gap-2">
          <Button onClick={onExit}>
            <RotateCcw /> New blitz
          </Button>
          <Button variant="outline" onClick={onHome}>
            Return home
          </Button>
        </div>
      </div>
    );
  }

  if (!item) return null;
  const q = item.question;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <ArrowLeft /> Cram setup
        </Button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {combo > 1 && (
            <span className="inline-flex items-center gap-1.5 text-primary">
              <Flame className="size-3.5" /> {combo}x
            </span>
          )}
          {seconds > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Timer className="size-3.5" /> {left}s
            </span>
          )}
          <span>
            {index + 1} / {total}
          </span>
          {xpEnabled && (
            <span className="inline-flex items-center gap-1 text-primary">
              <Zap className="size-3.5" />+{xp}
            </span>
          )}
        </div>
      </div>

      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(index / total) * 100}%` }}
        />
      </div>

      <article className="panel p-8">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 font-medium">
            <span className="size-2 rounded-full" style={{ background: item.deckColor }} />
            {item.deckTitle}
          </span>
          <Badge variant="outline">{TYPE_LABELS[q.type]}</Badge>
          <Badge variant="outline" className="capitalize">
            {q.difficulty}
          </Badge>
          {q.concept && <Badge variant="secondary">{q.concept}</Badge>}
        </div>

        <h1 className="mt-6 text-2xl font-semibold leading-snug">{q.question}</h1>

        {revealed ? (
          <>
            <div className="mt-6 rounded-xl border border-success/40 bg-success/10 p-5">
              <p className="text-xs uppercase tracking-widest text-success">Answer</p>
              <p className="mt-2 text-lg font-medium">{displayAnswer(q)}</p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20"
                onClick={() => answer(false)}
              >
                <X /> Missed <span className="ml-1 text-[10px] opacity-60">1</span>
              </Button>
              <Button
                variant="outline"
                className="border-success/50 bg-success/10 text-success hover:bg-success/20"
                onClick={() => answer(true)}
              >
                <Check /> Got it <span className="ml-1 text-[10px] opacity-60">2</span>
              </Button>
            </div>
          </>
        ) : (
          <Button
            className="mt-6 min-h-[44px]"
            variant="secondary"
            onClick={() => setRevealed(true)}
          >
            <Eye /> Reveal{" "}
            <span className="ml-1 hidden text-[10px] opacity-60 sm:inline">Space</span>
          </Button>
        )}
      </article>

      <p className="mt-4 hidden text-center text-[11px] text-muted-foreground sm:block">
        Space reveals · 1 missed · 2 got it — nothing here changes your review schedule
      </p>
    </div>
  );
}
