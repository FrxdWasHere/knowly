import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy, Eraser, Save, Wand2, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PromptStudioNav } from "@/components/prompt-studio-nav";
import { PageHeader } from "@/components/app-shell";
import { AutoChoice } from "@/components/auto-choice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { buildAppendPrompt, buildPrompt, estimateQuestions } from "@/lib/prompt";
import { TYPE_LABELS } from "@/lib/answers";
import { createId } from "@/lib/id";
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
  const [isSTEM, setIsSTEM] = useState(false);
  const [needsEquations, setNeedsEquations] = useState(false);
  const [needsGraphs, setNeedsGraphs] = useState(false);
  /* "whatever you see fit" for each option — the AI decides instead */
  const [countAuto, setCountAuto] = useState(false);
  const [typesAuto, setTypesAuto] = useState(false);
  const [distAuto, setDistAuto] = useState(false);

  const target = state.decks.find((d) => d.id === targetId);

  // keep the math toggles in step with the deck being expanded
  useEffect(() => {
    if (mode === "append" && target) {
      setIsSTEM(target.isSTEM ?? false);
      setNeedsEquations(target.needsEquations ?? false);
      setNeedsGraphs(target.needsGraphs ?? false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, targetId]);

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
        isSTEM,
        needsEquations,
        needsGraphs,
        countAuto,
        typesAuto,
        distributionAuto: distAuto,
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
      isSTEM,
      needsEquations,
      needsGraphs,
      countAuto,
      typesAuto,
      distributionAuto: distAuto,
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
    isSTEM,
    needsEquations,
    needsGraphs,
    countAuto,
    typesAuto,
    distAuto,
    state.settings.gradeLevel,
    state.settings.studyReason,
  ]);

  const toggleType = (t: QuestionType) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    toast.success("Instructions copied", {
      description: "Paste them into the AI you already use.",
    });
  };

  const clear = () => {
    setMaterial("");
    setTitle("");
    setSubject("");
    setExtra("");
    toast("Cleared");
  };

  return (
    <div>
      <PageHeader
        title="Prompt Studio · Deck"
        description="Choose what you want to create above, shape the brief, then copy the instructions into the AI you use. Bring the result back to Knowly."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={clear}>
              <Eraser /> Clear
            </Button>
            <Button onClick={copy}>
              <Copy /> Copy instructions
            </Button>
          </div>
        }
      />

      <div className="mb-6">
        <PromptStudioNav active="deck" />
      </div>
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
                ? "Gives you extra questions for a deck you already have — bring them in via “Bring in a deck → Add questions to a deck”."
                : "Gives you a whole new deck."}
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
                  {material.length.toLocaleString()} characters · suggests ~
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

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="question-count">Question count</Label>
                <AutoChoice active={countAuto} onToggle={() => setCountAuto((v) => !v)} />
              </div>
              {countAuto ? (
                <p className="text-xs text-muted-foreground">
                  Your AI decides how many questions the material deserves.
                </p>
              ) : (
                <>
                  <Input
                    id="question-count"
                    type="number"
                    min={5}
                    step={5}
                    value={count}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        setCount(5);
                        return;
                      }
                      const n = Math.round(parseInt(raw, 10) / 5) * 5;
                      setCount(Math.max(5, n));
                    }}
                    className="max-w-[140px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Numbers are rounded to steps of 5. No upper limit.
                  </p>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label>Question types</Label>
              <div className="flex flex-wrap gap-2">
                <AutoChoice active={typesAuto} onToggle={() => setTypesAuto((v) => !v)} />
                {questionTypes.map((t) => (
                  <button
                    key={t}
                    disabled={typesAuto}
                    onClick={() => toggleType(t)}
                    className={cn(
                      "rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors",
                      types.includes(t) && !typesAuto
                        ? "border-primary bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground",
                      typesAuto && "opacity-40",
                    )}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Difficulty distribution</Label>
                <AutoChoice active={distAuto} onToggle={() => setDistAuto((v) => !v)} />
              </div>
              {distAuto ? (
                <p className="text-xs text-muted-foreground">
                  Your AI sets the easy/medium/hard balance from the material.
                </p>
              ) : (
                (["easy", "medium", "hard"] as Difficulty[]).map((d) => (
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
                ))
              )}
            </div>

            <div className="space-y-2">
              <Label>Math &amp; science</Label>
              <div className="grid gap-2">
                <label className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={isSTEM}
                    onChange={(e) => setIsSTEM(e.target.checked)}
                    className="size-4 accent-[var(--primary)]"
                  />
                  <span>This is a math or science subject — use clean math notation</span>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={needsEquations}
                    onChange={(e) => setNeedsEquations(e.target.checked)}
                    className="size-4 accent-[var(--primary)]"
                  />
                  <span>Write equations in LaTeX — Knowly typesets them everywhere</span>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={needsGraphs}
                    onChange={(e) => setNeedsGraphs(e.target.checked)}
                    className="size-4 accent-[var(--primary)]"
                  />
                  <span>May reference graphs &amp; diagrams — describe them in words</span>
                </label>
              </div>
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
              <Save className="size-4 text-primary" /> Saved templates
            </h2>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const name = title || `Template ${state.templates.length + 1}`;
                  saveTemplate({ id: createId(), name, body: prompt });
                  toast.success("Template saved on this device");
                }}
              >
                <Save /> Save these instructions
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
              <Wand2 className="size-4 text-primary" /> Your instructions, ready to copy
            </h2>
            <span className="text-xs text-muted-foreground">
              {prompt.length.toLocaleString()} characters
            </span>
          </div>
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl bg-surface-2/70 p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {prompt}
          </pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={copy}>
              <Copy /> Copy instructions
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
