import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Bug, Target, TrendingDown } from "lucide-react";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { MathText } from "@/components/math/math-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useKnowly } from "@/store/knowly";
import { collectWeak, formatDue, weakness, type SrsCard } from "@/lib/srs";
import { TYPE_LABELS } from "@/lib/answers";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/weak-spots")({
  head: () => ({
    meta: [
      { title: "Weak Spots — Target What You Keep Forgetting | Knowly" },
      {
        name: "description",
        content:
          "See the cards and concepts you keep getting wrong, ranked by how shaky they are, then drill only those in a focused offline session.",
      },
      { property: "og:title", content: "Weak Spots — Knowly" },
      {
        property: "og:description",
        content: "Rank your shakiest cards and concepts, then drill exactly those.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <WeakSpotsPage />
    </AppPage>
  ),
});

function WeakSpotsPage() {
  const { state } = useKnowly();

  const weak = useMemo(() => collectWeak(state.decks, 60), [state.decks]);

  const leeches = useMemo(() => weak.filter((w) => (w.card as SrsCard).lapses >= 3), [weak]);

  const avgEase = useMemo(() => {
    if (!weak.length) return 0;
    const sum = weak.reduce((acc, w) => acc + (w.card as SrsCard).ease, 0);
    return Number((sum / weak.length).toFixed(2));
  }, [weak]);

  const concepts = useMemo(
    () =>
      Object.entries(state.progress.conceptStats)
        .map(([name, s]) => ({ name, ...s, pct: Math.round((s.correct / s.total) * 100) }))
        .filter((c) => c.total >= 2 && c.pct < 80)
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 10),
    [state.progress.conceptStats],
  );

  const cards = [
    { label: "Shaky cards", value: String(weak.length), icon: TrendingDown },
    { label: "Missed 3+ times", value: String(leeches.length), icon: Bug },
    { label: "Average difficulty", value: weak.length ? avgEase.toFixed(2) : "—", icon: Target },
    { label: "Weak concepts", value: String(concepts.length), icon: AlertTriangle },
  ];

  return (
    <div>
      <PageHeader
        title="Weak Spots"
        description="The cards that keep slipping and the concepts dragging your accuracy down — all worked out on this device from your own review history."
        action={
          <Button asChild disabled={!weak.length}>
            <Link to="/review" search={{ mode: "weak" }}>
              <Target /> Drill weak spots
            </Link>
          </Button>
        }
      />

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="panel p-5">
            <c.icon className="size-4 text-primary" />
            <p className="mt-3 font-display text-2xl font-bold">{c.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </section>

      <div
        className={cn(
          "grid items-start gap-6",
          weak.length > 0 && concepts.length > 0 && "xl:grid-cols-[1.25fr_0.75fr]",
        )}
      >
        <section className="panel p-6">
          <h2 className="text-sm font-semibold">Shakiest cards</h2>
          {weak.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nothing is lapsing yet. Once you review cards and miss a few, they will collect here.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {weak.slice(0, 25).map((w) => {
                const card = w.card as SrsCard;
                return (
                  <li
                    key={`${w.deckId}-${w.question.id}`}
                    className="rounded-lg border border-border px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          <MathText text={w.question.question} />
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="size-2 rounded-full"
                              style={{ background: w.deckColor }}
                            />
                            {w.deckTitle}
                          </span>
                          <span>·</span>
                          <span>{TYPE_LABELS[w.question.type]}</span>
                          {w.question.concept && (
                            <>
                              <span>·</span>
                              <span>{w.question.concept}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            card.lapses >= 3
                              ? "border-destructive/50 text-destructive"
                              : "border-warning/50 text-warning",
                          )}
                        >
                          missed {card.lapses}×
                        </Badge>
                        <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                          difficulty {card.ease} · due {formatDue(card.due)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-destructive/70"
                        style={{
                          width: `${Math.min(100, Math.round((weakness(card) / 15) * 100))}%`,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel p-6">
          <h2 className="text-sm font-semibold">Concepts below 80%</h2>
          {concepts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No weak concepts yet — answer more questions tagged with a concept to build this list.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {concepts.map((c) => (
                <div key={c.name}>
                  <div className="flex justify-between text-xs">
                    <span className="truncate">{c.name}</span>
                    <span className="text-muted-foreground">
                      {c.correct}/{c.total} · {c.pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        c.pct >= 50 ? "bg-warning" : "bg-destructive",
                      )}
                      style={{ width: `${Math.max(3, c.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
