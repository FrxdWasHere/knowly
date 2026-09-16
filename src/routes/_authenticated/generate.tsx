import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy, Eraser, Save, Wand2, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { buildAppendPrompt, buildPrompt, estimateQuestions } from "@/lib/prompt";
import { TYPE_LABELS } from "@/lib/answers";
import { questionTypes } from "@/lib/schema";
import { useKnowly } from "@/store/knowly";
import type { Difficulty, QuestionType } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/generate")({
  head: () => ({
    meta: [
      { title: "Prompt Forge — Build AI Question-Bank Prompts | Knowly" },
      {
        name: "description",
        content:
          "Turn study material into a strict JSON prompt for any LLM. Configure question count, types and difficulty, then copy the prompt into ChatGPT, Claude, Gemini or Ollama.",
      },
      { property: "og:title", content: "Prompt Forge — Knowly" },
      {
        property: "og:description",
        content: "Generate a precise question-bank prompt for the AI model of your choice.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <GeneratePage />
    </AppPage>
  ),
});

function GeneratePage() {
  const { state, saveTemplate, deleteTemplate } = useKnowly();
  const [mode, setMode] = useState<"new" | "append">("new");
  const [targetId, setTargetId] = useState(state.decks[0]?.id ?? "");
  const [material, setMaterial] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(state.settings.focusSubjects[0] ?? "");
  const [count, setCount] = useState(20);
  const [extra, setExtra] = useState("");
  const [dist, setDist] = useState<Record<Difficulty, number>>({ easy: 30, medium: 50, hard: 20 });
  const [types, setTypes] = useState<QuestionType[]>([
    "multiple-choice",
    "true-false",
    "short-answer",
  ]);

  const target = state.decks.find((d) => d.id === targetId);

  const prompt = useMemo(() => {
    if (mode === "append" && target) {
      return buildAppendPrompt({
        material,
        deckTitle: target.title,
        subject: target.subject,
        count,
        distribution: dist,
        types,
        extra,
        existingQuestions: target.questions.map((q) => q.question),
        existingConcepts: Array.from(
          new Set(target.questions.map((q) => q.concept).filter((c): c is string => Boolean(c))),
        ),
        audience: state.settings.gradeLevel,
        purpose: state.settings.studyReason,
      });
    }
    return buildPrompt({
      material,
      title,
      subject,
      count,
      distribution: dist,
      types,
      extra,
      audience: state.settings.gradeLevel,
      purpose: state.settings.studyReason,
    });
  }, [
    mode,
    target,
    material,
    title,
    subject,
    count,
    dist,
    types,
    extra,
    state.settings.gradeLevel,
    state.settings.studyReason,
  ]);


  const toggleType = (t: QuestionType) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied", { description: "Paste it into your preferred AI model." });
  };

  const clear = () => {
    setMaterial("");
    setTitle("");
    setSubject("");
    setExtra("");
    toast("Prompt cleared");
  };

  return (
    <div>
      <PageHeader
        title="Prompt Forge"
        description="Knowly never contacts an AI. It builds the prompt — you run it wherever you like, then bring the JSON back."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={clear}>
              <Eraser /> Clear
            </Button>
            <Button onClick={copy}>
              <Copy /> Copy prompt
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="panel flex flex-wrap items-center gap-3 p-4">
            <div className="flex gap-2">
              {(
                [
                  ["new", "New deck"],
                  ["append", "Additional questions"],
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
              {mode === "append"
                ? "Produces a question pack — import it via Import JSON → “Add questions to a deck”."
                : "Produces a full deck object."}
            </span>
          </section>

          <section className="panel space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Deck title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Cell Biology — Membranes"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Biology"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="material">Study material</Label>
                <span className="text-xs text-muted-foreground">
                  {material.length.toLocaleString()} chars · suggests ~
                  {estimateQuestions(material.length)} questions
                </span>
              </div>
              <Textarea
                id="material"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="Paste lecture notes, a textbook chapter, or a summary…"
                className="min-h-52 font-mono text-xs"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Question count</Label>
                <Badge variant="secondary">{count}</Badge>
              </div>
              <Slider
                value={[count]}
                min={5}
                max={100}
                step={5}
                onValueChange={([v]) => setCount(v)}
              />
            </div>

            <div className="space-y-2">
              <Label>Question types</Label>
              <div className="flex flex-wrap gap-2">
                {questionTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className={cn(
                      "rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors",
                      types.includes(t)
                        ? "border-primary bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Difficulty distribution</Label>
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                <div key={d} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize text-muted-foreground">{d}</span>
                    <span>{dist[d]}%</span>
                  </div>
                  <Slider
                    value={[dist[d]]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={([v]) => setDist((p) => ({ ...p, [d]: v }))}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="extra">Extra instructions</Label>
              <Textarea
                id="extra"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="Focus on clinical application. Avoid dates."
                className="min-h-20"
              />
            </div>
          </section>

          <section className="panel p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Save className="size-4 text-primary" /> Prompt templates
            </h2>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const name = title || `Template ${state.templates.length + 1}`;
                  saveTemplate({ id: Math.random().toString(36).slice(2), name, body: prompt });
                  toast.success("Template saved locally");
                }}
              >
                <Save /> Save current prompt
              </Button>
            </div>
            <ul className="mt-4 space-y-2">
              {state.templates.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-surface-2/60 px-3 py-2 text-sm"
                >
                  <span className="truncate">{t.name}</span>
                  <span className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(t.body);
                        toast.success("Template copied");
                      }}
                    >
                      <Copy />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteTemplate(t.id)}>
                      <Trash2 />
                    </Button>
                  </span>
                </li>
              ))}
              {!state.templates.length && (
                <li className="text-xs text-muted-foreground">No templates saved yet.</li>
              )}
            </ul>
          </section>
        </div>

        <section className="panel flex h-fit flex-col p-6 xl:sticky xl:top-24">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Wand2 className="size-4 text-primary" /> Prompt preview
            </h2>
            <span className="text-xs text-muted-foreground">
              {prompt.length.toLocaleString()} chars
            </span>
          </div>
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl bg-surface-2/70 p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {prompt}
          </pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={copy}>
              <Copy /> Copy prompt
            </Button>
            {[
              { label: "ChatGPT", url: "https://chat.openai.com" },
              { label: "Claude", url: "https://claude.ai" },
              { label: "Gemini", url: "https://gemini.google.com" },
            ].map((p) => (
              <Button key={p.label} variant="outline" size="sm" asChild>
                <a href={p.url} target="_blank" rel="noreferrer noopener">
                  {p.label} <ExternalLink />
                </a>
              </Button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}