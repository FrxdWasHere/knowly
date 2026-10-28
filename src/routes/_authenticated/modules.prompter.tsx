import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Plus, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PromptStudioNav } from "@/components/prompt-studio-nav";
import { AutoChoice } from "@/components/auto-choice";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useKnowly } from "@/store/knowly";
import type { Module } from "@/lib/types";

interface Blurb {
  id: string;
  title: string;
  color: string;
  body: string;
}

const BLURB_COLORS = ["#6d8cff", "#f2a65a", "#5fd38a", "#f06292", "#9575cd", "#4dd0e1"];

export const Route = createFileRoute("/_authenticated/modules/prompter")({
  head: () => ({
    meta: [
      { title: "Module Prompter — Generate a Module Prompt | Knowly" },
      {
        name: "description",
        content:
          "Turn a topic into a strict AI prompt for a standalone module: writing blocks, colored blurbs and checkpoint questions. Copy the instructions, bring the JSON back, import it.",
      },
    ],
  }),
  component: ModulePrompter,
});

function ModulePrompter() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState("2");
  const [minutes, setMinutes] = useState("15");
  const [objectives, setObjectives] = useState("");
  const [topics, setTopics] = useState("");
  const [extra, setExtra] = useState("");
  const [tone, setTone] = useState("");
  /* "whatever you see fit" for each option — the AI decides instead */
  const [difficultyAuto, setDifficultyAuto] = useState(false);
  const [minutesAuto, setMinutesAuto] = useState(false);
  const [blurbs, setBlurbs] = useState<Blurb[]>([
    {
      id: "b1",
      title: "Key idea",
      color: "#6d8cff",
      body: "A one-sentence takeaway the learner must remember.",
    },
    {
      id: "b2",
      title: "Common mistake",
      color: "#f2a65a",
      body: "Something learners often get wrong here.",
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

  const prompt = useMemo(
    () =>
      buildModulePrompt({
        title,
        subject,
        difficulty,
        minutes,
        objectives,
        topics,
        extra,
        tone,
        blurbs,
        difficultyAuto,
        minutesAuto,
      }),
    [
      title,
      subject,
      difficulty,
      minutes,
      objectives,
      topics,
      extra,
      tone,
      blurbs,
      difficultyAuto,
      minutesAuto,
    ],
  );

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    toast.success("Module instructions copied — paste into your AI");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Prompt Studio · Module"
        description="Describe one focused lesson, then copy the instructions into the AI you use. Bring the finished module back through Import a module."
        action={
          <>
            <Button variant="outline" onClick={copyPrompt}>
              <Wand2 className="size-4" /> Copy instructions
            </Button>
            <Button asChild variant="outline">
              <a href="/modules/import">
                <Download className="size-4" /> Import a module
              </a>
            </Button>
          </>
        }
      />

      <div className="mb-6">
        <PromptStudioNav active="module" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="panel space-y-3 p-5">
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
                  value={difficultyAuto ? "auto" : difficulty}
                  onChange={(e) => {
                    if (e.target.value === "auto") {
                      setDifficultyAuto(true);
                      return;
                    }
                    setDifficultyAuto(false);
                    setDifficulty(e.target.value);
                  }}
                >
                  <option value="1">Intro</option>
                  <option value="2">Core</option>
                  <option value="3">Advanced</option>
                  <option value="auto">Whatever you see fit</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>Minutes</Label>
                  <AutoChoice active={minutesAuto} onToggle={() => setMinutesAuto((v) => !v)} />
                </div>
                {minutesAuto ? (
                  <p className="text-xs text-muted-foreground">
                    Your AI picks a length that fits the material.
                  </p>
                ) : (
                  <Input
                    type="number"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                  />
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Goals (one per line)</Label>
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
                placeholder={"Chloroplast structure\nLight-dependent reactions"}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Extra instructions</Label>
              <Textarea
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                className="min-h-16"
                placeholder="Aim it at a Grade 11 class, use metric units…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tone of voice</Label>
              <Textarea
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="min-h-28"
                placeholder="Paste a paragraph or two about how it should sound — e.g. “Write like a patient tutor: warm and direct, short sentences, a little dry humour, second person, no hype.”"
              />
              <p className="text-xs text-muted-foreground">
                Shapes how the module reads, never the facts. Leave it empty for Knowly's neutral
                teaching voice.
              </p>
            </div>
          </div>

          <div className="panel space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold">Blurb toolkit</h3>
              <Button size="sm" variant="outline" onClick={addBlurb}>
                <Plus className="size-4" /> Add blurb
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Each blurb becomes a titled callout block. Add as many as you like — and the prompt
              tells the AI to invent its own blurbs on top of these whenever the content calls for
              one.
            </p>
            <div className="space-y-3">
              {blurbs.map((b) => (
                <div key={b.id} className="space-y-2 rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-6 shrink-0 rounded-md ring-1 ring-border"
                      style={{ background: b.color }}
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-sm font-semibold">Your instructions, ready to copy</h3>
            <Badge variant="outline">Outputs one JSON file</Badge>
          </div>
          <div className="panel p-4">
            <Textarea
              value={prompt}
              readOnly
              className="min-h-[34rem] font-mono text-xs leading-6"
              spellCheck={false}
            />
            <div className="mt-3 flex justify-end">
              <Button onClick={copyPrompt}>
                <Wand2 className="size-4" /> Copy instructions
              </Button>
            </div>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Save the JSON the AI writes as a file, then bring it back through{" "}
            <a href="/modules/import" className="text-primary underline">
              Import a module
            </a>
            . Knowly checks every block and checkpoint before it joins your library.
          </p>
        </div>
      </div>
    </div>
  );
}

function buildModulePrompt(input: {
  title: string;
  subject: string;
  difficulty: string;
  minutes: string;
  objectives: string;
  topics: string;
  extra: string;
  /** how the writing should sound — a paragraph or two in the learner's own words */
  tone: string;
  blurbs: Blurb[];
  /** "whatever you see fit": let the AI pick the depth instead */
  difficultyAuto?: boolean;
  /** "whatever you see fit": let the AI pick the length instead */
  minutesAuto?: boolean;
}) {
  const { title, subject, difficulty, minutes, objectives, topics, extra, tone, blurbs } = input;
  const { difficultyAuto, minutesAuto } = input;
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
      (b, i) =>
        `  ${i + 1}. "${b.title}" — ${b.body || "a focused takeaway"} (suggest tone: ${
          ["info", "tip", "warning", "definition"][i % 4]
        })`,
    )
    .join("\n");

  return `You are building a Knowly module — a standalone, one-off lesson on a single idea.

MODULE BRIEF
- Title: ${title || "(choose a fitting title)"}
- Subject: ${subject || "General"}
- Difficulty: ${difficultyAuto ? "your choice — pick the depth that fits the material" : diffLabel}
- Estimated time: ${
    minutesAuto ? "your choice — pick a length that fits the material" : `${minutes || 15} minutes`
  }
- Goals:
${objList.length ? objList.map((o) => "  - " + o).join("\n") : "  - (define 2-4 measurable goals)"}
- Topics to cover:
${topicList.length ? topicList.map((t) => "  - " + t).join("\n") : "  - (choose the key topics yourself)"}
${extra ? `- Extra instructions: ${extra}\n` : ""}${
    tone.trim()
      ? `\nTONE & VOICE\nWrite everything — the lesson prose, every blurb, the examples, the checkpoint questions and their answers — in this voice:\n"""\n${tone.trim()}\n"""\nThe voice shapes how it reads, never what is true: keep the facts exact and the block/JSON rules below intact.\n`
      : ""
  }
HOW TO WRITE THE MODULE
Write short, focused blocks. Use these types:

1. {"type":"markdown","markdown":"…"} — the lesson writing (markdown, "## " headings per topic).
2. {"type":"callout","tone":"info|tip|warning|definition","title":"…","markdown":"…"} — a BLURB: a colored titled rectangle the learner can scan. Blurbs are the module's signature tool — use them generously for key ideas, warnings, tips and definitions. A module is BETTER when blurbs chunk the information; never write a wall of text.
3. {"type":"example","title":"…","markdown":"…"} — a worked example.
4. {"type":"checkpoint","questionId":"q1"} — an inline question, matched by id to the questions array.
5. {"type":"divider"} — a section break.

You are NOT limited to the blurbs listed below — invent your OWN blurbs whenever the content calls for one: choose the title, the body, and the tone that fits the meaning (warning for pitfalls, tip for shortcuts, definition for terms, info for key ideas). The blurb toolkit is effectively infinite, so lean on it as your primary structuring tool and add as many authored blurbs as the lesson needs.

EQUATIONS & NOTATION
- Both the module view and its printed version typeset LaTeX, so use it any time you need an equation — inline math as $…$ inside a sentence, or $$…$$ on its own line when the equation deserves its own block.
- That works in every text field: lesson markdown, blurb titles and bodies, worked examples, objectives, tags, and checkpoint questions, options and answers.
- Write real LaTeX for anything mathematical — e.g. $E = mc^2$, $\\frac{d}{dx}x^2 = 2x$, $\\int_0^\\infty e^{-x}\\,dx$, an acceleration of $9.81\\,\\text{m/s}^2$, or $H_2O$ for a formula.
- Keep ordinary words outside the math delimiters. Never fake an equation with plain characters and never put math inside a code block.
- Escape backslashes so the JSON stays valid (e.g. \\\\frac in the raw file).
- Reach for LaTeX whenever the subject calls for it, whatever the subject is — physics, chemistry, economics, statistics or geometry.

BLURBS REQUESTED (include all of these)
${blurbSpec || "  (none requested — blur your own)"}

QUESTIONS
Add 3-6 checkpoint questions${minutesAuto ? "" : ` for a ${minutes || 15}-minute module`}. Types: "short-answer" (question + answer text) or "multiple-choice" (question + options + answer = the exact correct option text, no letter). Every checkpoint block's questionId must match a question's id. Write the question, its options and its answer in LaTeX whenever they involve an equation or symbol.

OUTPUT RULES
- Respond with ONE valid JSON object and nothing else. No markdown fences, no filename, no commentary.
- Every string must be valid JSON (escape quotes and newlines).
- Shape:
{
  "title": string,
  "subject": string,
  "difficulty": ${difficultyAuto ? "1 | 2 | 3 (the depth you judge right)" : difficulty},
  "emoji": string,
  "tags": string[],
  "objectives": string[],
  "estimatedMinutes": number,
  "blocks": (the blocks, in order),
  "questions": (the checkpoint questions),
  "linkedDeckIds": []
}
- Do not set "blocks" to null; always give an array, even if it only holds writing so far.`;
}
