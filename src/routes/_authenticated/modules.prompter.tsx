import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, Plus, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PromptStudioNav } from "@/components/prompt-studio-nav";
import { AutoChoice } from "@/components/auto-choice";
import { LengthDetailControl } from "@/components/length-detail-control";
import { SmartModeToggle } from "@/components/smart-mode-toggle";
import { SourceFileUpload } from "@/components/source-file-upload";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { openImportPanel } from "@/lib/import-panel";
import { buildModulePrompt } from "@/lib/module-prompt";
import { useSmartMode } from "@/hooks/useSmartMode";

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
          "Turn source material and a topic brief into a textbook-style Module prompt with chapters, sections, and checkpoint questions.",
      },
    ],
  }),
  component: ModulePrompter,
});

function ModulePrompter() {
  const smartMode = useSmartMode();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [material, setMaterial] = useState("");
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

  useEffect(() => {
    if (!smartMode.config.enabled || !smartMode.config.autoConfigure) return;

    const suggestions = smartMode.suggestions;
    const topicSuggestions = suggestions.topics ?? [];
    setTitle((current) => current || suggestions.title || "");
    setSubject((current) => current || suggestions.subject || "");
    setDescription(
      (current) =>
        current ||
        suggestions.description ||
        (topicSuggestions.length
          ? `A textbook-style module introducing ${topicSuggestions.slice(0, 5).join(", ")}.`
          : ""),
    );
    setObjectives((current) => current || suggestions.learningObjectives?.join("\n") || "");
    setTopics((current) => current || topicSuggestions.join("\n"));
  }, [smartMode.config.autoConfigure, smartMode.config.enabled, smartMode.suggestions]);

  const effectiveMaterial = useMemo(
    () =>
      [
        material.trim() ? `[Pasted material]\n${material.trim()}` : "",
        smartMode.config.enabled ? smartMode.material.trim() : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    [material, smartMode.config.enabled, smartMode.material],
  );
  const needsFileProcessing =
    smartMode.config.enabled &&
    smartMode.config.sourceFiles.some((file) => file.processingStatus !== "completed");

  const prompt = useMemo(
    () =>
      buildModulePrompt({
        title,
        subject,
        description,
        difficulty,
        minutes,
        objectives,
        topics,
        material: effectiveMaterial,
        extra,
        tone,
        blurbs,
        lengthSliderValue: smartMode.config.lengthSliderValue,
        smartModeEnabled: smartMode.config.enabled,
        difficultyAuto,
        minutesAuto,
      }),
    [
      title,
      subject,
      description,
      difficulty,
      minutes,
      objectives,
      topics,
      effectiveMaterial,
      extra,
      tone,
      blurbs,
      smartMode.config.enabled,
      smartMode.config.lengthSliderValue,
      difficultyAuto,
      minutesAuto,
    ],
  );

  const copyPrompt = async () => {
    if (needsFileProcessing) {
      toast.error("Process or remove each uploaded file before copying the prompt.");
      return;
    }
    await navigator.clipboard.writeText(prompt);
    toast.success("Module instructions copied — paste into your AI");
  };

  return (
    <AppPage>
      <PageHeader
        title="Prompt Studio · Module"
        description="Shape a standalone, textbook-style learning resource, then copy the instructions into the AI you use. Bring the finished module back through Import a module."
        action={
          <>
            <Button
              variant="outline"
              onClick={copyPrompt}
              disabled={smartMode.isLoading || needsFileProcessing}
            >
              <Wand2 className="size-4" /> Copy instructions
            </Button>
            <Button variant="outline" onClick={() => openImportPanel({ kind: "module" })}>
              <Download className="size-4" /> Import a module
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
            <SmartModeToggle
              enabled={smartMode.config.enabled}
              onToggle={(enabled) => {
                smartMode.setConfig({ enabled });
                if (enabled) {
                  setDifficultyAuto(true);
                  setMinutesAuto(true);
                }
              }}
              fileCount={smartMode.config.sourceFiles.length}
            />
            {smartMode.config.enabled && (
              <>
                <SourceFileUpload
                  files={smartMode.config.sourceFiles}
                  onFilesChange={(sourceFiles) => smartMode.setConfig({ sourceFiles })}
                  onProcessFiles={smartMode.processFiles}
                />
                {smartMode.suggestions.title && (
                  <p className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                    Source-analysis suggestions are shown in the editable fields below. Review or
                    change them before copying the prompt.
                  </p>
                )}
              </>
            )}
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
                  placeholder="AI can infer this from your source material"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-16"
                  placeholder="A clear one-sentence description of what this module teaches."
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
              <Label>Chapter and section guidance (one per line)</Label>
              <Textarea
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                className="min-h-20"
                placeholder={
                  "Foundations of photosynthesis\nLight-dependent reactions\nThe Calvin cycle"
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Source material (optional)</Label>
              <Textarea
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="min-h-36 font-mono text-xs"
                placeholder="Paste notes or source text here. You can combine this with Smart Mode uploads."
              />
            </div>
            <div className="space-y-3 rounded-xl border border-border p-4">
              <div>
                <h3 className="text-sm font-semibold">Length and detail</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Shapes the chapter and section outline, explanation depth, examples, context, and
                  checkpoint practice—not just the word count.
                </p>
              </div>
              <LengthDetailControl
                value={smartMode.config.lengthSliderValue}
                preset={smartMode.config.lengthPreset}
                onChange={(value, preset) =>
                  smartMode.setConfig({
                    lengthSliderValue: value,
                    lengthPreset: preset,
                  })
                }
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
              <Button onClick={copyPrompt} disabled={smartMode.isLoading || needsFileProcessing}>
                <Wand2 className="size-4" /> Copy instructions
              </Button>
            </div>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Save the JSON the AI writes as a file, then bring it back through{" "}
            <button
              type="button"
              onClick={() => openImportPanel({ kind: "module" })}
              className="text-primary underline"
            >
              Import a module
            </button>
            . Knowly checks every block and checkpoint before it joins your library.
          </p>
        </div>
      </div>
    </AppPage>
  );
}
