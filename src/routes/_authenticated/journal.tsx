import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { NotebookPen, Search, Trash2, Pencil, X, Plus, Clock } from "lucide-react";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useKnowly } from "@/store/knowly";
import { cn } from "@/lib/utils";
import type { JournalEntry, JournalMood } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({
    meta: [
      { title: "Study Journal — Log and Search Your Sessions | Knowly" },
      {
        name: "description",
        content:
          "Keep a private, offline journal of every study session: what you covered, how it felt, and what to fix next time. Search every entry by word, tag or mood.",
      },
      { property: "og:title", content: "Study Journal — Knowly" },
      {
        property: "og:description",
        content: "A private, searchable log of every study session.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppPage>
      <JournalPage />
    </AppPage>
  ),
});

const MOODS: { id: JournalMood; label: string; emoji: string }[] = [
  { id: "great", label: "Great", emoji: "🔥" },
  { id: "good", label: "Good", emoji: "🙂" },
  { id: "okay", label: "Okay", emoji: "😐" },
  { id: "rough", label: "Rough", emoji: "😵" },
];

function moodMeta(mood: JournalMood) {
  return MOODS.find((m) => m.id === mood) ?? MOODS[2];
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function JournalPage() {
  const { state, setState } = useKnowly();
  const entries = state.journal ?? [];

  const [query, setQuery] = useState("");
  const [moodFilter, setMoodFilter] = useState<"all" | JournalMood>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<JournalMood>("good");
  const [tagText, setTagText] = useState("");
  const [sessionId, setSessionId] = useState<string>("");

  const recentSessions = useMemo(
    () => [...state.history].sort((a, b) => b.date - a.date).slice(0, 12),
    [state.history],
  );
  const sessionById = useMemo(
    () => new Map(state.history.map((s) => [s.id, s])),
    [state.history],
  );

  const reset = () => {
    setTitle("");
    setBody("");
    setMood("good");
    setTagText("");
    setSessionId("");
    setEditingId(null);
    setComposing(false);
  };

  const startNew = (presetSessionId?: string) => {
    reset();
    if (presetSessionId) {
      const s = sessionById.get(presetSessionId);
      setSessionId(presetSessionId);
      if (s) setTitle(`${s.deckTitles.join(", ") || "Study"} — ${s.percentage}%`);
    }
    setComposing(true);
  };

  const startEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setTitle(entry.title);
    setBody(entry.body);
    setMood(entry.mood);
    setTagText(entry.tags.join(", "));
    setSessionId(entry.sessionId ?? "");
    setComposing(true);
  };

  const save = () => {
    const cleanTitle = title.trim() || "Untitled entry";
    const tags = tagText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const now = Date.now();
    setState((s) => {
      const list = s.journal ?? [];
      if (editingId) {
        return {
          ...s,
          journal: list.map((e) =>
            e.id === editingId
              ? { ...e, title: cleanTitle, body, mood, tags, sessionId: sessionId || undefined, updatedAt: now }
              : e,
          ),
        };
      }
      const entry: JournalEntry = {
        id: `jrn-${now}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: now,
        updatedAt: now,
        title: cleanTitle,
        body,
        mood,
        tags,
        sessionId: sessionId || undefined,
      };
      return { ...s, journal: [entry, ...list] };
    });
    reset();
  };

  const remove = (id: string) => {
    setState((s) => ({ ...s, journal: (s.journal ?? []).filter((e) => e.id !== id) }));
    if (editingId === id) reset();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...entries]
      .sort((a, b) => b.createdAt - a.createdAt)
      .filter((e) => (moodFilter === "all" ? true : e.mood === moodFilter))
      .filter((e) =>
        !q
          ? true
          : e.title.toLowerCase().includes(q) ||
            e.body.toLowerCase().includes(q) ||
            e.tags.some((t) => t.toLowerCase().includes(q)),
      );
  }, [entries, query, moodFilter]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.tags.forEach((t) => set.add(t)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [entries]);

  return (
    <div>
      <PageHeader
        title="Study Journal"
        description="Write down what you covered, how it went, and what to fix next time. Everything stays on this device."
        action={
          <Button onClick={() => startNew()}>
            <Plus className="mr-2 size-4" /> New entry
          </Button>
        }
      />

      {composing && (
        <div className="anim-fade-up mb-8 rounded-xl border border-border bg-card/70 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">
              {editingId ? "Edit entry" : "New entry"}
            </h2>
            <Button variant="ghost" size="icon" onClick={reset} aria-label="Close editor">
              <X className="size-4" />
            </Button>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="jrn-title">Title</Label>
              <Input
                id="jrn-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Biology — cell respiration"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="jrn-body">Notes</Label>
              <Textarea
                id="jrn-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder="What clicked, what didn't, and what to revisit tomorrow."
              />
            </div>

            <div className="grid gap-2">
              <Label>How did it go?</Label>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <Button
                    key={m.id}
                    type="button"
                    variant={mood === m.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMood(m.id)}
                  >
                    <span className="mr-1.5">{m.emoji}</span>
                    {m.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="jrn-tags">Tags (comma separated)</Label>
              <Input
                id="jrn-tags"
                value={tagText}
                onChange={(e) => setTagText(e.target.value)}
                placeholder="exam prep, chemistry"
              />
            </div>

            {recentSessions.length > 0 && (
              <div className="grid gap-2">
                <Label>Link a recent session (optional)</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={sessionId ? "outline" : "default"}
                    onClick={() => setSessionId("")}
                  >
                    None
                  </Button>
                  {recentSessions.map((s) => (
                    <Button
                      key={s.id}
                      type="button"
                      size="sm"
                      variant={sessionId === s.id ? "default" : "outline"}
                      onClick={() => setSessionId(s.id)}
                    >
                      {new Date(s.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })} ·{" "}
                      {s.deckTitles[0] ?? s.mode} · {s.percentage}%
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={save}>{editingId ? "Save changes" : "Add entry"}</Button>
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entries, tags or notes"
            className="pl-9"
            aria-label="Search journal"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={moodFilter === "all" ? "default" : "outline"}
            onClick={() => setMoodFilter("all")}
          >
            All
          </Button>
          {MOODS.map((m) => (
            <Button
              key={m.id}
              size="sm"
              variant={moodFilter === m.id ? "default" : "outline"}
              onClick={() => setMoodFilter(m.id)}
            >
              <span className="mr-1.5">{m.emoji}</span>
              {m.label}
            </Button>
          ))}
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Tags</span>
          {allTags.map((t) => (
            <button key={t} type="button" onClick={() => setQuery(t)}>
              <Badge variant="secondary" className="cursor-pointer">
                {t}
              </Badge>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <NotebookPen className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="font-medium">
              {entries.length === 0 ? "No journal entries yet" : "Nothing matches that search"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {entries.length === 0
                ? "Write a quick note after your next session — future you will thank you."
                : "Try a different word, tag or mood."}
            </p>
            {entries.length === 0 && (
              <div className="mt-4 flex justify-center gap-2">
                <Button onClick={() => startNew()}>Write your first entry</Button>
                <Button variant="outline" asChild>
                  <Link to="/review">Start a review</Link>
                </Button>
              </div>
            )}
          </div>
        )}

        {filtered.map((entry) => {
          const m = moodMeta(entry.mood);
          const session = entry.sessionId ? sessionById.get(entry.sessionId) : undefined;
          return (
            <article
              key={entry.id}
              className={cn(
                "anim-fade-up rounded-xl border border-border bg-card/70 p-5 transition-colors hover:border-primary/40",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-semibold">
                    <span className="mr-2">{m.emoji}</span>
                    {entry.title}
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3.5" />
                    {fmtDate(entry.createdAt)}
                    {entry.updatedAt !== entry.createdAt && <span>· edited</span>}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(entry)} aria-label="Edit entry">
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(entry.id)} aria-label="Delete entry">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {entry.body && (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                  {entry.body}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {entry.tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
                {session && (
                  <Badge variant="outline">
                    {session.deckTitles.join(", ") || session.mode} · {session.correct}/{session.answered} ·{" "}
                    {session.percentage}%
                  </Badge>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {recentSessions.length > 0 && (
        <div className="mt-10 rounded-xl border border-border bg-card/50 p-6">
          <h2 className="font-display text-lg font-semibold">Recent sessions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Turn any session into a journal entry in one click.
          </p>
          <div className="mt-4 grid gap-2">
            {recentSessions.slice(0, 6).map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 px-4 py-3"
              >
                <div className="min-w-0 text-sm">
                  <p className="truncate font-medium">{s.deckTitles.join(", ") || "Study session"}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(s.date)} · {s.correct}/{s.answered} correct · {s.percentage}%
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => startNew(s.id)}>
                  Write about it
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
