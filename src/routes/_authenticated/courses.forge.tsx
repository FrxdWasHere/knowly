import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { questionTypes } from "@/lib/schema";
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
          "Turn a topic, syllabus or reference notes into a strict AI prompt for a complete course: modules, lessons, checkpoints, quizzes and a final exam.",
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
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [material, setMaterial] = useState("");
  const [level, setLevel] = useState(state.settings.gradeLevel);
  const [modules, setModules] = useState(4);
  const [lessons, setLessons] = useState(3);
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

  const prompt = useMemo(
    () =>
      buildCoursePrompt({
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
        audience: state.settings.gradeLevel,
        purpose: state.settings.studyReason,
        extra,
        tone,
        sizeAuto,
        typesAuto,
        distributionAuto: distAuto,
        includeAssessments,
        isSTEM,
        needsEquations,
        needsGraphs,
      }),
    [
      topic,
      material,
      title,
      subject,
      level,
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
        description="Describe a topic or paste your notes. Copy the instructions into the AI you use; nothing is uploaded."
        action={
          <>
            <Button asChild variant="outline">
              <Link to="/courses/import">
                <FileJson className="size-4" /> Bring the course in
              </Link>
            </Button>
            <Button variant="outline" onClick={createEmpty}>
              <BookPlus className="size-4" /> Blank course
            </Button>
            <Button onClick={copyPrompt}>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="course-title">Course title</Label>
              <Input
                id="course-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Organic Chemistry Foundations"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-subject">Subject</Label>
              <Input
                id="course-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="e.g. Chemistry"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-topic">Topic or goal</Label>
            <Textarea
              id="course-topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="What should the course teach? e.g. first-year organic chemistry, reaction mechanisms and stereochemistry"
              className="min-h-24"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-material">Reference material</Label>
            <Textarea
              id="course-material"
              value={material}
              onChange={(event) => setMaterial(event.target.value)}
              placeholder="Paste a syllabus, lecture notes, textbook excerpt or source list. Leave empty to generate from the topic."
              className="min-h-40"
            />
            <p className="text-xs text-muted-foreground">
              The reference is treated as source of truth. Keep it focused — long excerpts work
              better when split by module.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="course-level">Learner level</Label>
              <Input
                id="course-level"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                placeholder="Grade 11, undergraduate…"
              />
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
                Your AI sizes the course to the material — as many modules, lessons and checkpoints
                as it warrants.
              </p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-3">
                <Counter label="Modules" value={modules} onChange={setModules} min={1} max={12} />
                <Counter
                  label="Lessons / module"
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
                      : "border-border bg-surface2 text-muted-foreground hover:text-foreground",
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
            <label className="flex items-center gap-3 rounded-xl border border-border bg-surface2/60 p-3 text-sm">
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
            <label className="flex items-center gap-3 rounded-xl border border-border bg-surface2/60 p-3 text-sm">
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
            <label className="flex items-center gap-3 rounded-xl border border-border bg-surface2/60 p-3 text-sm">
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

          <label className="flex items-center gap-3 rounded-xl border border-border bg-surface2/60 p-3 text-sm">
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

          <div className="flex items-center justify-between rounded-xl border border-border bg-surface2/50 px-4 py-3">
            <div>
              <p className="text-sm font-medium">
                {sizeAuto
                  ? "Course size: your AI decides"
                  : `${totalQuestions} checkpoint questions`}
              </p>
              <p className="text-xs text-muted-foreground">
                {sizeAuto
                  ? "No fixed module, lesson or question counts"
                  : `${modules} modules × ${lessons} lessons × ${questions} questions`}
              </p>
            </div>
            <Badge variant="outline">
              {sizeAuto
                ? "Length varies"
                : `~${Math.max(1, Math.round(totalQuestions * 0.35))}k words`}
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
            <Button size="sm" variant="outline" onClick={copyPrompt}>
              {copied ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 text-xs leading-6 text-muted-foreground sm:p-5">
            {prompt}
          </pre>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-4 text-xs text-muted-foreground">
            <span>Paste it into ChatGPT, Claude, Gemini or the AI you already use.</span>
            <Link
              to="/courses/import"
              className="inline-flex items-center gap-1 font-medium text-primary"
            >
              Bring the course in <ArrowRight className="size-3.5" />
            </Link>
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
