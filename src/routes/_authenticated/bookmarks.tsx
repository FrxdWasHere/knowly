import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, ChevronDown, NotebookPen, Star, X } from "lucide-react";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useKnowly } from "@/store/knowly";
import { TYPE_LABELS } from "@/lib/answers";
import { displayAnswer } from "@/lib/interactive";
import { cn } from "@/lib/utils";
import type { Deck } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/bookmarks")({
  head: () => ({
    meta: [
      { title: "Bookmarks & Notes — Knowly" },
      {
        name: "description",
        content:
          "One hub for every starred card and personal note across all decks — review, edit and jump straight back into practice.",
      },
      { property: "og:title", content: "Bookmarks & Notes — Knowly" },
      {
        property: "og:description",
        content: "Every starred card and personal note in one offline hub.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <BookmarksPage />
    </AppPage>
  ),
});

type Entry = {
  deckId: string;
  deckTitle: string;
  deckColor: string;
  q: Deck["questions"][number];
  note: string;
  bookmarked: boolean;
};

function BookmarksPage() {
  const { state, updateDeck } = useKnowly();
  const [tab, setTab] = useState<"starred" | "notes">("starred");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = [];
    for (const deck of state.decks) {
      for (const q of deck.questions) {
        const bookmarked = deck.bookmarks.includes(q.id);
        const note = deck.notes[q.id] ?? "";
        if (bookmarked || note.trim()) {
          out.push({
            deckId: deck.id,
            deckTitle: deck.title,
            deckColor: deck.color,
            q,
            note,
            bookmarked,
          });
        }
      }
    }
    return out;
  }, [state.decks]);

  const starred = entries.filter((e) => e.bookmarked);
  const noted = entries.filter((e) => e.note.trim());
  const list = tab === "starred" ? starred : noted;

  const toggleBookmark = (deckId: string, questionId: string) => {
    const deck = state.decks.find((d: Deck) => d.id === deckId);
    if (!deck) return;
    updateDeck(deckId, {
      bookmarks: deck.bookmarks.filter((id) => id !== questionId),
    });
  };

  const saveNote = (deckId: string, questionId: string) => {
    const deck = state.decks.find((d: Deck) => d.id === deckId);
    if (!deck) return;
    const key = `${deckId}:${questionId}`;
    const text = (drafts[key] ?? "").trim();
    const notes = { ...deck.notes };
    if (text) notes[questionId] = text;
    else delete notes[questionId];
    setDrafts((d) => {
      const next = { ...d };
      delete next[key];
      return next;
    });
    updateDeck(deckId, { notes });
  };

  const deleteNote = (deckId: string, questionId: string) => {
    const deck = state.decks.find((d: Deck) => d.id === deckId);
    if (!deck) return;
    const key = `${deckId}:${questionId}`;
    const notes = { ...deck.notes };
    delete notes[questionId];
    setDrafts((d) => {
      const next = { ...d };
      delete next[key];
      return next;
    });
    updateDeck(deckId, { notes });
  };

  const chip = (active: boolean) =>
    cn(
      "press rounded-full border px-4 py-2 text-sm font-medium transition-colors",
      active
        ? "border-primary bg-primary/15 text-primary"
        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
    );

  return (
    <div>
      <PageHeader
        title="Bookmarks & Notes"
        description="Everything you've starred or written about, across every deck — reread it, reword it, or clear it out."
        action={
          <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
            <Star className="size-3.5" /> {starred.length} starred ·{" "}
            <NotebookPen className="size-3.5" /> {noted.length} noted
          </Badge>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button onClick={() => setTab("starred")} className={chip(tab === "starred")}>
          <Bookmark className="mr-1.5 inline size-3.5" /> Starred cards ({starred.length})
        </button>
        <button onClick={() => setTab("notes")} className={chip(tab === "notes")}>
          <NotebookPen className="mr-1.5 inline size-3.5" /> Notes ({noted.length})
        </button>
        {starred.length > 0 && (
          <Link
            to="/quiz"
            className="press ml-auto rounded-md border border-primary/50 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            Quiz my starred cards
          </Link>
        )}
      </div>

      {list.length === 0 ? (
        <div className="panel grid place-items-center p-16 text-center">
          <p className="font-medium">
            {tab === "starred" ? "No starred cards yet" : "No notes yet"}
          </p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {tab === "starred"
              ? "Star a card while studying or in the Card Browser and it will wait for you here."
              : "Write a note on any card — from its deck page or the Card Browser — and it lands here."}
          </p>
        </div>
      ) : (
        <section className="panel divide-y divide-border overflow-hidden p-0">
          {list.map(({ deckId, deckTitle, deckColor, q, note }) => {
            const key = `${deckId}:${q.id}`;
            const isOpen = expanded === key;
            const draft = drafts[key];
            return (
              <div
                key={key}
                className={cn(
                  "transition-colors",
                  isOpen ? "bg-secondary/30" : "hover:bg-secondary/20",
                )}
              >
                <div className="flex items-start gap-3 px-4 py-3 sm:px-5">
                  {tab === "starred" ? (
                    <button
                      onClick={() => toggleBookmark(deckId, q.id)}
                      aria-label="Remove bookmark"
                      title="Remove bookmark"
                      className="press mt-0.5 shrink-0"
                    >
                      <Bookmark className="size-4 fill-primary text-primary" />
                    </button>
                  ) : (
                    <NotebookPen className="mt-0.5 size-4 shrink-0 text-primary" />
                  )}
                  <button
                    onClick={() => setExpanded(isOpen ? null : key)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-medium">{q.question}</p>
                    {note.trim() && (
                      <p className="mt-0.5 truncate text-xs italic text-muted-foreground">
                        “{note.trim()}”
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ background: deckColor }} />
                        {deckTitle}
                      </span>
                      <span>·</span>
                      <span>{TYPE_LABELS[q.type]}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setExpanded(isOpen ? null : key)}
                    aria-label={isOpen ? "Collapse" : "Expand"}
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
                      <p className="mt-2 text-sm text-muted-foreground">{q.explanation}</p>
                    )}
                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Your note
                      </p>
                      <Textarea
                        value={draft ?? note}
                        onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                        placeholder="Write anything you want to remember about this card…"
                        className="mt-2 min-h-20"
                        aria-label={`Note for ${q.question}`}
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => saveNote(deckId, q.id)}
                          disabled={(draft ?? note).trim() === note.trim()}
                          className="press rounded-md border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-40"
                        >
                          Save note
                        </button>
                        {(note.trim() || (draft ?? "").trim()) && (
                          <button
                            onClick={() => deleteNote(deckId, q.id)}
                            className="press inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                          >
                            <X className="size-3" /> Delete note
                          </button>
                        )}
                        <Link
                          to="/decks/$deckId"
                          params={{ deckId }}
                          className="press rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/50"
                        >
                          Open deck
                        </Link>
                      </div>
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
