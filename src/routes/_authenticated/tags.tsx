import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Hash, Lightbulb, Layers, Search, ChevronDown, ChevronRight } from "lucide-react";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { MathText } from "@/components/math/math-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useKnowly } from "@/store/knowly";
import { TYPE_LABELS } from "@/lib/answers";
import { cn } from "@/lib/utils";
import type { Deck, Question } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/tags")({
  head: () => ({
    meta: [
      { title: "Tag & Concept Explorer — Browse Your Whole Library | Knowly" },
      {
        name: "description",
        content:
          "Browse every card in your library by tag or concept, see how many cards each one covers, how well you know it, and jump straight into the deck. Fully offline.",
      },
      { property: "og:title", content: "Tag & Concept Explorer — Knowly" },
      {
        property: "og:description",
        content: "Browse your whole card library by tag and concept.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppPage>
      <TagExplorerPage />
    </AppPage>
  ),
});

type Entry = {
  key: string;
  kind: "tag" | "concept";
  label: string;
  cards: { deck: Deck; question: Question }[];
  deckTitles: string[];
  mastered: number;
  accuracy: number | null;
};

function TagExplorerPage() {
  const { state } = useKnowly();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "tag" | "concept">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const entries = useMemo<Entry[]>(() => {
    const map = new Map<string, Entry>();
    const add = (k: "tag" | "concept", label: string, deck: Deck, question: Question) => {
      const clean = label.trim();
      if (!clean) return;
      const key = `${k}:${clean.toLowerCase()}`;
      let entry = map.get(key);
      if (!entry) {
        entry = {
          key,
          kind: k,
          label: clean,
          cards: [],
          deckTitles: [],
          mastered: 0,
          accuracy: null,
        };
        map.set(key, entry);
      }
      entry.cards.push({ deck, question });
      if (!entry.deckTitles.includes(deck.title)) entry.deckTitles.push(deck.title);
      if (deck.masteredIds.includes(question.id)) entry.mastered += 1;
    };

    for (const deck of state.decks) {
      for (const question of deck.questions) {
        for (const t of question.tags ?? []) add("tag", t, deck, question);
        for (const t of deck.tags ?? []) add("tag", t, deck, question);
        if (question.concept) add("concept", question.concept, deck, question);
      }
    }

    const stats = state.progress.conceptStats;
    for (const entry of map.values()) {
      if (entry.kind === "concept") {
        const s = stats[entry.label];
        entry.accuracy = s && s.total ? Math.round((s.correct / s.total) * 100) : null;
      }
    }

    return [...map.values()].sort(
      (a, b) => b.cards.length - a.cards.length || a.label.localeCompare(b.label),
    );
  }, [state.decks, state.progress.conceptStats]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(
      (e) => (kind === "all" || e.kind === kind) && (!q || e.label.toLowerCase().includes(q)),
    );
  }, [entries, kind, query]);

  const active = entries.find((e) => e.key === selected) ?? null;

  const tagCount = entries.filter((e) => e.kind === "tag").length;
  const conceptCount = entries.filter((e) => e.kind === "concept").length;
  const untagged = state.decks.reduce(
    (n, d) =>
      n + d.questions.filter((q) => !q.concept && !(q.tags?.length ?? 0) && !d.tags.length).length,
    0,
  );

  const stats = [
    { label: "Tags", value: String(tagCount), icon: Hash },
    { label: "Concepts", value: String(conceptCount), icon: Lightbulb },
    { label: "Decks covered", value: String(state.decks.length), icon: Layers },
    { label: "Unlabelled cards", value: String(untagged), icon: Search },
  ];

  return (
    <div>
      <PageHeader
        title="Tag & Concept Explorer"
        description="Every label across your library in one place. Pick a tag or concept to see exactly which cards carry it, which decks they live in, and how well you know them."
        action={
          <Button variant="outline" asChild>
            <Link to="/cards">Card browser</Link>
          </Button>
        }
      />

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="panel p-5">
            <s.icon className="size-4 text-primary" />
            <p className="mt-3 font-display text-2xl font-bold">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="panel mb-6 flex flex-wrap items-center gap-3 p-5">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tags and concepts"
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "tag", "concept"] as const).map((k) => (
            <Button
              key={k}
              size="sm"
              variant={kind === k ? "default" : "outline"}
              onClick={() => setKind(k)}
            >
              {k === "all" ? "All" : k === "tag" ? "Tags" : "Concepts"}
            </Button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Labels</h2>
          {filtered.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nothing matches. Add tags or concepts to your cards and they will show up here.
            </p>
          ) : (
            <ul className="mt-4 space-y-1.5">
              {filtered.map((e) => (
                <li key={e.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(e.key);
                      setOpen(null);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                      selected === e.key
                        ? "border-primary/50 bg-primary/10"
                        : "border-border hover:bg-secondary/40",
                    )}
                  >
                    {e.kind === "tag" ? (
                      <Hash className="size-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <Lightbulb className="size-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm">{e.label}</span>
                    {e.accuracy !== null && (
                      <span
                        className={cn(
                          "font-mono text-[11px]",
                          e.accuracy < 80 ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        {e.accuracy}%
                      </span>
                    )}
                    <Badge variant="outline" className="shrink-0 text-[11px]">
                      {e.cards.length}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel p-6">
          {!active ? (
            <p className="text-sm text-muted-foreground">
              Pick a tag or concept on the left to see every card that carries it.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold">{active.label}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {active.cards.length} card{active.cards.length === 1 ? "" : "s"} ·{" "}
                    {active.mastered} mastered · {active.deckTitles.length} deck
                    {active.deckTitles.length === 1 ? "" : "s"}
                    {active.accuracy !== null ? ` · ${active.accuracy}% accuracy` : ""}
                  </p>
                </div>
                <Badge variant="outline">{active.kind === "tag" ? "Tag" : "Concept"}</Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {active.deckTitles.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[11px]">
                    {t}
                  </Badge>
                ))}
              </div>

              <ul className="mt-5 space-y-2">
                {active.cards.map(({ deck, question }) => {
                  const id = `${deck.id}-${question.id}`;
                  const expanded = open === id;
                  return (
                    <li key={id} className="rounded-lg border border-border px-4 py-3">
                      <button
                        type="button"
                        className="flex w-full items-start gap-2 text-left"
                        onClick={() => setOpen(expanded ? null : id)}
                      >
                        {expanded ? (
                          <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            <MathText text={question.question} />
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="size-2 rounded-full"
                                style={{ background: deck.color }}
                              />
                              {deck.title}
                            </span>
                            <span>·</span>
                            <span>{TYPE_LABELS[question.type]}</span>
                            <span>·</span>
                            <span className="capitalize">{question.difficulty}</span>
                            {deck.masteredIds.includes(question.id) && (
                              <>
                                <span>·</span>
                                <span className="text-primary">mastered</span>
                              </>
                            )}
                          </span>
                        </span>
                      </button>
                      {expanded && (
                        <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
                          <p>
                            <span className="text-xs text-muted-foreground">Answer: </span>
                            <MathText text={question.answer} />
                          </p>
                          {question.explanation && (
                            <p className="text-xs text-muted-foreground">
                              <MathText text={question.explanation} />
                            </p>
                          )}
                          <Button size="sm" variant="outline" asChild>
                            <Link to="/decks/$deckId" params={{ deckId: deck.id }}>
                              Open deck
                            </Link>
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
