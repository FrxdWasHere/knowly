import { Link } from "@tanstack/react-router";
import { CheckCircle2, Play } from "lucide-react";
import { SrsRing } from "@/components/srs/srs-ring";
import { Button } from "@/components/ui/button";
import { collectDue, deckSrs, forecast, formatDue, STAGE_META } from "@/lib/srs";
import { cn } from "@/lib/utils";
import type { Deck } from "@/lib/types";

/** Dashboard widget body: today's review load, 7-day forecast and deck queue. */
export function SrsDashboardWidget({ decks }: { decks: Deck[] }) {
  const now = Date.now();
  const due = collectDue(decks, now);
  const days = forecast(decks, 7, now);
  const peak = Math.max(1, ...days.map((d) => d.count));

  const totals = decks.reduce(
    (acc, d) => {
      const s = deckSrs(d, now);
      acc.total += s.total;
      acc.fresh += s.fresh;
      acc.learning += s.learning;
      acc.young += s.young;
      acc.mature += s.mature;
      acc.retention += s.retention * (s.total || 0);
      return acc;
    },
    { total: 0, fresh: 0, learning: 0, young: 0, mature: 0, retention: 0 },
  );
  const retention = totals.total ? Math.round(totals.retention / totals.total) : 0;
  const scheduledPct = totals.total
    ? Math.round(((totals.young + totals.mature) / totals.total) * 100)
    : 0;

  const perDeck = decks
    .map((d) => ({ deck: d, srs: deckSrs(d, now) }))
    .filter((x) => x.srs.due > 0)
    .sort((a, b) => b.srs.due - a.srs.due)
    .slice(0, 4);

  const nextUp = decks
    .map((d) => deckSrs(d, now).nextDue)
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b)[0];

  const stages = [
    { key: "new" as const, count: totals.fresh },
    { key: "learning" as const, count: totals.learning },
    { key: "young" as const, count: totals.young },
    { key: "mature" as const, count: totals.mature },
  ].filter((s) => s.count > 0);

  return (
    <div className="space-y-6">
      <div className="grid items-center gap-6 xl:grid-cols-[minmax(260px,0.8fr)_minmax(420px,1.2fr)]">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-5">
        <SrsRing
          value={due.length ? Math.min(100, (due.length / Math.max(1, totals.total)) * 100) : 100}
          size={86}
          stroke={7}
          color={due.length ? "var(--primary)" : "var(--success)"}
        >
          <span className="text-center">
            {due.length ? (
              <>
                <span className="block font-display text-xl font-bold leading-none">
                  {due.length}
                </span>
                <span className="block text-[9px] text-muted-foreground">due</span>
              </>
            ) : (
              <CheckCircle2 className="size-6 text-success" />
            )}
          </span>
        </SrsRing>

        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-tight">
            {due.length
              ? `${due.length} card${due.length === 1 ? "" : "s"} ready for recall`
              : "All caught up"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {due.length
              ? `${scheduledPct}% of your library is on a long-term schedule · ${retention}% retention`
              : nextUp
                ? `Next card ripens ${formatDue(nextUp, now)} · ${retention}% retention`
                : "Study a deck to start scheduling cards."}
          </p>
          <Button size="sm" className="press mt-3 anim-glow" asChild>
            <Link to="/review">
              <Play /> {due.length ? "Start review" : "Review ahead"}
            </Link>
          </Button>
        </div>

        {/* 7 day forecast */}
        <div className="min-w-0 border-t border-border pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          <p className="text-[11px] font-medium text-muted-foreground">Next 7 days</p>
          <div className="mt-2 grid grid-cols-7 items-end gap-1.5">
            {days.map((d) => (
              <div key={d.key} className="flex min-w-0 flex-col items-center gap-1">
                <span className="text-[9px] text-muted-foreground">{d.count || ""}</span>
                <div
                  className={cn(
                    "w-full min-w-3 rounded-t-md transition-all duration-500",
                    d.isToday ? "bg-primary" : "bg-primary/35",
                  )}
                  style={{ height: `${Math.max(3, (d.count / peak) * 68)}px` }}
                  title={`${d.count} card${d.count === 1 ? "" : "s"} on ${d.key}`}
                />
                <span
                  className={cn(
                    "truncate text-[10px]",
                    d.isToday ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {(stages.length > 0 || perDeck.length > 0) && (
        <div
          className={cn(
            "grid gap-5 border-t border-border pt-5",
            stages.length > 0 && perDeck.length > 0 && "lg:grid-cols-[minmax(240px,0.75fr)_minmax(0,1.25fr)]",
          )}
        >
          {/* maturity mix */}
          {stages.length > 0 && <div className="min-w-0">
            <p className="mb-2 text-[11px] font-medium text-muted-foreground">Memory stages</p>
          <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
            {stages.map((s) => (
              <span
                key={s.key}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{
                  width: `${(s.count / Math.max(1, totals.total)) * 100}%`,
                  background: STAGE_META[s.key].color,
                }}
                title={`${s.count} ${STAGE_META[s.key].label}`}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            {stages.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ background: STAGE_META[s.key].color }}
                />
                {STAGE_META[s.key].label} {s.count}
              </span>
            ))}
          </div>
          </div>}

          {/* per-deck queue */}
          {perDeck.length > 0 && <div className="min-w-0">
            <p className="mb-2 text-[11px] font-medium text-muted-foreground">Due by deck</p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {perDeck.map(({ deck, srs }) => (
                <li key={deck.id} className="min-w-0">
              <Link
                to="/review"
                search={{ deck: deck.id }}
                className="press flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:border-primary/60"
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: deck.color }} />
                <span className="min-w-0 flex-1 truncate">{deck.title}</span>
                <span className="shrink-0 text-xs font-semibold text-primary">{srs.due} due</span>
              </Link>
                </li>
              ))}
            </ul>
          </div>}
        </div>
      )}
    </div>
  );
}
