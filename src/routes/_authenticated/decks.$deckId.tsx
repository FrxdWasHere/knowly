import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Star, Trash2, Download, Play, BrainCircuit, Bookmark, Swords , Plus, Brain }from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SrsRing } from "@/components/srs/srs-ring";
import { TYPE_LABELS } from "@/lib/answers";
import { cardStage, deckSrs, formatDue, formatInterval, STAGE_META } from "@/lib/srs";
import { useKnowly } from "@/store/knowly";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/decks/$deckId")({
  head: () => ({
    meta: [
      { title: "Deck Details — Knowly" },
      {
        name: "description",
        content:
          "Inspect every question in a Knowly deck, review bookmarks and notes, export the deck as JSON, or jump straight into study mode.",
      },
      { property: "og:title", content: "Deck Details — Knowly" },
      {
        property: "og:description",
        content: "Review a deck's questions, mastery progress and notes offline.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <DeckDetail />
    </AppPage>
  ),
});

function DeckDetail() {
  const { deckId } = Route.useParams();
  const { state, updateDeck, deleteDeck } = useKnowly();
  const navigate = useNavigate();
  const deck = state.decks.find((d) => d.id === deckId);

  if (!deck) {
    return (
      <div className="panel grid place-items-center p-16 text-center">
        <p className="font-medium">Deck not found</p>
        <Button className="mt-4" asChild>
          <Link to="/decks">Back to library</Link>
        </Button>
      </div>
    );
  }

  const pct = Math.round((deck.masteredIds.length / Math.max(1, deck.questions.length)) * 100);
  const srs = deckSrs(deck);

  const exportDeck = () => {
    const payload = {
      title: deck.title,
      subject: deck.subject,
      description: deck.description,
      tags: deck.tags,
      questions: deck.questions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${deck.title.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={deck.title}
        description={`${deck.subject} · ${deck.questions.length} questions · ${pct}% mastered`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => updateDeck(deck.id, { favorite: !deck.favorite })}>
              <Star className={cn(deck.favorite && "fill-primary text-primary")} />
              {deck.favorite ? "Favorited" : "Favorite"}
            </Button>
            <Button variant="outline" onClick={exportDeck}>
              <Download /> Export
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                deleteDeck(deck.id);
                toast.success("Deck deleted");
                navigate({ to: "/decks" });
              }}
            >
              <Trash2 /> Delete
            </Button>
            {srs.due > 0 && (
              <Button className="press anim-glow" asChild>
                <Link to="/review" search={{ deck: deck.id }}>
                  <Brain /> Review {srs.due} due
                </Link>
              </Button>
            )}
            <Button variant={srs.due > 0 ? "secondary" : "default"} asChild>
              <Link to="/study/$deckId" params={{ deckId: deck.id }}>
                <Play /> Study
              </Link>
            </Button>
            <Button className="press anim-glow" asChild>
              <Link to="/arena/$deckId" params={{ deckId: deck.id }}>
                <Swords /> Arena mode
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/import" search={{ deck: deck.id }}>
                <Plus /> Add questions
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/quiz">
                <BrainCircuit /> Quiz
              </Link>
            </Button>
          </div>
        }
      />

      {deck.description && <p className="mb-6 text-sm text-muted-foreground">{deck.description}</p>}

      <div className="mb-6 flex flex-wrap gap-2">
        {deck.tags.map((t) => (
          <Badge key={t} variant="secondary">
            #{t}
          </Badge>
        ))}
      </div>

      <section className="panel mb-6 flex flex-wrap items-center gap-6 p-5">
        <SrsRing
          value={srs.due ? Math.min(100, (srs.due / Math.max(1, srs.total)) * 100) : 100}
          size={72}
          stroke={6}
          color={srs.due ? "var(--primary)" : "var(--success)"}
        >
          <span className="text-center">
            <span className="block font-display text-lg font-bold leading-none">{srs.due}</span>
            <span className="block text-[9px] text-muted-foreground">due</span>
          </span>
        </SrsRing>
        <div className="min-w-48 flex-1">
          <p className="text-sm font-semibold">
            {srs.due
              ? `${srs.due} card${srs.due === 1 ? "" : "s"} ready to review`
              : `Caught up — next card ${formatDue(srs.nextDue)}`}
          </p>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-secondary">
            {(["new", "learning", "young", "mature"] as const).map((stage) => {
              const count =
                stage === "new"
                  ? srs.fresh
                  : stage === "learning"
                    ? srs.learning
                    : stage === "young"
                      ? srs.young
                      : srs.mature;
              if (!count) return null;
              return (
                <span
                  key={stage}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${(count / Math.max(1, srs.total)) * 100}%`,
                    background: STAGE_META[stage].color,
                  }}
                  title={`${count} ${STAGE_META[stage].label}`}
                />
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {srs.fresh} new · {srs.learning} learning · {srs.young} young · {srs.mature} mature ·
            ease {srs.ease} · {srs.retention}% retention
          </p>
        </div>
      </section>

      <div className="space-y-3">
        {deck.questions.map((q, i) => {
          const mastered = deck.masteredIds.includes(q.id);
          const bookmarked = deck.bookmarks.includes(q.id);
          const card = deck.srs?.[q.id];
          const stage = cardStage(card);
          return (
            <article key={q.id} className="panel p-5">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="font-mono">#{i + 1}</span>
                <Badge variant="outline">{TYPE_LABELS[q.type]}</Badge>
                <Badge variant="outline" className="capitalize">
                  {q.difficulty}
                </Badge>
                {q.concept && <Badge variant="secondary">{q.concept}</Badge>}
                {mastered && <Badge className="bg-success text-success-foreground">Mastered</Badge>}
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5"
                  title={card ? `Interval ${formatInterval(card.interval)}` : "Never reviewed"}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: STAGE_META[stage].color }}
                  />
                  {STAGE_META[stage].label}
                  {card ? ` · ${formatDue(card.due)}` : ""}
                </span>
                <button
                  className="ml-auto"
                  aria-label="Toggle bookmark"
                  onClick={() =>
                    updateDeck(deck.id, {
                      bookmarks: bookmarked
                        ? deck.bookmarks.filter((b) => b !== q.id)
                        : [...deck.bookmarks, q.id],
                    })
                  }
                >
                  <Bookmark
                    className={cn("size-4", bookmarked ? "fill-primary text-primary" : "")}
                  />
                </button>
              </div>
              <p className="mt-3 font-medium">{q.question}</p>
              {q.options && (
                <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {q.options.map((o) => (
                    <li
                      key={o}
                      className={cn(
                        "rounded-md border border-border px-3 py-1.5 text-xs",
                        o === q.answer && "border-success/60 text-success",
                      )}
                    >
                      {o}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-sm">
                <span className="text-muted-foreground">Answer: </span>
                <span className="text-success">{q.answer}</span>
              </p>
              {q.explanation && (
                <p className="mt-2 text-xs text-muted-foreground">{q.explanation}</p>
              )}
              {deck.notes[q.id] && (
                <p className="mt-2 rounded-md bg-surface-2/60 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Your note: </span>
                  {deck.notes[q.id]}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}