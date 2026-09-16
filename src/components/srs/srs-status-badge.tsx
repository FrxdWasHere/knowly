import { Link } from "@tanstack/react-router";
import { Check, Clock, Sparkles } from "lucide-react";
import { SrsRing } from "@/components/srs/srs-ring";
import { deckSrs, formatDue } from "@/lib/srs";
import { cn } from "@/lib/utils";
import type { Deck } from "@/lib/types";

/**
 * Corner status indicator for a deck: due count, next review time or a
 * "caught up" tick, wrapped in a ring showing how much of the deck is
 * scheduled long-term.
 */
export function SrsStatusBadge({
  deck,
  className,
  asLink = true,
}: {
  deck: Deck;
  className?: string;
  asLink?: boolean;
}) {
  const s = deckSrs(deck);
  const caughtUp = s.due === 0 && s.total > 0;
  const untouched = s.total > 0 && s.fresh === s.total;

  const tone = caughtUp
    ? "var(--success)"
    : untouched
      ? "var(--muted-foreground)"
      : "var(--primary)";

  const label = !s.total
    ? "Empty"
    : caughtUp
      ? `Caught up · next ${formatDue(s.nextDue)}`
      : untouched
        ? `${s.due} to learn`
        : `${s.due} due now`;

  const body = (
    <span
      className={cn(
        "press flex items-center gap-2 rounded-full border bg-background/80 py-1 pl-1 pr-3 text-[11px] font-semibold shadow-sm backdrop-blur transition-colors",
        caughtUp
          ? "border-success/40 text-success hover:border-success"
          : untouched
            ? "border-border text-muted-foreground hover:border-primary/50"
            : "border-primary/45 text-primary hover:border-primary",
        className,
      )}
      title={`${s.total} cards · ${s.fresh} new · ${s.learning} learning · ${s.young} young · ${s.mature} mature · ease ${s.ease}`}
    >
      <SrsRing value={caughtUp ? 100 : s.health} size={26} stroke={3} color={tone}>
        {caughtUp ? (
          <Check className="size-3" />
        ) : untouched ? (
          <Sparkles className="size-3" />
        ) : (
          <span className="text-[9px]">{s.due > 99 ? "99+" : s.due}</span>
        )}
      </SrsRing>
      <span className="whitespace-nowrap">{label}</span>
    </span>
  );

  if (!asLink || !s.total) return body;

  return caughtUp ? (
    <Link to="/decks/$deckId" params={{ deckId: deck.id }} aria-label={label}>
      {body}
    </Link>
  ) : (
    <Link to="/review" search={{ deck: deck.id }} aria-label={label}>
      {body}
    </Link>
  );
}

/** Compact inline chip: just a dot + due count. Used in dense lists. */
export function SrsDueChip({ deck, className }: { deck: Deck; className?: string }) {
  const s = deckSrs(deck);
  if (!s.total) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        s.due ? "bg-primary/15 text-primary" : "bg-success/15 text-success",
        className,
      )}
    >
      <Clock className="size-3" />
      {s.due ? `${s.due} due` : formatDue(s.nextDue)}
    </span>
  );
}
