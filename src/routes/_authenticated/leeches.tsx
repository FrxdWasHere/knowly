import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Bug,
  PauseCircle,
  PlayCircle,
  Pencil,
  RotateCcw,
  Save,
  X,
  Layers,
  Gauge,
} from "lucide-react";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { MathText, MathKeypad } from "@/components/math/math-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useKnowly } from "@/store/knowly";
import { collectLeeches, formatDue, LEECH_THRESHOLD, type LeechItem } from "@/lib/srs";
import { TYPE_LABELS } from "@/lib/answers";
import { cn } from "@/lib/utils";
import type { Deck } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/leeches")({
  head: () => ({
    meta: [
      { title: "Trouble Cards — Fix Cards You Keep Forgetting | Knowly" },
      {
        name: "description",
        content:
          "Find the cards you forget over and over, then pause them, reset their schedule or rewrite them so they finally stick. Works fully offline.",
      },
      { property: "og:title", content: "Trouble Cards — Knowly" },
      {
        property: "og:description",
        content: "Pause, reset or rewrite the cards that keep lapsing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppPage>
      <LeechesPage />
    </AppPage>
  ),
});

function LeechesPage() {
  const { state, updateDeck } = useKnowly();
  const [threshold, setThreshold] = useState(LEECH_THRESHOLD);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftQ, setDraftQ] = useState("");
  const [draftA, setDraftA] = useState("");
  const answerField = useRef<HTMLInputElement>(null);

  const leeches = useMemo(() => collectLeeches(state.decks, threshold), [state.decks, threshold]);
  const active = leeches.filter((l) => !l.suspended);
  const paused = leeches.filter((l) => l.suspended);

  const worstDeck = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of active) counts.set(l.deckTitle, (counts.get(l.deckTitle) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return top ? `${top[0]} (${top[1]})` : "—";
  }, [active]);

  const totalLapses = active.reduce((n, l) => n + l.lapses, 0);

  const deckOf = (id: string) => state.decks.find((d) => d.id === id) as Deck | undefined;

  function toggleSuspend(item: LeechItem) {
    const deck = deckOf(item.deckId);
    if (!deck) return;
    const current = deck.suspended ?? [];
    const next = item.suspended
      ? current.filter((id) => id !== item.question.id)
      : [...current, item.question.id];
    updateDeck(deck.id, { suspended: next });
    toast.success(item.suspended ? "Card back in rotation" : "Card paused");
  }

  function resetCard(item: LeechItem) {
    const deck = deckOf(item.deckId);
    if (!deck) return;
    const srs = { ...(deck.srs ?? {}) };
    delete srs[item.question.id];
    updateDeck(deck.id, {
      srs,
      suspended: (deck.suspended ?? []).filter((id) => id !== item.question.id),
    });
    toast.success("Schedule reset — the card starts fresh");
  }

  function startEdit(item: LeechItem) {
    setEditing(item.question.id);
    setDraftQ(item.question.question);
    setDraftA(item.question.answer);
  }

  function saveEdit(item: LeechItem) {
    const deck = deckOf(item.deckId);
    if (!deck) return;
    const q = draftQ.trim();
    const a = draftA.trim();
    if (!q || !a) {
      toast.error("Question and answer cannot be empty");
      return;
    }
    updateDeck(deck.id, {
      questions: deck.questions.map((x) =>
        x.id === item.question.id ? { ...x, question: q, answer: a } : x,
      ),
    });
    setEditing(null);
    toast.success("Card rewritten");
  }

  function suspendAll() {
    const byDeck = new Map<string, string[]>();
    for (const l of active) {
      byDeck.set(l.deckId, [...(byDeck.get(l.deckId) ?? []), l.question.id]);
    }
    for (const [deckId, ids] of byDeck) {
      const deck = deckOf(deckId);
      if (!deck) continue;
      updateDeck(deckId, {
        suspended: Array.from(new Set([...(deck.suspended ?? []), ...ids])),
      });
    }
    toast.success(`Paused ${active.length} trouble card${active.length === 1 ? "" : "s"}`);
  }

  const stats = [
    { label: "Cards you keep missing", value: String(active.length), icon: Bug },
    { label: "Paused cards", value: String(paused.length), icon: PauseCircle },
    { label: "Times missed", value: String(totalLapses), icon: Gauge },
    { label: "Worst deck", value: worstDeck, icon: Layers },
  ];

  return (
    <div>
      <PageHeader
        title="Trouble Cards"
        description="Cards you keep forgetting drain a whole study session. Pause them, reset their schedule, or rewrite them into something memorable."
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/weak-spots">Weak spots</Link>
            </Button>
            <Button onClick={suspendAll} disabled={!active.length}>
              <PauseCircle /> Pause all
            </Button>
          </div>
        }
      />

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="panel p-5">
            <s.icon className="size-4 text-primary" />
            <p className="mt-3 truncate font-display text-2xl font-bold">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="panel mb-6 flex flex-wrap items-center gap-4 p-5">
        <Label className="text-xs text-muted-foreground">
          Shows up here after you miss it {threshold} time{threshold === 1 ? "" : "s"}
        </Label>
        <Slider
          value={[threshold]}
          min={1}
          max={8}
          step={1}
          onValueChange={([v]) => setThreshold(v ?? LEECH_THRESHOLD)}
          className="w-56"
        />
      </section>

      <section className="panel p-6">
        <h2 className="text-sm font-semibold">Trouble cards</h2>
        {leeches.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing is lapsing repeatedly. Keep reviewing — any card you miss {threshold} or more
            times will show up here.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {leeches.map((item) => {
              const isEditing = editing === item.question.id;
              return (
                <li
                  key={`${item.deckId}-${item.question.id}`}
                  className={cn(
                    "rounded-lg border px-4 py-3",
                    item.suspended ? "border-border bg-secondary/30" : "border-border",
                  )}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Question</Label>
                        <Textarea
                          value={draftQ}
                          onChange={(e) => setDraftQ(e.target.value)}
                          rows={2}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Answer</Label>
                        <Input
                          ref={answerField}
                          value={draftA}
                          onChange={(e) => setDraftA(e.target.value)}
                          className="mt-1.5"
                        />
                        <MathKeypad className="mt-2" target={answerField} onValue={setDraftA} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(item)}>
                          <Save /> Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                          <X /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "truncate text-sm font-medium",
                              item.suspended && "text-muted-foreground line-through",
                            )}
                          >
                            <MathText text={item.question.question} />
                          </p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            <MathText text={item.question.answer} />
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="size-2 rounded-full"
                                style={{ background: item.deckColor }}
                              />
                              <span>
                                <MathText text={item.deckTitle} />
                              </span>
                            </span>
                            <span>·</span>
                            <span>{TYPE_LABELS[item.question.type]}</span>
                            <span>·</span>
                            <span className="font-mono">
                              difficulty {item.card.ease} · due {formatDue(item.card.due)}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <Badge
                            variant="outline"
                            className={
                              item.suspended
                                ? "border-border text-muted-foreground"
                                : "border-destructive/50 text-destructive"
                            }
                          >
                            {item.suspended ? "Paused" : `missed ${item.lapses}×`}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => toggleSuspend(item)}>
                          {item.suspended ? <PlayCircle /> : <PauseCircle />}
                          {item.suspended ? "Resume" : "Pause"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => resetCard(item)}>
                          <RotateCcw /> Reset schedule
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(item)}>
                          <Pencil /> Rewrite
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
