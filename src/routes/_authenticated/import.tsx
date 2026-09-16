import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { UploadCloud, CheckCircle2, XCircle, AlertTriangle, FileJson, X } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  validateDeckJson,
  validateQuestionsJson,
  type ValidationResult,
  type QuestionsValidationResult,
} from "@/lib/schema";
import { TYPE_LABELS } from "@/lib/answers";
import { useKnowly } from "@/store/knowly";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/import")({
  validateSearch: (search: Record<string, unknown>): { deck?: string } => ({
    deck: typeof search.deck === "string" ? search.deck : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Import a Deck — Validate AI JSON | Knowly" },
      {
        name: "description",
        content:
          "Paste, upload or drag-and-drop AI-generated JSON. Knowly validates the schema, previews the deck and imports it — as a new deck or as extra questions for an existing one.",
      },
      { property: "og:title", content: "Import a Deck — Knowly" },
      {
        property: "og:description",
        content: "Validate and import AI-generated question banks into your offline library.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <ImportPage />
    </AppPage>
  ),
});

function ImportPage() {
  const { state, addDeck, addQuestions } = useKnowly();
  const navigate = useNavigate();
  const { deck: deckParam } = Route.useSearch();
  const [mode, setMode] = useState<"deck" | "append">(deckParam ? "append" : "deck");
  const [targetId, setTargetId] = useState(deckParam ?? state.decks[0]?.id ?? "");
  const [raw, setRaw] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const target = state.decks.find((d) => d.id === targetId);

  const result = useMemo<ValidationResult | QuestionsValidationResult | null>(() => {
    if (!raw.trim()) return null;
    return mode === "deck"
      ? validateDeckJson(raw)
      : validateQuestionsJson(raw, target?.questions ?? []);
  }, [raw, mode, target]);

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setRaw(String(reader.result));
    reader.readAsText(file);
  };

  const deck = result && "deck" in result ? result.deck : undefined;
  const newQuestions = result && "questions" in result ? result.questions : undefined;
  const previewQuestions = deck?.questions ?? newQuestions ?? [];

  const typeCounts = previewQuestions.reduce<Record<string, number>>((acc, q) => {
    acc[q.type] = (acc[q.type] ?? 0) + 1;
    return acc;
  }, {});

  const canImport = Boolean(result?.ok && (mode === "deck" ? deck : newQuestions && target));

  const doImport = () => {
    if (mode === "deck") {
      if (!deck) return;
      addDeck(deck);
      toast.success(`Imported “${deck.title}”`, {
        description: `${deck.questions.length} questions added to your library.`,
      });
      navigate({ to: "/decks/$deckId", params: { deckId: deck.id } });
      return;
    }
    if (!newQuestions || !target) return;
    addQuestions(target.id, newQuestions);
    toast.success(`Added ${newQuestions.length} questions`, {
      description: `“${target.title}” now has ${target.questions.length + newQuestions.length} questions.`,
    });
    navigate({ to: "/decks/$deckId", params: { deckId: target.id } });
  };

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Import JSON"
        description="Bring back what your AI produced. Nothing is saved until validation passes and you confirm."
      />

      <div className="panel mb-6 flex flex-wrap items-center gap-3 p-4">
        <div className="flex gap-2">
          {(
            [
              ["deck", "New deck"],
              ["append", "Add questions to a deck"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors",
                mode === m
                  ? "border-primary bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === "append" && (
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="h-9 rounded-md border border-border bg-surface-2/60 px-3 text-xs"
          >
            {!state.decks.length && <option value="">No decks yet</option>}
            {state.decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} ({d.questions.length})
              </option>
            ))}
          </select>
        )}
        <span className="text-xs text-muted-foreground">
          {mode === "deck"
            ? "Expects a full deck object with title, subject and questions."
            : "Expects a question pack: { \"questions\": [ … ] }"}
        </span>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) readFile(file);
        }}
        className={cn(
          "panel flex flex-col items-center justify-center gap-3 border-dashed p-10 text-center transition-colors",
          dragging && "border-primary bg-primary/5",
        )}
      >
        <UploadCloud className="size-8 text-primary" />
        <p className="text-sm font-medium">Drag & drop a .json file here</p>
        <p className="text-xs text-muted-foreground">or</p>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <FileJson /> Choose a file
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) readFile(file);
          }}
        />
      </div>

      <section className="panel mt-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Paste JSON</h2>
          <span className="text-xs text-muted-foreground">{raw.length.toLocaleString()} chars</span>
        </div>
        <Textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={
            mode === "deck" ? '{ "title": "…", "questions": [ … ] }' : '{ "questions": [ … ] }'
          }
          className="mt-3 min-h-52 font-mono text-xs"
        />
      </section>

      {result && (
        <section className="panel mt-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              className={cn(
                "flex items-center gap-2 text-sm font-semibold",
                result.ok ? "text-success" : "text-destructive",
              )}
            >
              {result.ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
              {result.ok
                ? "Validation passed"
                : `Validation failed — ${result.errors.length} error(s)`}
            </h2>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setRaw("")}>
                <X /> Cancel
              </Button>
              <Button disabled={!canImport} onClick={doImport}>
                {mode === "deck" ? "Import deck" : `Add to “${target?.title ?? "deck"}”`}
              </Button>
            </div>
          </div>

          {result.errors.length > 0 && (
            <ul className="mt-4 space-y-2">
              {result.errors.map((e) => (
                <li
                  key={e}
                  className="rounded-md bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive"
                >
                  {e}
                </li>
              ))}
            </ul>
          )}

          {result.warnings.length > 0 && (
            <ul className="mt-4 space-y-2">
              {result.warnings.map((w) => (
                <li
                  key={w}
                  className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning"
                >
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          )}

          {previewQuestions.length > 0 && (
            <div className="mt-6 rounded-xl border border-border bg-surface-2/50 p-5">
              <p className="font-display text-lg font-bold">
                {deck ? deck.title : `${previewQuestions.length} new questions`}
              </p>
              <p className="text-xs text-muted-foreground">
                {deck
                  ? `${deck.subject} · ${deck.questions.length} questions`
                  : `Destination: ${target?.title ?? "select a deck"}`}
              </p>
              {deck?.description && <p className="mt-2 text-sm">{deck.description}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(typeCounts).map(([t, n]) => (
                  <Badge key={t} variant="secondary">
                    {TYPE_LABELS[t] ?? t}: {n}
                  </Badge>
                ))}
                {deck?.tags.map((t) => (
                  <Badge key={t} variant="outline">
                    #{t}
                  </Badge>
                ))}
              </div>
              <ul className="mt-4 space-y-2">
                {previewQuestions.slice(0, 3).map((q) => (
                  <li key={q.id} className="rounded-lg bg-background/40 px-3 py-2 text-xs">
                    <span className="text-muted-foreground">
                      {TYPE_LABELS[q.type]} · {q.difficulty}
                    </span>
                    <p className="mt-1">{q.question}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
