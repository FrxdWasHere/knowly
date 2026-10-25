import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  BookOpenCheck,
  Check,
  ChevronDown,
  FileJson,
  GripVertical,
  Plus,
  Save,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createId } from "@/lib/id";
import { DECK_COLORS } from "@/lib/defaults";
import { validateQuestionsJson, questionTypes } from "@/lib/schema";
import { useKnowly } from "@/store/knowly";
import { LabelChips, LabelPickerDialog } from "@/components/binder/label-picker";
import { MathText } from "@/components/math/math-text";
import type { Course, CourseBlock, CourseLesson, CourseModule, Question } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/courses/$courseId/edit")({
  head: () => ({ meta: [{ title: "Edit Course — Modules, Lessons & Questions | Knowly" }] }),
  component: CourseEditorPage,
});

function newLesson(number: number): CourseLesson {
  return {
    id: createId(),
    title: `Lesson ${number}`,
    objectives: [],
    blocks: [
      {
        id: createId(),
        type: "markdown",
        markdown: "## Overview\n\nWrite the lesson here. Markdown is supported.",
      },
    ],
    questions: [],
    linkedDeckIds: [],
  };
}

function newModule(number: number): CourseModule {
  return {
    id: createId(),
    title: `Module ${number}`,
    objectives: [],
    lessons: [newLesson(1)],
    linkedDeckIds: [],
  };
}

function CourseEditorPage() {
  const { courseId } = Route.useParams();
  const { state, updateCourse } = useKnowly();
  const navigate = useNavigate();
  const course = state.courses.find((item) => item.id === courseId);
  const [draft, setDraft] = useState<Course | null>(course ?? null);
  const [dirty, setDirty] = useState(false);
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);

  useEffect(() => {
    setDraft(course ?? null);
    setDirty(false);
  }, [courseId, course]);

  if (!course || !draft) {
    return (
      <AppPage>
        <div className="panel mx-auto max-w-lg p-8 text-center">
          <BookOpenCheck className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-4 font-display text-xl font-semibold">Course not found</h1>
          <Button asChild className="mt-5">
            <Link to="/courses">Back to courses</Link>
          </Button>
        </div>
      </AppPage>
    );
  }

  const patch = (updates: Partial<Course>) => {
    setDraft((current) => (current ? { ...current, ...updates } : current));
    setDirty(true);
  };

  const setModule = (moduleId: string, updates: Partial<CourseModule>) => {
    patch({
      modules: draft.modules.map((module) =>
        module.id === moduleId ? { ...module, ...updates } : module,
      ),
    });
  };

  const setLesson = (moduleId: string, lessonId: string, updates: Partial<CourseLesson>) => {
    setModule(moduleId, {
      lessons: draft.modules
        .find((module) => module.id === moduleId)!
        .lessons.map((lesson) => (lesson.id === lessonId ? { ...lesson, ...updates } : lesson)),
    });
  };

  const save = () => {
    updateCourse(course.id, draft);
    setDirty(false);
    toast.success("Course saved");
  };

  const addModule = () => {
    patch({ modules: [...draft.modules, newModule(draft.modules.length + 1)] });
  };

  const removeModule = (moduleId: string) => {
    patch({ modules: draft.modules.filter((module) => module.id !== moduleId) });
  };

  const addLesson = (moduleId: string) => {
    const module = draft.modules.find((item) => item.id === moduleId);
    if (!module) return;
    setModule(moduleId, { lessons: [...module.lessons, newLesson(module.lessons.length + 1)] });
  };

  const removeLesson = (moduleId: string, lessonId: string) => {
    const module = draft.modules.find((item) => item.id === moduleId);
    if (!module) return;
    setModule(moduleId, { lessons: module.lessons.filter((lesson) => lesson.id !== lessonId) });
  };

  const moveModule = (index: number, direction: -1 | 1) => {
    const next = [...draft.modules];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    patch({ modules: next });
  };

  return (
    <AppPage>
      <PageHeader
        title={`Edit: ${draft.title}`}
        description="Everything is editable. Markdown supports headings, lists, tables, links and code blocks."
        action={
          <>
            <Button asChild variant="ghost">
              <Link to="/courses/$courseId" params={{ courseId: course.id }}>
                <ArrowLeft className="size-4" /> Course
              </Link>
            </Button>
            <Button onClick={save} disabled={!dirty}>
              <Save className="size-4" /> {dirty ? "Save changes" : "Saved"}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.45fr)]">
        <div className="space-y-5">
          <section className="panel space-y-4 p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold">Course details</h2>
            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={draft.title}
                  onChange={(event) => patch({ title: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Emoji</Label>
                <Input
                  value={draft.emoji ?? ""}
                  onChange={(event) => patch({ emoji: event.target.value })}
                  maxLength={4}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={draft.subject}
                  onChange={(event) => patch({ subject: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Level</Label>
                <Input
                  value={draft.level ?? ""}
                  onChange={(event) => patch({ level: event.target.value })}
                  placeholder="Grade 11, undergraduate…"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={draft.description ?? ""}
                onChange={(event) => patch({ description: event.target.value })}
                className="min-h-20"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input
                  value={draft.tags.join(", ")}
                  onChange={(event) =>
                    patch({
                      tags: event.target.value
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Estimated minutes</Label>
                <Input
                  type="number"
                  value={draft.estimatedMinutes ?? ""}
                  onChange={(event) =>
                    patch({
                      estimatedMinutes: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Math &amp; science</Label>
              <div className="grid gap-2">
                <label className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.isSTEM ?? false}
                    onChange={(event) => patch({ isSTEM: event.target.checked })}
                    className="size-4 accent-[var(--primary)]"
                  />
                  <span>
                    Math or science subject
                    <span className="block text-xs text-muted-foreground">
                      Adds a symbol keypad to checkpoints and typed answers.
                    </span>
                  </span>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.needsEquations ?? false}
                    onChange={(event) => patch({ needsEquations: event.target.checked })}
                    className="size-4 accent-[var(--primary)]"
                  />
                  <span>
                    Uses equations (LaTeX)
                    <span className="block text-xs text-muted-foreground">
                      Equations like $x^2+1$ show properly typeset in lessons and checks.
                    </span>
                  </span>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.needsGraphs ?? false}
                    onChange={(event) => patch({ needsGraphs: event.target.checked })}
                    className="size-4 accent-[var(--primary)]"
                  />
                  <span>
                    References graphs &amp; diagrams
                    <span className="block text-xs text-muted-foreground">
                      Guides your AI to describe graphs in words.
                    </span>
                  </span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Binder labels</Label>
              <div className="flex flex-wrap items-center gap-2">
                <LabelChips labels={state.labels} labelIds={draft.labelIds} />
                {state.labels.length > 0 ? (
                  <Button variant="outline" size="sm" onClick={() => setLabelPickerOpen(true)}>
                    <Tag className="size-3.5" />
                    {draft.labelIds?.length ? "Change labels" : "Stick a label"}
                  </Button>
                ) : (
                  <Button asChild variant="outline" size="sm">
                    <Link to="/labels">
                      <Tag className="size-3.5" /> Make a label
                    </Link>
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Objectives (one per line)</Label>{" "}
              <Textarea
                value={draft.objectives.join("\n")}
                onChange={(event) =>
                  patch({
                    objectives: event.target.value
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean),
                  })
                }
                className="min-h-24"
              />
            </div>
            <div className="space-y-2">
              <Label>Accent colour</Label>
              <div className="flex flex-wrap gap-2">
                {DECK_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Use ${color}`}
                    onClick={() => patch({ color })}
                    className={cn(
                      "size-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition-transform hover:scale-110",
                      draft.color === color ? "ring-primary" : "ring-transparent",
                    )}
                    style={{ background: color }}
                  />
                ))}
              </div>
            </div>
          </section>

          {draft.modules.map((module, moduleIndex) => (
            <section key={module.id} className="panel overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Module {moduleIndex + 1}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {module.lessons.length} lessons
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Move module up"
                    onClick={() => moveModule(moduleIndex, -1)}
                    disabled={moduleIndex === 0}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Move module down"
                    onClick={() => moveModule(moduleIndex, 1)}
                    disabled={moduleIndex === draft.modules.length - 1}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete module"
                    onClick={() => removeModule(module.id)}
                    disabled={draft.modules.length === 1}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4 p-4 sm:p-5">
                <div className="space-y-2">
                  <Label>Module title</Label>
                  <Input
                    value={module.title}
                    onChange={(event) => setModule(module.id, { title: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Summary</Label>
                  <Textarea
                    value={module.summary ?? ""}
                    onChange={(event) => setModule(module.id, { summary: event.target.value })}
                    className="min-h-16"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Objectives (one per line)</Label>
                  <Textarea
                    value={module.objectives.join("\n")}
                    onChange={(event) =>
                      setModule(module.id, {
                        objectives: event.target.value
                          .split("\n")
                          .map((line) => line.trim())
                          .filter(Boolean),
                      })
                    }
                    className="min-h-16"
                  />
                </div>

                <div className="space-y-4">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <LessonEditor
                      key={lesson.id}
                      lesson={lesson}
                      index={lessonIndex}
                      onChange={(updates) => setLesson(module.id, lesson.id, updates)}
                      onRemove={() => removeLesson(module.id, lesson.id)}
                      canRemove={module.lessons.length > 1}
                    />
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={() => addLesson(module.id)}>
                  <Plus className="size-4" /> Add lesson
                </Button>
              </div>
            </section>
          ))}

          <Button variant="outline" className="w-full" onClick={addModule}>
            <Plus className="size-4" /> Add module
          </Button>
        </div>

        <aside className="space-y-4">
          <div className="panel p-5">
            <h2 className="font-display text-lg font-semibold">Editor tips</h2>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
              <li>
                • Write lesson pages with simple formatting: headings, lists, tables, code and
                links.
              </li>
              <li>• Keep each lesson to one coherent idea.</li>
              <li>
                • Add checkpoint questions by pasting what your AI wrote — each one is checked
                before it's added.
              </li>
              <li>• Questions you add show up in this lesson's quizzes automatically.</li>
            </ul>
          </div>
          <div className="panel p-5">
            <h2 className="font-display text-lg font-semibold">At a glance</h2>
            <div className="mt-3 space-y-2 text-sm">
              <Row label="Modules" value={draft.modules.length} />
              <Row
                label="Lessons"
                value={draft.modules.reduce((sum, module) => sum + module.lessons.length, 0)}
              />
              <Row
                label="Questions"
                value={draft.modules.reduce(
                  (sum, module) =>
                    sum +
                    module.lessons.reduce(
                      (lessonSum, lesson) => lessonSum + lesson.questions.length,
                      0,
                    ),
                  0,
                )}
              />
              <Row label="Final exam" value={draft.finalExam ? "Yes" : "No"} />
            </div>
            <Button className="mt-4 w-full" onClick={save} disabled={!dirty}>
              <Save className="size-4" /> Save course
            </Button>
          </div>
        </aside>
      </div>

      <LabelPickerDialog
        open={labelPickerOpen}
        onOpenChange={setLabelPickerOpen}
        labels={state.labels}
        labelIds={draft.labelIds ?? []}
        onChange={(labelIds) => patch({ labelIds })}
      />
    </AppPage>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function LessonEditor({
  lesson,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  lesson: CourseLesson;
  index: number;
  onChange: (updates: Partial<CourseLesson>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [questionJson, setQuestionJson] = useState("");
  const [jsonError, setJsonError] = useState("");

  const addQuestions = () => {
    const result = validateQuestionsJson(questionJson, lesson.questions);
    if (!result.ok || !result.questions) {
      setJsonError(
        result.errors[0] ?? "We couldn't read those questions — check they're complete.",
      );
      return;
    }
    onChange({ questions: [...lesson.questions, ...result.questions] });
    setQuestionJson("");
    setJsonError("");
    toast.success(`${result.questions.length} questions added`);
  };

  const setBlocks = (blocks: CourseBlock[]) => onChange({ blocks });

  return (
    <div className="rounded-xl border border-border bg-surface2/40">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-background text-xs font-semibold">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {lesson.title || "Untitled lesson"}
          </span>
          <span className="block text-xs text-muted-foreground">
            {lesson.blocks.length} blocks · {lesson.questions.length} questions
          </span>
        </span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border p-3 sm:p-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <div className="space-y-2">
              <Label>Lesson title</Label>
              <Input
                value={lesson.title}
                onChange={(event) => onChange({ title: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Minutes</Label>
              <Input
                type="number"
                value={lesson.estimatedMinutes ?? ""}
                onChange={(event) =>
                  onChange({
                    estimatedMinutes: event.target.value ? Number(event.target.value) : undefined,
                  })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Summary</Label>
            <Textarea
              value={lesson.summary ?? ""}
              onChange={(event) => onChange({ summary: event.target.value })}
              className="min-h-16"
            />
          </div>
          <div className="space-y-2">
            <Label>Objectives (one per line)</Label>
            <Textarea
              value={lesson.objectives.join("\n")}
              onChange={(event) =>
                onChange({
                  objectives: event.target.value
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean),
                })
              }
              className="min-h-16"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Content blocks</Label>
              <span className="text-xs text-muted-foreground">{lesson.blocks.length} blocks</span>
            </div>
            <div className="space-y-3">
              {lesson.blocks.map((block, blockIndex) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  index={blockIndex}
                  onChange={(next) =>
                    setBlocks(lesson.blocks.map((item) => (item.id === block.id ? next : item)))
                  }
                  onMove={(direction) => {
                    const next = [...lesson.blocks];
                    const target = blockIndex + direction;
                    if (target < 0 || target >= next.length) return;
                    [next[blockIndex], next[target]] = [next[target], next[blockIndex]];
                    setBlocks(next);
                  }}
                  onRemove={() => setBlocks(lesson.blocks.filter((item) => item.id !== block.id))}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["markdown", "callout", "example", "image", "divider"] as const).map((type) => (
                <Button
                  key={type}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setBlocks([
                      ...lesson.blocks,
                      {
                        id: createId(),
                        type,
                        markdown: type === "divider" ? undefined : "",
                        title: type === "callout" || type === "example" ? "Title" : undefined,
                        tone: type === "callout" ? "info" : undefined,
                      },
                    ])
                  }
                >
                  <Plus className="size-3.5" /> {type}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Checkpoint questions</Label>
              <span className="text-xs text-muted-foreground">
                {lesson.questions.length} questions
              </span>
            </div>
            {lesson.questions.length > 0 && (
              <div className="space-y-1.5">
                {lesson.questions.map((question, questionIndex) => (
                  <div
                    key={question.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-background p-2 text-xs"
                  >
                    <Badge variant="outline">{question.type}</Badge>
                    <span className="min-w-0 flex-1 truncate">
                      <MathText text={question.question} />
                    </span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove question"
                      onClick={() =>
                        onChange({
                          questions: lesson.questions.filter((_, index) => index !== questionIndex),
                        })
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Textarea
              value={questionJson}
              onChange={(event) => setQuestionJson(event.target.value)}
              placeholder='Paste a question array or { "questions": [...] } here…'
              className="min-h-24 font-mono text-xs"
              spellCheck={false}
            />
            {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
            <Button
              size="sm"
              variant="outline"
              onClick={addQuestions}
              disabled={!questionJson.trim()}
            >
              <FileJson className="size-4" /> Add questions
            </Button>
          </div>

          <div className="flex justify-end border-t border-border pt-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={onRemove}
              disabled={!canRemove}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" /> Delete lesson
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function BlockEditor({
  block,
  onChange,
  onMove,
  onRemove,
}: {
  block: CourseBlock;
  index: number;
  onChange: (block: CourseBlock) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge variant="outline">{block.type}</Badge>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMove(-1)} aria-label="Move block up">
            <ArrowUp className="size-3.5" />
          </button>
          <button type="button" onClick={() => onMove(1)} aria-label="Move block down">
            <ArrowDown className="size-3.5" />
          </button>
          <button type="button" onClick={onRemove} aria-label="Delete block">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      {(block.type === "callout" || block.type === "example") && (
        <Input
          value={block.title ?? ""}
          onChange={(event) => onChange({ ...block, title: event.target.value })}
          placeholder="Block title"
          className="mb-2"
        />
      )}
      {block.type === "callout" && (
        <select
          value={block.tone ?? "info"}
          onChange={(event) =>
            onChange({ ...block, tone: event.target.value as CourseBlock["tone"] })
          }
          className="mb-2 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
        >
          <option value="info">Info</option>
          <option value="tip">Tip</option>
          <option value="warning">Warning</option>
          <option value="definition">Definition</option>
        </select>
      )}
      {block.type === "image" ? (
        <div className="space-y-2">
          <Input
            value={block.url ?? ""}
            onChange={(event) => onChange({ ...block, url: event.target.value })}
            placeholder="https://… image URL"
          />
          <Input
            value={block.alt ?? ""}
            onChange={(event) => onChange({ ...block, alt: event.target.value })}
            placeholder="Alt text"
          />
          <Input
            value={block.caption ?? ""}
            onChange={(event) => onChange({ ...block, caption: event.target.value })}
            placeholder="Caption"
          />
        </div>
      ) : block.type !== "divider" ? (
        <Textarea
          value={block.markdown ?? ""}
          onChange={(event) => onChange({ ...block, markdown: event.target.value })}
          className="min-h-24 font-mono text-xs"
          placeholder="Markdown content…"
        />
      ) : null}
    </div>
  );
}
