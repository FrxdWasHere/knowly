import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookPlus,
  Check,
  ClipboardCopy,
  FileJson,
  Sparkles,
  Wand2,
} from "lucide-react";
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
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { TYPE_LABELS } from "@/lib/answers";
import { createId } from "@/lib/id";
import { buildCoursePrompt, estimateCourseQuestions } from "@/lib/course-prompt";
import { openImportPanel } from "@/lib/import-panel";
import { questionTypes } from "@/lib/schema";
import { useSmartMode } from "@/hooks/useSmartMode";
import { useKnowly } from "@/store/knowly";
import { cn } from "@/lib/utils";
import type { Course, Difficulty, QuestionType } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/courses/forge")({
  head: () => ({
    meta: [
      { title: "Course Forge — Generate a Full Course Prompt | Knowly" },
      {
        name: "description",
        content:
          "Build a complete course prompt from a topic or locally processed source files, with editable unit, lesson, section, and learning-objective guidance.",
      },
    ],
  }),
  component: CourseForgePage,
});

const DEFAULT_TYPES: QuestionType[] = [
  "multiple-choice",
  "true-false",
  "short-answer",
  "flashcard",
];

function CourseForgePage() {
  const { state, addCourse } = useKnowly();
  const navigate = useNavigate();
  const smartMode = useSmartMode();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [material, setMaterial] = useState("");
  const [description, setDescription] = useState("");
  const [objectives, setObjectives] = useState("");
  const [sectionGuidance, setSectionGuidance] = useState("");
  const [level, setLevel] = useState(state.settings.gradeLevel);
  const [levelAuto, setLevelAuto] = useState(false);
  const [modules, setModules] = useState(4);
  const [lessons, setLessons] = useState(3);
  const [sectionsPerLesson, setSectionsPerLesson] = useState(3);
  const [sectionsAuto, setSectionsAuto] = useState(true);
  const [questions, setQuestions] = useState(6);
  const [types, setTypes] = useState<QuestionType[]>(DEFAULT_TYPES);
  const [easy, setEasy] = useState(20);
  const [medium, setMedium] = useState(55);
  const [hard, setHard] = useState(25);
  const [extra, setExtra] = useState("");
  const [tone, setTone] = useState("");
  /* "whatever you see fit" for each option — the AI decides instead */
  const [sizeAuto, setSizeAuto] = useState(false);
  const [typesAuto, setTypesAuto] = useState(false);
  const [distAuto, setDistAuto] = useState(false);
  const [includeAssessments, setIncludeAssessments] = useState(true);
  const [isSTEM, setIsSTEM] = useState(false);
  const [needsEquations, setNeedsEquations] = useState(false);
  const [needsGraphs, setNeedsGraphs] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!smartMode.config.enabled || !smartMode.config.autoConfigure) return;

    const suggestions = smartMode.suggestions;
    setTitle((current) => current || suggestions.title || "");
    setSubject((current) => current || suggestions.subject || "");
    setTopic((current) => current || suggestions.topics?.join("\n") || "");
    setDescription((current) => current || suggestions.description || "");
    setObjectives((current) => current || suggestions.learningObjectives?.join("\n") || "");
  }, [smartMode.config.autoConfigure, smartMode.config.enabled, smartMode.suggestions]);

  const effectiveMaterial = useMemo(
    () =>
      [
        material.trim() ? `[Pasted reference]\n${material.trim()}` : "",
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
      buildCoursePrompt({
        topic,
        material: effectiveMaterial,
        title,
        subject,
        level,
        description,
        objectives,
        sectionGuidance,
        sectionsPerLesson,
        sectionsAuto,
        moduleCount: modules,
        lessonsPerModule: lessons,
        questionsPerLesson: questions,
        types,
        distribution: { easy, medium, hard },
        audience: state.settings.gradeLevel,
        purpose: state.settings.studyReason,
        extra,
        tone,
        sizeAuto,
        typesAuto,
        distributionAuto: distAuto,
        levelAuto,
        lengthSliderValue: smartMode.config.lengthSliderValue,
        smartModeEnabled: smartMode.config.enabled,
        includeAssessments,
        isSTEM,
        needsEquations,
        needsGraphs,
      }),
    [
      topic,
      effectiveMaterial,
      title,
      subject,
      level,
      description,
      objectives,
      sectionGuidance,
      sectionsPerLesson,
      sectionsAuto,
      modules,
      lessons,
      questions,
      types,
      easy,
      medium,
      hard,
      extra,
      tone,
      sizeAuto,
      typesAuto,
      distAuto,
      levelAuto,
      smartMode.config.lengthSliderValue,
      smartMode.config.enabled,
      includeAssessments,
      isSTEM,
      needsEquations,
      needsGraphs,
      state.settings.gradeLevel,
      state.settings.studyReason,
    ],
  );

  const totalQuestions = estimateCourseQuestions({
    topic,
    material,
    title,
    subject,
    level,
    moduleCount: modules,
    lessonsPerModule: lessons,
    questionsPerLesson: questions,
    types,
    distribution: { easy, medium, hard },
    extra,
    includeAssessments,
  });

  const copyPrompt = async () => {
    if (needsFileProcessing) {
      toast.error("Process or remove each uploaded file before copying the prompt.");
      return;
    }
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    toast.success("Course instructions copied");
    window.setTimeout(() => setCopied(false), 1800);
  };

  const createEmpty = () => {
    const now = Date.now();
    const courseId = createId();
    const moduleId = createId();
    const lessonId = createId();
    const newCourse: Course = {
      id: courseId,
      title: title.trim() || topic.trim() || "Untitled course",
      subject: subject.trim() || "General",
      description: "A blank course ready to edit.",
      level: level.trim() || undefined,
      color: "var(--deck-1)",
      emoji: "📘",
      tags: [],
      isSTEM: isSTEM,
      needsEquations: needsEquations,
      needsGraphs: needsGraphs,
      objectives: [],
      sources: material.trim()
        ? [{ id: createId(), title: "Reference notes", content: material.trim() }]
        : [],
      modules: [
        {
          id: moduleId,
          title: "Module 1",
          objectives: [],
          linkedDeckIds: [],
          lessons: [
            {
              id: lessonId,
              title: "Lesson 1",
              objectives: [],
              blocks: [
                {
                  id: createId(),
                  type: "markdown",
                  markdown: "Start writing this lesson here. Markdown is supported.",
                },
              ],
              questions: [],
              linkedDeckIds: [],
            },
          ],
        },
      ],
      linkedDeckIds: [],
      createdAt: now,
      updatedAt: now,
    };
    addCourse(newCourse);
    toast.success("Blank course created");
    navigate({ to: "/courses/$courseId/edit", params: { courseId } });
  };

  const toggleType = (type: QuestionType) => {
    setTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );
  };

  return (
    <AppPage>
      <PageHeader
        title="Prompt Studio · Course"
        description="Build a complete course from a topic or source files. Materials are processed on this device; copy the prompt to your chosen AI, then import the finished course."
        action={
          <>
            <Button variant="outline" onClick={() => openImportPanel({ kind: "course" })}>
              <FileJson className="size-4" /> Bring the course in
            </Button>
            <Button variant="outline" onClick={createEmpty}>
              <BookPlus className="size-4" /> Blank course
            </Button>
            <Button onClick={copyPrompt} disabled={smartMode.isLoading || needsFileProcessing}>
              {copied ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}
              {copied ? "Copied" : "Copy instructions"}
            </Button>
          </>
        }
      />

      <div className="mb-6">
        <PromptStudioNav active="course" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="panel space-y-5 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Wand2 className="size-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Course brief</h2>
          </div>

          <SmartModeToggle
            enabled={smartMode.config.enabled}
            onToggle={(enabled) => {
              smartMode.setConfig({ enabled });
              if (enabled) {
                setLevelAuto(true);
                setSizeAuto(true);
                setSectionsAuto(true);
                setTypesAuto(true);
                setDistAuto(true);
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
              {(smartMode.suggestions.title || smartMode.suggestions.topics?.length) && (
                <p className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                  Source-analysis suggestions are placed in the editable brief fields below. Review
                  or change them before copying the prompt.
                </p>
              )}
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="course-title">Course title</Label>
              <Input
                id="course-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Organic Chemistry Foundations; leave blank to infer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-subject">Subject</Label>
              <Input
                id="course-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="e.g. Chemistry; leave blank to infer"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-description">Course description</Label>
            <Textarea
              id="course-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="A clear overview of the course scope and what learners will be able to do."
              className="min-h-20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-topic">Course scope / topics</Label>
            <Textarea
              id="course-topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Describe the course goal or list topics to cover, one per line. The AI will organize them into a coherent program."
              className="min-h-24"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-objectives">Learning objectives (one per line)</Label>
            <Textarea
              id="course-objectives"
              value={objectives}
              onChange={(event) => setObjectives(event.target.value)}
              placeholder="Explain the main concepts...\nApply the concepts to a new scenario..."
              className="min-h-24"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-structure">Unit, lesson, or section guidance (optional)</Label>
            <Textarea
              id="course-structure"
              value={sectionGuidance}
              onChange={(event) => setSectionGuidance(event.target.value)}
              placeholder="List any required units, lessons, or topics. The AI will preserve these while organizing the remaining material."
              className="min-h-20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-material">Reference material</Label>
            <Textarea
              id="course-material"
              value={material}
              onChange={(event) => setMaterial(event.target.value)}
              placeholder="Paste a syllabus, lecture notes, textbook excerpt or source list. You can combine this with Smart Mode uploads."
              className="min-h-40"
            />
            <p className="text-xs text-muted-foreground">
              Pasted and uploaded sources are combined as one reference set and treated as the
              factual anchor.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="course-level">Course level / difficulty</Label>
                <AutoChoice active={levelAuto} onToggle={() => setLevelAuto((value) => !value)} />
              </div>
              {levelAuto ? (
                <p className="text-xs text-muted-foreground">
                  The AI will infer the appropriate course level from the scope and learner.
                </p>
              ) : (
                <Input
                  id="course-level"
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                  placeholder="Grade 11, undergraduate…"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-extra">Extra instructions</Label>
              <Input
                id="course-extra"
                value={extra}
                onChange={(event) => setExtra(event.target.value)}
                placeholder="Exam board, constraints…"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border p-4">
            <div>
              <h3 className="text-sm font-semibold">Length and detail</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Shapes the number of units and lessons when automatic, section depth, concept
                coverage, examples, and the completeness of each lesson.
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

          <div className="space-y-2">
            <Label htmlFor="course-tone">Tone of voice</Label>
            <Textarea
              id="course-tone"
              value={tone}
              onChange={(event) => setTone(event.target.value)}
              placeholder="Paste a paragraph or two about how it should sound — e.g. “Write like a patient tutor: warm and direct, short sentences, a little dry humour, second person, no hype.”"
              className="min-h-28"
            />
            <p className="text-xs text-muted-foreground">
              Shapes how the course reads, never the facts. Leave it empty for Knowly's neutral
              teaching voice.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Course size</Label>
              <AutoChoice active={sizeAuto} onToggle={() => setSizeAuto((v) => !v)} />
            </div>
            {sizeAuto ? (
              <p className="text-xs text-muted-foreground">
                Your AI sizes the course to the material — as many units, lessons and checkpoints as
                it warrants.
              </p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-3">
                <Counter label="Units" value={modules} onChange={setModules} min={1} max={12} />
                <Counter
                  label="Lessons / unit"
                  value={lessons}
                  onChange={setLessons}
                  min={1}
                  max={8}
                />
                <Counter
                  label="Questions / lesson"
                  value={questions}
                  onChange={setQuestions}
                  min={0}
                  max={20}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Sections per lesson</Label>
              <AutoChoice
                active={sectionsAuto}
                onToggle={() => setSectionsAuto((value) => !value)}
              />
            </div>
            {sectionsAuto ? (
              <p className="text-xs text-muted-foreground">
                The selected length/detail setting and lesson content guide the section count.
              </p>
            ) : (
              <Counter
                label="Exact sections / lesson"
                value={sectionsPerLesson}
                onChange={setSectionsPerLesson}
                min={1}
                max={8}
              />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Question types</Label>
              <span className="text-xs text-muted-foreground">{types.length} selected</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <AutoChoice active={typesAuto} onToggle={() => setTypesAuto((v) => !v)} />
              {questionTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  disabled={typesAuto}
                  onClick={() => toggleType(type)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    types.includes(type) && !typesAuto
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border bg-surface-2 text-muted-foreground hover:text-foreground",
                    typesAuto && "opacity-40",
                  )}
                >
                  {TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Difficulty mix</Label>
              <AutoChoice active={distAuto} onToggle={() => setDistAuto((v) => !v)} />
            </div>
            {distAuto ? (
              <p className="text-xs text-muted-foreground">
                Your AI sets the easy/medium/hard balance from the material.
              </p>
            ) : (
              <>
                <DifficultyRow label="Easy" value={easy} onChange={setEasy} />
                <DifficultyRow label="Medium" value={medium} onChange={setMedium} />
                <DifficultyRow label="Hard" value={hard} onChange={setHard} />
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label>Math & science</Label>
            <label className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 p-3 text-sm">
              <input
                type="checkbox"
                checked={isSTEM}
                onChange={(event) => setIsSTEM(event.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              <span>
                This is a math or science subject
                <span className="block text-xs text-muted-foreground">
                  Your AI will use clean math notation, and typed answers get a symbol keypad.
                </span>
              </span>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 p-3 text-sm">
              <input
                type="checkbox"
                checked={needsEquations}
                onChange={(event) => setNeedsEquations(event.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              <span>
                Needs equations (LaTeX)
                <span className="block text-xs text-muted-foreground">
                  Equations like $x^2+1$ get typeset properly across lessons, checks and exams.
                </span>
              </span>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 p-3 text-sm">
              <input
                type="checkbox"
                checked={needsGraphs}
                onChange={(event) => setNeedsGraphs(event.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              <span>
                Will mention graphs & diagrams
                <span className="block text-xs text-muted-foreground">
                  Your AI describes graphs in words so they stay readable without images.
                </span>
              </span>
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 p-3 text-sm">
            <input
              type="checkbox"
              checked={includeAssessments}
              onChange={(event) => setIncludeAssessments(event.target.checked)}
              className="size-4 accent-[var(--primary)]"
            />
            <span>
              Include module quizzes and a final exam
              <span className="block text-xs text-muted-foreground">
                Adds quiz and exam questions, so they're included in the course your AI writes.
              </span>
            </span>
          </label>

          <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2/50 px-4 py-3">
            <div>
              <p className="text-sm font-medium">
                {sizeAuto
                  ? "Course size: your AI decides"
                  : `${totalQuestions} checkpoint questions`}
              </p>
              <p className="text-xs text-muted-foreground">
                {sizeAuto
                  ? "Units, lessons, and checkpoints scale to scope and selected detail"
                  : `${modules} units × ${lessons} lessons × ${questions} questions`}
              </p>
            </div>
            <Badge variant="outline">
              {smartMode.config.lengthPreset.charAt(0).toUpperCase() +
                smartMode.config.lengthPreset.slice(1)}
            </Badge>
          </div>

          {!sizeAuto && totalQuestions > 240 && (
            <p className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs leading-5 text-warning">
              This is a large generation. Use a model with a big output limit, or generate the
              blueprint first and expand lessons one at a time.
            </p>
          )}
        </section>

        <section className="panel flex min-h-[520px] flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">Your course instructions</h2>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={copyPrompt}
              disabled={smartMode.isLoading || needsFileProcessing}
            >
              {copied ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 text-xs leading-6 text-muted-foreground sm:p-5">
            {prompt}
          </pre>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-4 text-xs text-muted-foreground">
            <span>Paste it into ChatGPT, Claude, Gemini or the AI you already use.</span>
            <button
              type="button"
              onClick={() => openImportPanel({ kind: "course" })}
              className="inline-flex items-center gap-1 font-medium text-primary"
            >
              Bring the course in <ArrowRight className="size-3.5" />
            </button>
          </div>
        </section>
      </div>
    </AppPage>
  );
}

function Counter({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </Button>
        <Input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) =>
            onChange(Math.max(min, Math.min(max, Number(event.target.value) || min)))
          }
          className="text-center"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          +
        </Button>
      </div>
    </div>
  );
}

function DifficultyRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
      <Slider
        value={[value]}
        onValueChange={(next) => onChange(next[0] ?? 0)}
        min={0}
        max={100}
        step={5}
        className="flex-1"
      />
      <span className="w-9 text-right text-xs font-semibold">{value}%</span>
    </div>
  );
}

export type { Difficulty };
