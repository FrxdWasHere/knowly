import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Star, Plus, Layers } from "lucide-react";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SrsStatusBadge } from "@/components/srs/srs-status-badge";
import { deckSrs } from "@/lib/srs";
import { useKnowly } from "@/store/knowly";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/decks/")({
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search['q'] === "string" ? { q: search['q'] as string } : {},
  head: () => ({
    meta: [
      { title: "Deck Library — Search, Tag & Track Decks | Knowly" },
      {
        name: "description",
        content:
          "Browse your offline deck library: search, sort, favorite and filter decks by tag while tracking completion for each one.",
      },
      { property: "og:title", content: "Deck Library — Knowly" },
      {
        property: "og:description",
        content: "All your locally stored study decks, searchable and sortable.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <DeckLibrary />
    </AppPage>
  ),
});

function DeckLibrary() {
  const { state, updateDeck } = useKnowly();
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const [sort, setSort] = useState("recent");
  const [tag, setTag] = useState("all");

  const tags = useMemo(
    () => Array.from(new Set(state.decks.flatMap((d) => d.tags))),
    [state.decks],
  );

  const decks = useMemo(() => {
    let list = state.decks.filter(
      (d) =>
        (tag === "all" || d.tags.includes(tag)) &&
        (d.title.toLowerCase().includes(q.toLowerCase()) ||
          d.subject.toLowerCase().includes(q.toLowerCase()) ||
          d.tags.some((t) => t.toLowerCase().includes(q.toLowerCase()))),
    );
    list = [...list].sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      switch (sort) {
        case "title":
          return a.title.localeCompare(b.title);
        case "questions":
          return b.questions.length - a.questions.length;
        case "due":
          return deckSrs(b).due - deckSrs(a).due;
        case "completion":
          return (
            b.masteredIds.length / Math.max(1, b.questions.length) -
            a.masteredIds.length / Math.max(1, a.questions.length)
          );
        default:
          return (b.lastStudiedAt ?? b.createdAt) - (a.lastStudiedAt ?? a.createdAt);
      }
    });
    return list;
  }, [state.decks, q, sort, tag]);

  return (
    <div>
      <PageHeader
        title="Deck Library"
        description={`${state.decks.length} deck${state.decks.length === 1 ? "" : "s"} stored on this device.`}
        action={
          <Button asChild>
            <Link to="/import">
              <Plus /> Import deck
            </Link>
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search decks, subjects, tags…"
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently studied</SelectItem>
            <SelectItem value="due">Most due now</SelectItem>
            <SelectItem value="title">Title A–Z</SelectItem>
            <SelectItem value="questions">Most questions</SelectItem>
            <SelectItem value="completion">Completion</SelectItem>
          </SelectContent>
        </Select>
        {tags.length > 0 && (
          <Select value={tag} onValueChange={setTag}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {tags.map((t) => (
                <SelectItem key={t} value={t}>
                  #{t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {state.settings.focusSubjects.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Your subjects:</span>
          {state.settings.focusSubjects.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQ(q.toLowerCase() === s.toLowerCase() ? "" : s)}
              className={cn(
                "press rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                q.toLowerCase() === s.toLowerCase()
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {decks.length === 0 ? (
        <div className="panel grid place-items-center p-16 text-center">
          <Layers className="size-8 text-muted-foreground" />
          <p className="mt-4 font-medium">No decks found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate a prompt, run it in your AI, then import the JSON.
          </p>
          <Button className="mt-5" asChild>
            <Link to="/generate">Open Prompt Forge</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {decks.map((d) => {
            const pct = Math.round((d.masteredIds.length / Math.max(1, d.questions.length)) * 100);
            const srs = deckSrs(d);
            return (
              <div key={d.id} className="panel group relative overflow-hidden p-0">
                <div className="h-20 w-full" style={{ background: d.color, opacity: 0.85 }} />
                <div className="absolute left-3 top-3 z-10">
                  <SrsStatusBadge deck={d} />
                </div>
                <button
                  aria-label="Toggle favorite"
                  onClick={() => updateDeck(d.id, { favorite: !d.favorite })}
                  className="absolute right-3 top-3 rounded-full bg-background/70 p-2 backdrop-blur"
                >
                  <Star
                    className={cn(
                      "size-4",
                      d.favorite ? "fill-primary text-primary" : "text-muted-foreground",
                    )}
                  />
                </button>
                <div className="p-5">
                  <Link
                    to="/decks/$deckId"
                    params={{ deckId: d.id }}
                    className="font-display text-lg font-bold hover:text-primary"
                  >
                    {d.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {d.subject} · {d.questions.length} questions
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {d.tags.slice(0, 3).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">
                        #{t}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Completion</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {srs.fresh} new · {srs.learning} learning · {srs.young} young · {srs.mature}{" "}
                      mature
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {srs.due > 0 && (
                      <Button size="sm" className="anim-glow" asChild>
                        <Link to="/review" search={{ deck: d.id }}>
                          Review {srs.due}
                        </Link>
                      </Button>
                    )}
                    <Button size="sm" variant={srs.due > 0 ? "secondary" : "default"} asChild>
                      <Link to="/study/$deckId" params={{ deckId: d.id }}>
                        Study
                      </Link>
                    </Button>
                    <Button size="sm" variant="secondary" asChild>
                      <Link to="/arena/$deckId" params={{ deckId: d.id }}>
                        Arena
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/import" search={{ deck: d.id }}>
                        <Plus /> Add
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/decks/$deckId" params={{ deckId: d.id }}>
                        Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}