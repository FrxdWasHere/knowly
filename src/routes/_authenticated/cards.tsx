import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, ChevronDown, Search, Table2 } from "lucide-react";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useKnowly } from "@/store/knowly";
import { TYPE_LABELS } from "@/lib/answers";
import { displayAnswer } from "@/lib/interactive";
import { formatDue, isDue, type SrsCard } from "@/lib/srs";
import { questionTypes } from "@/lib/schema";
import { cn } from "@/lib/utils";
import type { Deck, Difficulty, Question, QuestionType } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/cards")({
  head: () => ({
    meta: [
      { title: "Card Browser — Every Question Across Every Deck | Knowly" },
      {
        name: "description",
        content:
          "Search, filter and inspect every card in your library — by deck, type, difficulty, bookmark or review status — fully offline.",
      },
      { property: "og:title", content: "Card Browser — Knowly" },
      {
        property: "og:description",
        content: "One searchable table for every card across all decks.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <CardBrowserPage />
    </AppPage>
  ),
});

type Row = {
  deckId: string;
  deckTitle: string;
  deckColor: string;
  srs: Record<string, SrsCard>;
  q: Question;
};
type SortKey = "deck" | "due" | "weakest" | "difficulty";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "deck", label: "By deck" },
  { key: "due", label: "Soonest due" },
  { key: "weakest", label: "Weakest first" },
  { key: "difficulty", label: "Hardest first" },
];

const DIFF_ORDER: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

function weaknessOf(card: SrsCard | undefined): number {
  if (!card || card.reps === 0) return -1;
  return card.lapses * 3 + Math.max(0, 2.5 - card.ease) * 4 - Math.min(card.streak, 5);
}

function CardBrowserPage() {
  const { state, updateDeck } = useKnowly();
  const [search, setSearch] = useState("");
  const [deckFilter, setDeckFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<QuestionType[]>([]);
  const [diffFilter, setDiffFilter] = useState<Difficulty[]>([]);
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [dueOnly, setDueOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("deck");
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const deck of state.decks) {
      const srs = deck.srs ?? {};
      for (const q of deck.questions) {
        out.push({ deckId: deck.id, deckTitle: deck.title, deckColor: deck.color, srs, q });
      }
    }
    return out;
  }, [state.decks]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const now = Date.now();
    const list = rows.filter(({ deckId, srs, q }) => {
      if (deckFilter.length && !deckFilter.includes(deckId)) return false;
      if (typeFilter.length && !typeFilter.includes(q.type)) return false;
      if (diffFilter.length && !diffFilter.includes(q.difficulty)) return false;
      if (
        bookmarkedOnly &&
        !state.decks.find((d: Deck) => d.id === deckId)?.bookmarks.includes(q.id)
      )
        return false;
      if (dueOnly && !isDue(srs[q.id], now)) return false;
      if (!needle) return true;
      const haystack = [q.question, q.answer, q.concept ?? "", (q.tags ?? []).join(" ")]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
    switch (sort) {
      case "due":
        list.sort((a, b) => (a.srs[a.q.id]?.due ?? 0) - (b.srs[b.q.id]?.due ?? 0));
        break;
      case "weakest":
        list.sort((a, b) => weaknessOf(b.srs[b.q.id]) - weaknessOf(a.srs[a.q.id]));
        break;
      case "difficulty":
        list.sort((a, b) => DIFF_ORDER[b.q.difficulty] - DIFF_ORDER[a.q.difficulty]);
        break;
      default:
        break; // already grouped by deck
    }
    return list;
  }, [
    rows,
    search,
    deckFilter,
    typeFilter,
    diffFilter,
    bookmarkedOnly,
    dueOnly,
    sort,
    state.decks,
  ]);

  const total = rows.length;

  const chip = (active: boolean) =>
    cn(
      "press rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors",
      active
        ? "border-primary bg-primary/15 text-primary"
        : "text-muted-foreground hover:border-primary/50 hover:text-foreground",
    );

  const toggleBookmark = (deckId: string, questionId: string) => {
    const deck = state.decks.find((d: Deck) => d.id === deckId);
    if (!deck) return;
    const bookmarks = deck.bookmarks.includes(questionId)
      ? deck.bookmarks.filter((id) => id !== questionId)
      : [...deck.bookmarks, questionId];
    updateDeck(deckId, { bookmarks });
  };

  return (
    <div>
      <PageHeader
        title="Card Browser"
        description="Every card in your library in one table — search it, filter it, star it, and peek at answers without leaving the page."
        action={
          <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
            <Table2 className="size-3.5" /> {filtered.length} of {total} cards
          </Badge>
        }
      />

      <section className="panel mb-5 space-y-4 p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions, answers, concepts and tags…"
            className="pl-9"
            aria-label="Search cards"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setDeckFilter([])} className={chip(!deckFilter.length)}>
            All decks
          </button>
          {state.decks.map((d: Deck) => (
            <button
              key={d.id}
              onClick={() =>
                setDeckFilter((f) =>
                  f.includes(d.id) ? f.filter((x) => x !== d.id) : [...f, d.id],
                )
              }
              className={chip(deckFilter.includes(d.id))}
            >
              <span
                className="mr-1.5 inline-block size-2 rounded-full align-middle"
                style={{ background: d.color }}
              />
              {d.title}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {questionTypes.map((t) => (
            <button
              key={t}
              onClick={() =>
                setTypeFilter((f) =>
                  f.includes(t as QuestionType)
                    ? f.filter((x) => x !== t)
                    : [...f, t as QuestionType],
                )
              }
              className={chip(typeFilter.includes(t as QuestionType))}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() =>
                  setDiffFilter((f) => (f.includes(d) ? f.filter((x) => x !== d) : [...f, d]))
                }
                className={cn(chip(diffFilter.includes(d)), "capitalize")}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort</span>
            {SORTS.map((s) => (
              <button key={s.key} onClick={() => setSort(s.key)} className={chip(sort === s.key)}>
                {s.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs">
            <Switch
              checked={bookmarkedOnly}
              onCheckedChange={setBookmarkedOnly}
              aria-label="Bookmarked only"
            />
            Bookmarked only
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={dueOnly} onCheckedChange={setDueOnly} aria-label="Due only" />
            Due for review
          </label>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="panel grid place-items-center p-16 text-center">
          <p className="font-medium">No cards match</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {total === 0
              ? "Import a deck to browse its cards here."
              : "Loosen the filters or clear the search."}
          </p>
        </div>
      ) : (
        <section className="panel divide-y divide-border overflow-hidden p-0">
          {filtered.map(({ deckId, deckTitle, deckColor, srs, q }) => {
            const key = `${deckId}:${q.id}`;
            const isOpen = expanded === key;
            const bookmarked =
              state.decks.find((d: Deck) => d.id === deckId)?.bookmarks.includes(q.id) ?? false;
            const card = srs[q.id];
            return (
              <div
                key={key}
                className={cn(
                  "transition-colors",
                  isOpen ? "bg-secondary/30" : "hover:bg-secondary/20",
                )}
              >
                <div className="flex items-start gap-3 px-4 py-3 sm:px-5">
                  <button
                    onClick={() => toggleBookmark(deckId, q.id)}
                    aria-label={bookmarked ? "Remove bookmark" : "Bookmark card"}
                    className="press mt-0.5 shrink-0"
                  >
                    <Bookmark
                      className={cn(
                        "size-4",
                        bookmarked ? "fill-primary text-primary" : "text-muted-foreground",
                      )}
                    />
                  </button>
                  <button
                    onClick={() => setExpanded(isOpen ? null : key)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-medium">{q.question}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ background: deckColor }} />
                        {deckTitle}
                      </span>
                      <span>·</span>
                      <span>{TYPE_LABELS[q.type]}</span>
                      <span>·</span>
                      <span className="capitalize">{q.difficulty}</span>
                      {q.concept && (
                        <>
                          <span>·</span>
                          <span>{q.concept}</span>
                        </>
                      )}
                    </div>
                  </button>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      !card || card.reps === 0
                        ? "bg-secondary text-muted-foreground"
                        : isDue(card)
                          ? "bg-primary/15 text-primary"
                          : "bg-success/15 text-success",
                    )}
                  >
                    {!card || card.reps === 0
                      ? "New"
                      : isDue(card)
                        ? "Due now"
                        : formatDue(card.due)}
                  </span>
                  <button
                    onClick={() => setExpanded(isOpen ? null : key)}
                    aria-label={isOpen ? "Collapse card" : "Expand card"}
                    className="press mt-0.5 shrink-0 text-muted-foreground"
                  >
                    <ChevronDown
                      className={cn("size-4 transition-transform", isOpen && "rotate-180")}
                    />
                  </button>
                </div>
                {isOpen && (
                  <div className="border-t border-border bg-background/40 px-4 py-4 sm:px-5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Answer</p>
                    <p className="mt-1 text-sm">{displayAnswer(q)}</p>
                    {q.explanation && (
                      <>
                        <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                          Explanation
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">{q.explanation}</p>
                      </>
                    )}
                    {q.options && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Options: {q.options.join(" · ")}
                      </p>
                    )}
                    <div className="mt-4 flex gap-2">
                      <Link
                        to="/decks/$deckId"
                        params={{ deckId }}
                        className="press rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/50"
                      >
                        Open deck
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
