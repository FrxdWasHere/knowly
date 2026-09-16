import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, FileJson, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FIELD_DOCS,
  SAMPLE_DECK_JSON,
  SAMPLE_QUESTIONS_JSON,
  validateDeckJson,
} from "@/lib/schema";
import type { ValidationResult } from "@/lib/schema";

export const Route = createFileRoute("/_authenticated/format")({
  head: () => ({
    meta: [
      { title: "Deck JSON Format & Sample — Knowly" },
      {
        name: "description",
        content:
          "Full reference for the Knowly deck JSON schema: every field explained, a complete sample deck to copy or download, and a live validator.",
      },
      { property: "og:title", content: "Deck JSON Format & Sample — Knowly" },
      {
        property: "og:description",
        content: "Every field of the Knowly deck schema, with a downloadable sample deck.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <FormatPage />
    </AppPage>
  ),
});

function FormatPage() {
  const [test, setTest] = useState("");
  const [result, setResult] = useState<ValidationResult | null>(null);

  const download = () => {
    const blob = new Blob([SAMPLE_DECK_JSON], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "knowly-sample-deck.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Deck JSON format"
        description="Anything your AI returns must match this shape. Import validates it before a deck is created."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(SAMPLE_DECK_JSON);
                toast.success("Sample JSON copied");
              }}
            >
              <Copy /> Copy sample
            </Button>
            <Button onClick={download}>
              <Download /> Download sample
            </Button>
          </div>
        }
      />

      <section className="panel p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <FileJson className="size-4 text-primary" /> Complete sample deck
        </h2>
        <pre className="mt-4 max-h-[420px] overflow-auto rounded-xl bg-surface-2/70 p-4 font-mono text-[11px] leading-relaxed">
          {SAMPLE_DECK_JSON}
        </pre>
      </section>

      <section className="panel mt-6 overflow-hidden">
        <h2 className="border-b border-border p-6 pb-4 text-sm font-semibold">Field reference</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-6 py-3">Field</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Required</th>
                <th className="px-6 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {FIELD_DOCS.map((f) => (
                <tr key={f.field} className="border-t border-border align-top">
                  <td className="px-6 py-3 font-mono text-xs text-primary">{f.field}</td>
                  <td className="px-6 py-3 font-mono text-[11px] text-muted-foreground">{f.type}</td>
                  <td className="px-6 py-3 text-xs">{f.required ? "Yes" : "Optional"}</td>
                  <td className="px-6 py-3 text-xs text-muted-foreground">{f.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <FileJson className="size-4 text-primary" /> Question pack (add to an existing deck)
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(SAMPLE_QUESTIONS_JSON);
              toast.success("Question pack sample copied");
            }}
          >
            <Copy /> Copy sample
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Use this slimmer shape when expanding a deck you already have. No deck metadata — just a
          questions array (the same question fields as above). Generate it in Prompt Forge under
          “Additional questions”, then import it via Import JSON → “Add questions to a deck”.
        </p>
        <pre className="mt-4 max-h-80 overflow-auto rounded-xl bg-surface-2/70 p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {SAMPLE_QUESTIONS_JSON}
        </pre>
      </section>

      <section className="panel mt-6 p-6">
        <h2 className="text-sm font-semibold">Validate JSON</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Paste any deck JSON to check it without importing.
        </p>
        <Textarea
          value={test}
          onChange={(e) => setTest(e.target.value)}
          placeholder="Paste JSON here…"
          className="mt-4 min-h-40 font-mono text-xs"
        />
        <div className="mt-4 flex gap-2">
          <Button onClick={() => setResult(validateDeckJson(test))} disabled={!test.trim()}>
            Validate
          </Button>
          <Button variant="ghost" onClick={() => setTest(SAMPLE_DECK_JSON)}>
            Load sample
          </Button>
        </div>

        {result && (
          <div className="mt-5 space-y-3">
            <p
              className={
                result.ok
                  ? "flex items-center gap-2 text-sm text-success"
                  : "flex items-center gap-2 text-sm text-destructive"
              }
            >
              {result.ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
              {result.ok
                ? `Valid — ${result.deck?.questions.length} questions ready to import.`
                : `${result.errors.length} error(s) found.`}
            </p>
            {result.errors.map((e) => (
              <p key={e} className="rounded-md bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
                {e}
              </p>
            ))}
            {result.warnings.map((w) => (
              <p key={w} className="rounded-md bg-warning/10 px-3 py-2 font-mono text-xs text-warning">
                {w}
              </p>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}