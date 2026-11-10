import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, FileJson, CheckCircle2, XCircle, BookOpen, BookMarked } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  FIELD_DOCS,
  SAMPLE_DECK_JSON,
  SAMPLE_QUESTIONS_JSON,
  SAMPLE_COURSE_JSON,
  SAMPLE_MODULE_JSON,
  COURSE_FIELD_DOCS,
  MODULE_FIELD_DOCS,
  validateDeckJson,
  validateCourseJson,
  validateModuleJson,
} from "@/lib/schema";
import type { ValidationResult } from "@/lib/schema";

export const Route = createFileRoute("/_authenticated/format")({
  head: () => ({
    meta: [
      { title: "Content Format Repository — Knowly" },
      {
        name: "description",
        content:
          "Complete JSON format reference for all Knowly content types: decks, courses, and modules. Samples, validators, and detailed field documentation.",
      },
      { property: "og:title", content: "Content Format Repository — Knowly" },
      {
        property: "og:description",
        content: "JSON formats for decks, courses, modules, and questions with live validation.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <FormatPage />
    </AppPage>
  ),
});

type ContentType = "deck" | "course" | "module";

function FormatPage() {
  const [activeTab, setActiveTab] = useState<ContentType>("deck");
  const [test, setTest] = useState("");
  const [result, setResult] = useState<ValidationResult | null>(null);

  const tabs: { type: ContentType; label: string; icon: typeof FileJson; color: string }[] = [
    { type: "deck", label: "Decks", icon: FileJson, color: "text-primary" },
    { type: "course", label: "Courses", icon: BookOpen, color: "text-accent" },
    { type: "module", label: "Modules", icon: BookMarked, color: "text-chart-2" },
  ];

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Content Format Repository"
        description="Complete JSON specifications for all Knowly content types. Copy samples, validate before importing, and reference field documentation."
      />

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.type}
              onClick={() => {
                setActiveTab(tab.type);
                setTest("");
                setResult(null);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2",
                activeTab === tab.type
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("size-4", tab.color)} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Deck Format */}
      {activeTab === "deck" && (
        <>
          <section className="panel p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <FileJson className="size-4 text-primary" /> Complete sample deck
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  A full deck with questions. Copy this to use as a template for your AI prompt.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(SAMPLE_DECK_JSON);
                    toast.success("Sample copied");
                  }}
                >
                  <Copy className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([SAMPLE_DECK_JSON], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "knowly-sample-deck.json";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="size-3.5" />
                </Button>
              </div>
            </div>
            <pre className="mt-4 max-h-[420px] overflow-auto rounded-xl bg-surface-2/70 p-4 font-mono text-[11px] leading-relaxed">
              {SAMPLE_DECK_JSON}
            </pre>
          </section>

          <section className="panel mt-6 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <FileJson className="size-4 text-primary" /> Question pack
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add questions to an existing deck without re-uploading the entire deck.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(SAMPLE_QUESTIONS_JSON);
                  toast.success("Question pack sample copied");
                }}
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
            <pre className="mt-4 max-h-80 overflow-auto rounded-xl bg-surface-2/70 p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {SAMPLE_QUESTIONS_JSON}
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
                      <td className="px-6 py-3 font-mono text-[11px] text-muted-foreground">
                        {f.type}
                      </td>
                      <td className="px-6 py-3 text-xs">{f.required ? "Yes" : "Optional"}</td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">{f.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Course Format */}
      {activeTab === "course" && (
        <>
          <section className="panel p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <BookOpen className="size-4 text-accent" /> Complete sample course
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  A full course with modules, lessons, checkpoints, and a final exam.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(SAMPLE_COURSE_JSON);
                    toast.success("Sample copied");
                  }}
                >
                  <Copy className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([SAMPLE_COURSE_JSON], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "knowly-sample-course.json";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="size-3.5" />
                </Button>
              </div>
            </div>
            <pre className="mt-4 max-h-[420px] overflow-auto rounded-xl bg-surface-2/70 p-4 font-mono text-[11px] leading-relaxed">
              {SAMPLE_COURSE_JSON}
            </pre>
          </section>

          <section className="panel mt-6 overflow-hidden">
            <h2 className="border-b border-border p-6 pb-4 text-sm font-semibold">Course field reference</h2>
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
                  {COURSE_FIELD_DOCS.map((f) => (
                    <tr key={f.field} className="border-t border-border align-top">
                      <td className="px-6 py-3 font-mono text-xs text-accent">{f.field}</td>
                      <td className="px-6 py-3 font-mono text-[11px] text-muted-foreground">
                        {f.type}
                      </td>
                      <td className="px-6 py-3 text-xs">{f.required ? "Yes" : "Optional"}</td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">{f.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Module Format */}
      {activeTab === "module" && (
        <>
          <section className="panel p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <BookMarked className="size-4 text-chart-2" /> Complete sample module
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  A standalone learning module with blocks, questions, and linked decks.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(SAMPLE_MODULE_JSON);
                    toast.success("Sample copied");
                  }}
                >
                  <Copy className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([SAMPLE_MODULE_JSON], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "knowly-sample-module.json";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="size-3.5" />
                </Button>
              </div>
            </div>
            <pre className="mt-4 max-h-[420px] overflow-auto rounded-xl bg-surface-2/70 p-4 font-mono text-[11px] leading-relaxed">
              {SAMPLE_MODULE_JSON}
            </pre>
          </section>

          <section className="panel mt-6 overflow-hidden">
            <h2 className="border-b border-border p-6 pb-4 text-sm font-semibold">Module field reference</h2>
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
                  {MODULE_FIELD_DOCS.map((f) => (
                    <tr key={f.field} className="border-t border-border align-top">
                      <td className="px-6 py-3 font-mono text-xs text-chart-2">{f.field}</td>
                      <td className="px-6 py-3 font-mono text-[11px] text-muted-foreground">
                        {f.type}
                      </td>
                      <td className="px-6 py-3 text-xs">{f.required ? "Yes" : "Optional"}</td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">{f.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Validator Section */}
      <section className="panel mt-6 p-6">
        <h2 className="text-sm font-semibold">Check before you import</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Paste any JSON here to validate it — nothing gets added yet.
        </p>
        <Textarea
          value={test}
          onChange={(e) => setTest(e.target.value)}
          placeholder="Paste the JSON here…"
          className="mt-4 min-h-40 font-mono text-xs"
        />
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => {
              if (activeTab === "deck") setResult(validateDeckJson(test));
              else if (activeTab === "course") setResult(validateCourseJson(test));
              else setResult(validateModuleJson(test));
            }}
            disabled={!test.trim()}
          >
            Validate
          </Button>
          <Button variant="ghost" onClick={() => {
            if (activeTab === "deck") setTest(SAMPLE_DECK_JSON);
            else if (activeTab === "course") setTest(SAMPLE_COURSE_JSON);
            else setTest(SAMPLE_MODULE_JSON);
          }}>
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
                ? `Looks good — ready to import.`
                : `${result.errors.length} problem${result.errors.length === 1 ? "" : "s"} to fix.`}
            </p>
            {result.errors.map((e) => (
              <p
                key={e}
                className="rounded-md bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive"
              >
                {e}
              </p>
            ))}
            {result.warnings.map((w) => (
              <p
                key={w}
                className="rounded-md bg-warning/10 px-3 py-2 font-mono text-xs text-warning"
              >
                {w}
              </p>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
