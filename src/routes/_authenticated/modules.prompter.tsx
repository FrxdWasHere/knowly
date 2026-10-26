import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Plus, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useKnowly } from "@/store/knowly";
import { cn } from "@/lib/utils";
import type { Module } from "@/lib/types";

interface Blurb {
  id: string;
  title: string;
  color: string;
  body: string;
}

const BLURB_COLORS = ["#6d8cff", "#f2a65a", "#5fd38a", "#f06292", "#9575cd", "#4dd0e1"];

export const Route = createFileRoute("/_authenticated/modules/prompter")({
  head: () => ({ meta: [{ title: "Module Prompter — Knowly" }] }),
  component: () => (
    <AppPage>
      <ModulePrompter />
    </AppPage>
  ),
});

function ModulePrompter() {
  const { addModule } = useKnowly();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState("2");
  const [minutes, setMinutes] = useState("15");
  const [objectives, setObjectives] = useState("");
  const [topics, setTopics] = useState("");
  const [blurbs, setBlurbs] = useState<Blurb[]>([
    {
      id: "b1",
      title: "Key idea",
      color: "#6d8cff",
      body: "A one-sentence takeaway the learner must remember.",
    },
  ]);

  const addBlurb = () => {
    const id = `b_${Date.now()}`;
    setBlurbs((bs) => [
      ...bs,
      { id, title: "New blurb", color: BLURB_COLORS[bs.length % BLURB_COLORS.length], body: "" },
    ]);
  };
  const updateBlurb = (id: string, patch: Partial<Blurb>) =>
    setBlurbs((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const removeBlurb = (id: string) => setBlurbs((bs) => bs.filter((b) => b.id !== id));

  const prompt = useMemoPrompt({ title, subject, difficulty, minutes, objectives, topics, blurbs });

  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    toast.success("Module instructions copied — paste into your AI");
  };

  const forgeFromPrompt = () => {
    const now = Date.now();
    const mod: Module = {
      id: `mod_${Math.random().toString(36).slice(2, 10)}_${now.toString(36)}`,
      title: title.trim() || "Untitled module",
      subject: subject.trim() || "General",
      color: "#6d8cff",
      emoji: "📘",
      tags: [],
      isSTEM: false,
      needsEquations: false,
      needsGraphs: false,
      objectives: objectives
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
      blocks: [
        { id: `b_${now}`, type: "markdown", markdown: `# ${title.trim() || "New module"}\n\n` },
        ...blurbs.map((bl) => ({
          id: `bl_${bl.id}`,
          type: "callout" as const,
          tone: "info" as const,
          title: bl.title,
          markdown: bl.body || "Fill in this blurb.",
        })),
      ],
      questions: [],
      linkedDeckIds: [],
      estimatedMinutes: Number(minutes) || 15,
      difficulty: Number(difficulty) as 1 | 2 | 3,
      createdAt: now,
      updatedAt: now,
    };
    addModule(mod);
    navigate({ to: "/modules/$moduleId", params: { moduleId: mod.id } } as never);
    toast.success("Module scaffold created — refine it in the editor");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Module Prompter"
        description="Build instructions for your AI to forge a module. Add as many colored title blurbs as you like — they become reusable callout blocks."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="panel space-y-3 p-4">
            <h3 className="font-display text-sm font-semibold">Module brief</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Photosynthesis in 10 minutes"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Biology"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Difficulty</Label>
                <select
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option value="1">Intro</option>
                  <option value="2">Core</option>
                  <option value="3">Advanced</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Minutes</Label>
                <Input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Objectives (one per line)</Label>
              <Textarea
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                className="min-h-20"
                placeholder="Explain the light reactions…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Topics to cover (one per line)</Label>
              <Textarea
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                className="min-h-20"
                placeholder="Chloroplast structure\nLight-dependent reactions"
              />
            </div>
          </div>

          <div className="panel space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold">Blurbs (rectangle callouts)</h3>
              <Button size="sm" variant="outline" onClick={addBlurb}>
                <Plus className="size-4" /> Add blurb
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Each blurb becomes a colored, titled rectangle block. Add as many as you like —
              practically infinite.
            </p>
            <div className="space-y-3">
              {blurbs.map((b) => (
                <div key={b.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={b.color}
                      onChange={(e) => updateBlurb(b.id, { color: e.target.value })}
                      className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
                    />
                    <Input
                      value={b.title}
                      onChange={(e) => updateBlurb(b.id, { title: e.target.value })}
                      placeholder="Blurb title"
                      className="flex-1"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => removeBlurb(b.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <Textarea
                    value={b.body}
                    onChange={(e) => updateBlurb(b.id, { body: e.target.value })}
                    placeholder="What this blurb should say…"
                    className="min-h-16"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold">Generated instructions</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copy}>
                <Copy className="size-4" /> Copy
              </Button>
              <Button size="sm" onClick={forgeFromPrompt}>
                <Wand2 className="size-4" /> Forge module
              </Button>
            </div>
          </div>
          <Textarea value={prompt} readOnly className="min-h-[28rem] font-mono text-xs" />
        </div>
      </div>
    </div>
  );
}

function useMemoPrompt(input: {
  title: string;
  subject: string;
  difficulty: string;
  minutes: string;
  objectives: string;
  topics: string;
  blurbs: Blurb[];
}) {
  const { title, subject, difficulty, minutes, objectives, topics, blurbs } = input;
  const diffLabel = difficulty === "1" ? "Intro" : difficulty === "3" ? "Advanced" : "Core";
  const objList = objectives
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  const topicList = topics
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  const blurbSpec = blurbs
    .map(
      (b, i) => `  ${i + 1}. "${b.title}" (color ${b.color}) — ${b.body || "a focused takeaway"}`,
    )
    .join("\n");

  return `You are helping build a Knowly module — a standalone, one-off lesson on a single idea.

MODULE BRIEF
- Title: ${title || "Untitled module"}
- Subject: ${subject || "General"}
- Difficulty: ${diffLabel}
- Estimated time: ${minutes || 15} minutes
- Objectives:
${objList.length ? objList.map((o) => "  - " + o).join("\n") : "  - (define 2-4 measurable objectives)"}
- Topics to cover:
${topicList.length ? topicList.map((t) => "  - " + t).join("\n") : "  - (list the key topics)"}

HOW TO WRITE THE MODULE
Write the module as Markdown. Use these block types, in this order, and keep each block focused:

1. A short intro paragraph (2-4 sentences) setting up the idea.
2. "## " headings for each topic.
3. Regular paragraphs + bullet lists for explanation.
4. Callouts using the BLURB rectangles below — these are the module's signature tool. Treat each blurb as a colored, titled rectangle the learner can scan. Use them liberally for key ideas, warnings, tips and definitions. You may also INVENT brand-new blurbs (new title, new body, new color) whenever the content calls for a concept that none of the listed blurbs cover — the blurb system is open-ended, so create as many AI-authored blurbs as the lesson needs. A module is BETTER when it uses blurbs to chunk information; never dump a wall of text.
5. At least one "Checkpoint" per major topic: a question followed by a hidden answer the learner reveals.
6. End with a 3-bullet "Takeaway" summary.

BLURBS (colored rectangle callouts — use all of them, and reuse freely)
${blurbSpec || "  (add blurbs in the panel to define your toolkit)"}

OUTPUT FORMAT
Return the entire module as a single Markdown FILE (a .md document). Output ONLY the raw Markdown file contents — no code fences, no surrounding commentary, no "here is your file" preamble. Suggested filename: module-<slug>.md. Use "$...$" for inline math and "$$...$$" for display math. Each blurb must appear as a Markdown blockquote of the form:

> **${blurbs[0]?.title ?? "Blurb"}** (color: ${blurbs[0]?.color ?? "#6d8cff"})
> <blurb body>

Repeat for every blurb you use. You are NOT limited to the blurbs listed above — create your OWN blurbs whenever the content calls for it: choose the title, the body text, and a hex color that fits the meaning (warm colors for warnings, cool colors for key ideas, green for tips). The blurb system is effectively infinite, so lean on it as your primary structuring tool and add as many AI-authored blurbs as the lesson needs.`;
}
