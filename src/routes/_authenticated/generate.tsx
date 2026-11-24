import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy, Eraser, Save, Wand2, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PromptStudioNav } from "@/components/prompt-studio-nav";
import { PageHeader } from "@/components/app-shell";
import { AutoChoice } from "@/components/auto-choice";
import { LengthDetailControl } from "@/components/length-detail-control";
import { SmartModeToggle } from "@/components/smart-mode-toggle";
import { SourceFileUpload } from "@/components/source-file-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useSmartMode } from "@/hooks/useSmartMode";
import { presetForSliderValue } from "@/lib/length-detail";
import { buildAppendPrompt, buildPrompt, deckSizeTarget, estimateQuestions } from "@/lib/prompt";
import { buildSmartPrompt } from "@/lib/smart-prompt-builder";
import { TYPE_LABELS } from "@/lib/answers";
import { createId } from "@/lib/id";
import { questionTypes } from "@/lib/schema";
import {
  activityLabel,
  LEARNING_ACTIVITY_TYPES,
  LEARNING_PURPOSE_META,
  LEARNING_STAGE_PURPOSES,
} from "@/lib/learning-paths";
import { useKnowly } from "@/store/knowly";
import type { ActivityType, Difficulty, QuestionType, StagePurpose } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ManualStageDraft {
  title: string;
  purpose: StagePurpose;
  concepts: string;
  activityTypes: ActivityType[];
}

const initialManualStages: ManualStageDraft[] = [
  { title: "", purpose: "concept-exposure", concepts: "", activityTypes: [] },
  { title: "", purpose: "active-recall", concepts: "", activityTypes: [] },
  { title: "", purpose: "mastery", concepts: "", activityTypes: [] },
];

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
  const smartMode = useSmartMode();
  const [mode, setMode] = useState<"new" | "append">("new");
  const [targetId, setTargetId] = useState(state.decks[0]?.id ?? "");
  const [material, setMaterial] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(state.settings.focusSubjects[0] ?? "");
  const [countInput, setCountInput] = useState("200");
  const parsedCount = Number(countInput);
  const count =
    Number.isInteger(parsedCount) && Number.isFinite(parsedCount) && parsedCount >= 1
      ? parsedCount
      : 1;
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
  const [lengthSliderValue, setLengthSliderValue] = useState(50);
  const [customLearningPath, setCustomLearningPath] = useState(false);
  const [stageCount, setStageCount] = useState(3);
  const [manualStages, setManualStages] = useState(initialManualStages);

  const target = state.decks.find((d) => d.id === targetId);
  const effectiveMaterial = useMemo(
    () =>
      [material.trim(), smartMode.config.enabled ? smartMode.material.trim() : ""]
        .filter(Boolean)
        .join("\n\n"),
    [material, smartMode.config.enabled, smartMode.material],
  );
  const suggestedCards = deckSizeTarget(countAuto, count, effectiveMaterial);

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
    const learningPath = {
      sliderValue: lengthSliderValue,
      ...(customLearningPath
        ? {
            stageCount,
            customStages: manualStages.slice(0, stageCount).map((stage) => ({
              title: stage.title,
              purpose: stage.purpose,
              concepts: stage.concepts
                .split(",")
                .map((concept) => concept.trim())
                .filter(Boolean),
              activityTypes: stage.activityTypes,
            })),
          }
        : {}),
    };

    if (mode === "append" && target) {
      return buildAppendPrompt({
        material: effectiveMaterial,
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
        lengthSliderValue,
      });
    }

    const promptOptions = {
      material: effectiveMaterial,
      title: title || (smartMode.config.enabled ? (smartMode.suggestions.title ?? "") : ""),
      subject: subject || (smartMode.config.enabled ? (smartMode.suggestions.subject ?? "") : ""),
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
      lengthSliderValue,
      learningPath: {
        ...learningPath,
        lengthPreset: smartMode.config.enabled ? smartMode.config.lengthPreset : undefined,
      },
    };

    return smartMode.config.enabled
      ? buildSmartPrompt({
          content_type: "deck",
          title: promptOptions.title,
          subject: promptOptions.subject,
          material: promptOptions.material,
          suggestions: smartMode.suggestions,
          autoConfigure: smartMode.config.autoConfigure,
          lengthPreset: smartMode.config.lengthPreset,
          lengthSliderValue,
          questionTypes: promptOptions.types,
          difficultyDistribution: promptOptions.distribution,
          isSTEM,
          needsEquations,
          needsGraphs,
          count,
          countAuto,
          typesAuto,
          distributionAuto: distAuto,
          learningPath,
          extra,
          level: state.settings.gradeLevel,
        })
      : buildPrompt(promptOptions);
  }, [
    mode,
    target,
    effectiveMaterial,
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
    lengthSliderValue,
    customLearningPath,
    stageCount,
    manualStages,
    state.settings.gradeLevel,
    state.settings.studyReason,
    smartMode.config,
    smartMode.suggestions,
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
    smartMode.clearFiles();
    toast("Cleared");
  };

  const resizeManualStages = (nextCount: number) => {
    const bounded = Math.max(1, Math.min(8, Math.round(nextCount)));
    setStageCount(bounded);
    setManualStages((current) =>
      Array.from(
        { length: bounded },
        (_, index) =>
          current[index] ?? {
            title: "",
            purpose:
              LEARNING_STAGE_PURPOSES[index % LEARNING_STAGE_PURPOSES.length] ?? "comprehension",
            concepts: "",
            activityTypes: [],
          },
      ),
    );
  };

  const updateManualStage = (index: number, patch: Partial<ManualStageDraft>) => {
    setManualStages((current) =>
      current.map((stage, stageIndex) => (stageIndex === index ? { ...stage, ...patch } : stage)),
    );
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
                  onClick={() => {
                    setMode(m);
                  }}
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
                  {effectiveMaterial.length.toLocaleString()} characters · suggests ~
                  {mode === "new" ? suggestedCards : estimateQuestions(effectiveMaterial.length)}{" "}
                  {mode === "new" ? "cards" : "questions"}
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

            <SmartModeToggle
              enabled={smartMode.config.enabled}
              onToggle={(enabled) =>
                smartMode.setConfig({
                  enabled,
                  lengthPreset: presetForSliderValue(lengthSliderValue),
                  lengthSliderValue,
                })
              }
              fileCount={smartMode.config.sourceFiles.length}
            />
            {smartMode.config.enabled && (
              <SourceFileUpload
                files={smartMode.config.sourceFiles}
                onFilesChange={(sourceFiles) => smartMode.setConfig({ sourceFiles })}
                onProcessFiles={smartMode.processFiles}
              />
            )}

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="question-count">Question count</Label>
                <AutoChoice active={countAuto} onToggle={() => setCountAuto((v) => !v)} />
              </div>
              {countAuto ? (
                <p className="text-xs text-muted-foreground">
                  {mode === "new"
                    ? `Your AI chooses a count based on the material. This brief suggests about ${suggestedCards} cards.`
                    : "Your AI decides how many questions the material deserves."}
                </p>
              ) : (
                <>
                  <Input
                    id="question-count"
                    type="number"
                    min={1}
                    step={1}
                    value={countInput}
                    onChange={(e) => setCountInput(e.target.value)}
                    onBlur={() => setCountInput(String(count))}
                    className="max-w-[140px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    {mode === "new"
                      ? `This brief asks for exactly ${count} cards. The material suggests about ${suggestedCards}.`
                      : "Enter any positive whole number. No upper limit."}
                  </p>
                </>
              )}
              {mode === "new" && (
                <p className="rounded-lg bg-surface-2/60 px-3 py-2 text-xs text-muted-foreground">
                  Every card comes back with tutor notes — a plain-words explanation, a mnemonic, an
                  example and a reason for each wrong option. Knowly organizes the cards into
                  Learning Path stages based on their actual concepts and prerequisites.
                </p>
              )}
            </div>

            <div className="space-y-3 rounded-xl border border-border p-4">
              <div>
                <h3 className="text-sm font-semibold">Learning Path depth</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Controls stage count, practice variety, conceptual depth, explanations, and
                  reinforcement—not just the number of questions.
                </p>
              </div>
              <LengthDetailControl
                value={lengthSliderValue}
                preset={
                  smartMode.config.enabled
                    ? smartMode.config.lengthPreset
                    : presetForSliderValue(lengthSliderValue)
                }
                onChange={(value, preset) => {
                  setLengthSliderValue(value);
                  if (smartMode.config.enabled) {
                    smartMode.setConfig({
                      lengthPreset: preset,
                      lengthSliderValue: value,
                    });
                  }
                }}
              />
            </div>

            {mode === "new" && (
              <section className="space-y-4 rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Learning Path structure</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Let the AI adapt the path to your material, or pin stage goals and activities
                      before generating.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={customLearningPath}
                      onChange={(event) => setCustomLearningPath(event.target.checked)}
                      className="size-4 accent-[var(--primary)]"
                    />
                    Customize stages
                  </label>
                </div>

                {customLearningPath && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <Label>Number of stages</Label>
                        <span>{stageCount}</span>
                      </div>
                      <Slider
                        value={[stageCount]}
                        min={1}
                        max={8}
                        step={1}
                        onValueChange={([value]) => resizeManualStages(value ?? stageCount)}
                      />
                    </div>
                    <div className="space-y-3">
                      {manualStages.slice(0, stageCount).map((stage, index) => (
                        <div key={index} className="space-y-3 rounded-lg bg-surface-2/50 p-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label htmlFor={`stage-title-${index}`}>
                                Stage {index + 1} title
                              </Label>
                              <Input
                                id={`stage-title-${index}`}
                                value={stage.title}
                                onChange={(event) =>
                                  updateManualStage(index, { title: event.target.value })
                                }
                                placeholder="e.g. Cell structure and function"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor={`stage-purpose-${index}`}>Learning purpose</Label>
                              <select
                                id={`stage-purpose-${index}`}
                                value={stage.purpose}
                                onChange={(event) =>
                                  updateManualStage(index, {
                                    purpose: event.target.value as StagePurpose,
                                  })
                                }
                                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                              >
                                {LEARNING_STAGE_PURPOSES.map((purpose) => (
                                  <option key={purpose} value={purpose}>
                                    {LEARNING_PURPOSE_META[purpose].label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`stage-concepts-${index}`}>
                              Concepts to prioritize
                            </Label>
                            <Input
                              id={`stage-concepts-${index}`}
                              value={stage.concepts}
                              onChange={(event) =>
                                updateManualStage(index, { concepts: event.target.value })
                              }
                              placeholder="Comma-separated; leave blank for the AI to decide"
                            />
                          </div>
                          <fieldset className="space-y-2">
                            <legend className="text-xs font-medium">Preferred activities</legend>
                            <div className="flex flex-wrap gap-x-4 gap-y-2">
                              {LEARNING_ACTIVITY_TYPES.map((type) => (
                                <label
                                  key={type}
                                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                                >
                                  <input
                                    type="checkbox"
                                    checked={stage.activityTypes.includes(type)}
                                    onChange={(event) =>
                                      updateManualStage(index, {
                                        activityTypes: event.target.checked
                                          ? [...stage.activityTypes, type]
                                          : stage.activityTypes.filter((value) => value !== type),
                                      })
                                    }
                                    className="size-3.5 accent-[var(--primary)]"
                                  />
                                  {activityLabel(type)}
                                </label>
                              ))}
                            </div>
                            {!stage.activityTypes.length && (
                              <p className="text-[11px] text-muted-foreground">
                                No preference set — the AI chooses activities that suit this stage.
                              </p>
                            )}
                          </fieldset>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}

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
