import { useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { GitMerge, Split, ArrowRight, Trash2 } from "lucide-react";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useKnowly } from "@/store/knowly";
import { oceanDeckColor, DECK_COLORS } from "@/lib/defaults";
import { createId } from "@/lib/id";
import { cn } from "@/lib/utils";
import type { Deck } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/deck-tools")({
  head: () => ({
    meta: [
      { title: "Merge & Split Decks — Reorganise Your Library | Knowly" },
      {
        name: "description",
        content:
          "Combine decks into one or break a deck into smaller decks by tag or card count — without re-importing anything. Fully offline.",
      },
      { property: "og:title", content: "Merge & Split Decks — Knowly" },
      {
        property: "og:description",
        content: "Merge or split decks without re-importing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppPage>
      <DeckToolsPage />
    </AppPage>
  ),
});

function DeckToolsPage() {
  const { state, setState } = useKnowly();
  const router = useRouter();

  // Merge state
  const [mergeIds, setMergeIds] = useState<string[]>([]);
  const [mergeTitle, setMergeTitle] = useState("");
  const [mergeSubject, setMergeSubject] = useState("");

  // Split state
  const [splitId, setSplitId] = useState<string>("");
  const [splitMode, setSplitMode] = useState<"tags" | "size">("tags");
  const [splitSize, setSplitSize] = useState(20);

  const splitDeck = useMemo(
    () => state.decks.find((d) => d.id === splitId) ?? null,
    [state.decks, splitId],
  );
  const splitTags = useMemo(() => {
    if (!splitDeck) return [];
    const tags = new Set<string>();
    splitDeck.questions.forEach((q) => (q.tags ?? []).forEach((t) => tags.add(t)));
    return [...tags].sort();
  }, [splitDeck]);
  const [splitTagsPicked, setSplitTagsPicked] = useState<string[]>([]);

  const toggleMerge = (id: string) =>
    setMergeIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const nextColor = () => DECK_COLORS[state.decks.length % DECK_COLORS.length];

  const doMerge = () => {
    const decks = state.decks.filter((d) => mergeIds.includes(d.id));
    if (decks.length < 2) return;
    const now = Date.now();
    const merged: Deck = {
      id: createId("deck"),
      title: mergeTitle.trim() || "Merged deck",
      subject: mergeSubject.trim() || decks[0].subject,
      color: nextColor(),
      tags: [...new Set(decks.flatMap((d) => d.tags ?? []))],
      createdAt: now,
      favorite: false,
      masteredIds: [],
      bookmarks: [],
      notes: {},
      questions: decks.flatMap((d) => d.questions),
    };
    const keptMerged = { ...merged, masteredIds: decks.flatMap((d) => d.masteredIds) };
    setState((s) => ({
      ...s,
      decks: [...s.decks.filter((d) => !mergeIds.includes(d.id)), keptMerged],
    }));
    setMergeIds([]);
    setMergeTitle("");
    setMergeSubject("");
    void router.invalidate();
  };

  const doSplit = () => {
    if (!splitDeck) return;
    let groups: { title: string; tags: string[]; questions: typeof splitDeck.questions }[] = [];

    if (splitMode === "tags") {
      const picked = splitTagsPicked.length ? splitTagsPicked : splitTags;
      groups = picked.map((tag) => ({
        title: `${splitDeck.title} — ${tag}`,
        tags: [tag],
        questions: splitDeck.questions.filter((q) => (q.tags ?? []).includes(tag)),
      }));
      const rest = splitDeck.questions.filter(
        (q) => !picked.some((t) => (q.tags ?? []).includes(t)),
      );
      if (rest.length) {
        groups.push({ title: `${splitDeck.title} — other`, tags: [], questions: rest });
      }
    } else {
      const size = Math.max(1, Math.min(200, splitSize));
      for (let i = 0; i < splitDeck.questions.length; i += size) {
        const part = splitDeck.questions.slice(i, i + size);
        groups.push({
          title: `${splitDeck.title} (${Math.floor(i / size) + 1})`,
          tags: splitDeck.tags ?? [],
          questions: part,
        });
      }
    }

    groups = groups.filter((g) => g.questions.length > 0);
    if (groups.length < 2) return;

    const colorSeq = DECK_COLORS.indexOf(splitDeck.color);
    const newDecks: Deck[] = groups.map((g, i) => ({
      ...splitDeck,
      id: createId("deck"),
      title: g.title,
      tags: g.tags,
      color: DECK_COLORS[(colorSeq + i + 1) % DECK_COLORS.length],
      masteredIds: [],
      bookmarks: [],
      notes: {},
      questions: g.questions,
    }));

    setState((s) => ({
      ...s,
      decks: [...s.decks.filter((d) => d.id !== splitId), ...newDecks],
    }));
    setSplitId("");
    setSplitTagsPicked([]);
    void router.invalidate();
  };

  return (
    <div>
      <PageHeader
        title="Merge & Split"
        description="Reorganise your library without re-importing: fuse decks into one, or break a big deck into smaller ones by tag or size."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card/70 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <GitMerge className="size-4 text-primary" /> Merge decks
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick two or more decks. All cards move into one new deck, keeping mastered progress.
          </p>

          <div className="mt-4 grid max-h-72 gap-1.5 overflow-y-auto pr-1">
            {state.decks.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleMerge(d.id)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  mergeIds.includes(d.id)
                    ? "border-primary/50 bg-primary/10"
                    : "border-border hover:bg-secondary/40",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: oceanDeckColor(d.color) }}
                  />
                  <span className="truncate">{d.title}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{d.questions.length}</span>
              </button>
            ))}
            {state.decks.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No decks yet — create or import one first.
              </p>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="merge-title">New deck name</Label>
              <Input
                id="merge-title"
                value={mergeTitle}
                onChange={(e) => setMergeTitle(e.target.value)}
                placeholder="Semester 1 combined"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="merge-subject">Subject (optional)</Label>
              <Input
                id="merge-subject"
                value={mergeSubject}
                onChange={(e) => setMergeSubject(e.target.value)}
                placeholder="Biology"
              />
            </div>
          </div>

          <Button className="mt-4" onClick={doMerge} disabled={mergeIds.length < 2}>
            Merge {mergeIds.length > 1 ? `${mergeIds.length} decks` : "decks"}
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </section>

        <section className="rounded-xl border border-border bg-card/70 p-6">
          <h2 className="flex items-center gap-2 font-semibold font-display text-lg">
            <Split className="size-4 text-primary" /> Split a deck
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Break one deck into several smaller decks, grouped by tag or in fixed-size chunks.
          </p>

          <div className="mt-4 grid gap-2">
            <Label htmlFor="split-deck">Deck</Label>
            <select
              id="split-deck"
              value={splitId}
              onChange={(e) => {
                setSplitId(e.target.value);
                setSplitTagsPicked([]);
              }}
              className="h-10 rounded-md border border-border bg-surface px-3 text-sm"
            >
              <option value="">Choose a deck…</option>
              {state.decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.questions.length} cards)
                </option>
              ))}
            </select>
          </div>

          {splitDeck && (
            <>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant={splitMode === "tags" ? "default" : "outline"}
                  onClick={() => setSplitMode("tags")}
                >
                  By tag
                </Button>
                <Button
                  size="sm"
                  variant={splitMode === "size" ? "default" : "outline"}
                  onClick={() => setSplitMode("size")}
                >
                  By size
                </Button>
              </div>

              {splitMode === "tags" ? (
                splitTags.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    This deck has no card tags. Add tags to its cards, or split by size instead.
                  </p>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {splitTags.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setSplitTagsPicked((p) =>
                            p.includes(t) ? p.filter((x) => x !== t) : [...p, t],
                          )
                        }
                      >
                        <Badge
                          variant={splitTagsPicked.includes(t) ? "default" : "secondary"}
                          className="cursor-pointer"
                        >
                          {t}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <div className="mt-4 grid gap-2">
                  <Label htmlFor="split-size">Cards per deck</Label>
                  <Input
                    id="split-size"
                    type="number"
                    min={1}
                    max={200}
                    value={splitSize}
                    onChange={(e) => setSplitSize(Number(e.target.value) || 20)}
                  />
                </div>
              )}

              <Button className="mt-4" onClick={doSplit}>
                Split deck
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="ml-2"
                onClick={() => {
                  setSplitId("");
                  setSplitTagsPicked([]);
                }}
              >
                <Trash2 className="mr-1.5 size-3.5" /> Clear
              </Button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
