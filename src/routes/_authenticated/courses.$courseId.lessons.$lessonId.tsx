import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Lightbulb,
  NotebookPen,
  Pencil,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  InteractiveQuestion,
  isInteractiveComplete,
} from "@/components/questions/interactive-question";
import { checkAnswer, TYPE_LABELS } from "@/lib/answers";
import { findLesson, allLessons, lessonProgress } from "@/lib/courses";
import { createId } from "@/lib/id";
import { emptyPage, NOTE_COLORS } from "@/lib/notes/types";
import { listNotebooks, putNotebook, putPage } from "@/lib/notes/db";
import { useKnowly } from "@/store/knowly";
import { MathKeypad, MathText } from "@/components/math/math-text";
import type { CourseBlock, Question } from "@/lib/types";
import type { NotebookMeta } from "@/lib/notes/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/courses/$courseId/lessons/$lessonId")({
  head: () => ({ meta: [{ title: "Course Lesson — Read, Check & Take Notes | Knowly" }] }),
  component: CourseLessonPage,
});

function CourseLessonPage() {
  const { courseId, lessonId } = Route.useParams();
  const { state, markCourseLesson, updateCourseProgress, recordCourseQuestion, recordSession } =
    useKnowly();
  const navigate = useNavigate();
  const course = state.courses.find((item) => item.id === courseId);
  const found = course ? findLesson(course, lessonId) : null;
  const progress = course ? state.courseProgress[course.id] : undefined;
  const lessonState = found ? lessonProgress(progress, found.lesson.id) : undefined;
  const [notes, setNotes] = useState(lessonState?.notes ?? "");
  const [notebook, setNotebook] = useState<NotebookMeta | null>(null);
  const [creatingNotebook, setCreatingNotebook] = useState(false);

  useEffect(() => {
    setNotes(lessonState?.notes ?? "");
  }, [lessonId, lessonState?.notes]);

  useEffect(() => {
    if (!found || !course) return;
    if (lessonProgress(progress, found.lesson.id).status === "not-started") {
      markCourseLesson(course.id, found.lesson.id, "in-progress");
    }
    // Only open a lesson once per lesson id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, lessonId]);

  useEffect(() => {
    let cancelled = false;
    void listNotebooks().then((items) => {
      if (!cancelled) {
        setNotebook(items.find((item) => item.linkedLessonId === lessonId) ?? null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  const flatLessons = useMemo(() => (course ? allLessons(course) : []), [course]);
  const currentIndex = flatLessons.findIndex((entry) => entry.lesson.id === lessonId);
  const previous = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const next = currentIndex >= 0 ? flatLessons[currentIndex + 1] : null;
  const completedLessons = flatLessons.filter(
    (entry) => lessonProgress(progress, entry.lesson.id).status === "completed",
  ).length;
  const coursePercent = flatLessons.length
    ? Math.round((completedLessons / flatLessons.length) * 100)
    : 0;

  if (!course || !found || !lessonState) {
    return (
      <AppPage>
        <div className="panel mx-auto max-w-lg p-8 text-center">
          <BookOpenCheck className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-4 font-display text-xl font-semibold">Lesson not found</h1>
          <Button asChild className="mt-5">
            <Link to="/courses">Back to courses</Link>
          </Button>
        </div>
      </AppPage>
    );
  }

  const { module, lesson } = found;
  const complete = lessonState.status === "completed";
  const checkpointQuestions = lesson.questions;

  const saveNotes = (value: string) => {
    setNotes(value);
    updateCourseProgress(course.id, (current) => ({
      ...current,
      lessons: {
        ...current.lessons,
        [lesson.id]: {
          ...(current.lessons[lesson.id] ?? { status: "in-progress", srs: {}, bookmarks: [] }),
          notes: value,
          openedAt: current.lessons[lesson.id]?.openedAt ?? Date.now(),
        },
      },
    }));
  };

  const finishLesson = () => {
    markCourseLesson(course.id, lesson.id, "completed");
    if (state.settings.xpEnabled) {
      recordSession({
        mode: "study",
        deckIds: [],
        deckTitles: [`${course.title} · ${lesson.title}`],
        answered: 0,
        correct: 0,
        skipped: 0,
        durationMs: 0,
        xpEarned: 20,
        bestCombo: 0,
        masteredIds: {},
        conceptStats: {},
      });
    }
    toast.success("Lesson complete", { description: lesson.title });
    if (next) {
      navigate({
        to: "/courses/$courseId/lessons/$lessonId",
        params: { courseId: course.id, lessonId: next.lesson.id },
      });
    } else {
      navigate({ to: "/courses/$courseId", params: { courseId: course.id } });
    }
  };

  const createNotebook = async () => {
    setCreatingNotebook(true);
    try {
      const now = Date.now();
      const notebookId = createId();
      const page = emptyPage(notebookId, "cornell", 794, 1123);
      const meta: NotebookMeta = {
        id: notebookId,
        title: lesson.title,
        subject: course.subject,
        color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
        emoji: course.emoji || "📝",
        tags: [...course.tags, "course"],
        favorite: false,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
        pageIds: [page.id],
        bookmarkedPageIds: [],
        defaultTemplate: "cornell",
        width: 794,
        height: 1123,
        linkedCourseId: course.id,
        linkedLessonId: lesson.id,
      };
      await putNotebook(meta);
      await putPage(page);
      setNotebook(meta);
      navigate({ to: "/notes/$notebookId", params: { notebookId } });
    } catch {
      toast.error("Couldn't create the notebook");
    } finally {
      setCreatingNotebook(false);
    }
  };

  return (
    <AppPage>
      <div className="mx-auto w-full max-w-[1400px]">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 basis-72">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Link
                to="/courses/$courseId"
                params={{ courseId: course.id }}
                className="transition-colors hover:text-foreground"
              >
                {course.title}
              </Link>
              <ChevronRight className="size-3.5 shrink-0" />
              <span className="truncate">{module.title}</span>
            </div>
            <div className="mt-3 flex items-start gap-3">
              <span
                className="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl ring-1 ring-border"
                style={{ background: `${course.color}1d` }}
              >
                {course.emoji || "📘"}
              </span>
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">
                  {lesson.title}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    Lesson {currentIndex + 1} of {flatLessons.length}
                  </Badge>
                  {lesson.estimatedMinutes ? (
                    <Badge variant="outline">
                      <Clock3 className="mr-1 size-3" /> {lesson.estimatedMinutes} min
                    </Badge>
                  ) : null}
                  {complete && <Badge className="bg-success/15 text-success">Completed</Badge>}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/courses/$courseId/edit" params={{ courseId: course.id }}>
                <Pencil className="size-3.5" /> Edit
              </Link>
            </Button>
            {notebook ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/notes/$notebookId" params={{ notebookId: notebook.id }}>
                  <NotebookPen className="size-3.5" /> Notebook
                </Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={createNotebook}
                disabled={creatingNotebook}
              >
                <NotebookPen className="size-3.5" />
                {creatingNotebook ? "Creating…" : "New notebook"}
              </Button>
            )}
            <Button onClick={finishLesson} size="sm">
              <CheckCircle2 className="size-3.5" />
              {complete ? "Complete again" : "Mark complete"}
            </Button>
          </div>
        </header>

        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Course progress
          </span>
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface2">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${coursePercent}%`,
                background: course.color,
              }}
            />
          </div>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
            {completedLessons}/{flatLessons.length} lessons
          </span>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <article className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-gradient-to-br from-surface to-card px-5 py-5 sm:px-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Module {course.modules.indexOf(module) + 1}</Badge>
                {lesson.objectives.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {lesson.objectives.length} learning objectives
                  </span>
                )}
              </div>
              {lesson.summary ? (
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                  {lesson.summary}
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Read the lesson, check your understanding, then mark it complete.
                </p>
              )}
            </div>

            <div className="p-5 sm:p-8">
              {lesson.blocks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                  <Sparkles className="mx-auto size-7 text-primary" />
                  <h2 className="mt-3 font-display text-lg font-semibold">
                    This lesson is a shell
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    Add content in the editor, or generate a lesson pack with Course Forge and
                    import it.
                  </p>
                  <Button asChild variant="outline" className="mt-4">
                    <Link to="/courses/$courseId/edit" params={{ courseId: course.id }}>
                      Open editor
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  {lesson.blocks.map((block) => (
                    <LessonBlock key={block.id} block={block} />
                  ))}
                </div>
              )}

              {checkpointQuestions.length > 0 && (
                <section className="mt-10 border-t border-border pt-8">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
                      <ClipboardCheck className="size-4" />
                    </span>
                    <div>
                      <h2 className="font-display text-xl font-semibold">
                        Check your understanding
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Answer each checkpoint to feed your course review schedule.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {checkpointQuestions.map((question) => (
                      <Checkpoint
                        key={question.id}
                        question={question}
                        mathMode={Boolean(course.isSTEM || course.needsEquations)}
                        onAnswered={(correct, grade) =>
                          recordCourseQuestion(course.id, lesson.id, question.id, correct, grade)
                        }
                      />
                    ))}
                  </div>
                </section>
              )}

              <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                {previous ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      to="/courses/$courseId/lessons/$lessonId"
                      params={{ courseId: course.id, lessonId: previous.lesson.id }}
                    >
                      <ArrowLeft className="size-4" />
                      <span className="max-w-[16rem] truncate">{previous.lesson.title}</span>
                    </Link>
                  </Button>
                ) : (
                  <span className="hidden sm:block" />
                )}
                <Button onClick={finishLesson} size="sm">
                  {next ? "Complete & next" : "Complete lesson"}
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </article>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            {lesson.objectives.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" />
                  <h2 className="font-display text-base font-semibold">In this lesson</h2>
                </div>
                <ul className="mt-3 space-y-2.5 text-sm leading-6 text-muted-foreground">
                  {lesson.objectives.map((objective) => (
                    <li key={objective} className="flex gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                      {objective}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <NotebookPen className="size-4 text-primary" />
                <h2 className="font-display text-base font-semibold">Lesson notebook</h2>
              </div>
              {notebook ? (
                <>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {notebook.title} · {notebook.pageIds.length} pages
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                    <Link to="/notes/$notebookId" params={{ notebookId: notebook.id }}>
                      Open notebook <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Create a linked notebook for handwriting, PDFs and study pages.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={createNotebook}
                    disabled={creatingNotebook}
                  >
                    <NotebookPen className="size-3.5" />
                    {creatingNotebook ? "Creating…" : "Create notebook"}
                  </Button>
                </>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="font-display text-base font-semibold">Quick notes</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Saved with this lesson. Use the notebook for handwriting and pages.
              </p>
              <Textarea
                value={notes}
                onChange={(event) => saveNotes(event.target.value)}
                placeholder="Write a summary, questions to ask, or what to review…"
                className="mt-3 min-h-48 bg-surface/40"
              />
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="font-display text-base font-semibold">Lesson progress</h2>
              <div className="mt-3 space-y-2.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize",
                      complete && "border-success/30 bg-success/10 text-success",
                    )}
                  >
                    {lessonState.status.replace("-", " ")}
                  </Badge>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Checkpoints</span>
                  <span className="font-medium">{lesson.questions.length}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Module</span>
                  <span className="max-w-[11rem] truncate text-right font-medium">
                    {module.title}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppPage>
  );
}

function LessonBlock({ block }: { block: CourseBlock }) {
  if (block.type === "divider") return <hr className="border-border" />;
  if (block.type === "image") {
    return (
      <figure>
        {block.url && (
          <img
            src={block.url}
            alt={block.alt ?? ""}
            className="mx-auto max-h-[520px] rounded-xl border border-border object-contain"
          />
        )}
        {block.caption && (
          <figcaption className="mt-2 text-center text-xs text-muted-foreground">
            {block.caption}
          </figcaption>
        )}
      </figure>
    );
  }
  if (block.type === "callout" || block.type === "example") {
    const Icon = block.type === "example" ? Lightbulb : Sparkles;
    return (
      <div
        className={cn(
          "rounded-2xl border p-4 sm:p-5",
          block.type === "example"
            ? "border-success/25 bg-success/8"
            : block.tone === "warning"
              ? "border-warning/30 bg-warning/10"
              : block.tone === "definition"
                ? "border-primary/25 bg-primary/8"
                : "border-border bg-surface2/60",
        )}
      >
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-primary" />
          {block.title || (block.type === "example" ? "Example" : "Note")}
        </div>
        <Markdown markdown={block.markdown ?? ""} />
      </div>
    );
  }
  if (block.type === "checkpoint") return null;
  return <Markdown markdown={block.markdown ?? ""} />;
}

function Markdown({ markdown }: { markdown: string }) {
  return (
    <div className="text-sm leading-7 text-foreground/90 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-surface2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:font-display [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_pre]:my-3 [&_pre]:overflow-auto [&_pre]:rounded-xl [&_pre]:bg-surface2 [&_pre]:p-4 [&_pre]:text-xs [&_strong]:font-semibold [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:bg-surface2 [&_th]:p-2 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

function Checkpoint({
  question,
  mathMode = false,
  onAnswered,
}: {
  question: Question;
  mathMode?: boolean;
  onAnswered: (correct: boolean, grade: "again" | "hard" | "good" | "easy") => void;
}) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [revealed, setRevealed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const interactive = ["ordering", "matching", "word-bank"].includes(question.type);

  const submit = (given: string, forced?: boolean) => {
    const correct = forced ?? checkAnswer(question, given);
    setResult(correct);
    onAnswered(correct, correct ? "good" : "again");
  };

  return (
    <div className="rounded-2xl border border-border bg-surface2/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{TYPE_LABELS[question.type]}</Badge>
        {question.concept && (
          <Badge variant="outline">
            <MathText text={question.concept} />
          </Badge>
        )}
        {question.difficulty && <Badge variant="outline">{question.difficulty}</Badge>}
      </div>
      <p className="mt-3 font-medium leading-6">
        <MathText text={question.question} />
      </p>

      {question.type === "multiple-choice" && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {question.options?.map((option) => (
            <button
              key={option}
              type="button"
              disabled={result !== null}
              onClick={() => {
                setValue(option);
                submit(option);
              }}
              className={cn(
                "min-h-11 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                result !== null && option === question.answer
                  ? "border-success/50 bg-success/15 text-success"
                  : result !== null
                    ? "border-border opacity-60"
                    : "border-border bg-background hover:border-primary/40",
              )}
            >
              <MathText text={option} />
            </button>
          ))}
        </div>
      )}

      {question.type === "true-false" && (
        <div className="mt-3 flex gap-2">
          {["true", "false"].map((option) => (
            <Button
              key={option}
              variant="outline"
              disabled={result !== null}
              onClick={() => {
                setValue(option);
                submit(option);
              }}
              className={cn(
                result !== null && option === question.answer.toLowerCase()
                  ? "border-success/50 bg-success/15 text-success"
                  : "",
              )}
            >
              {option === "true" ? "True" : "False"}
            </Button>
          ))}
        </div>
      )}

      {question.type === "flashcard" && (
        <div className="mt-3">
          {!revealed ? (
            <Button variant="outline" onClick={() => setRevealed(true)}>
              Reveal answer
            </Button>
          ) : (
            <div className="rounded-xl border border-primary/25 bg-primary/8 p-3 text-sm leading-6">
              <p>
                <MathText text={question.answer} />
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => submit("", false)}>
                  <X className="size-4" /> Missed it
                </Button>
                <Button size="sm" onClick={() => submit("", true)}>
                  <Check className="size-4" /> Got it
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {!interactive && !["multiple-choice", "true-false", "flashcard"].includes(question.type) && (
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={value}
            ref={inputRef}
            onChange={(event) => setValue(event.target.value)}
            disabled={result !== null}
            placeholder="Your answer…"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            onKeyDown={(event) => {
              if (event.key === "Enter" && value.trim()) submit(value);
            }}
          />
          <Button onClick={() => submit(value)} disabled={!value.trim() || result !== null}>
            Check
          </Button>
        </div>
      )}

      {mathMode && !interactive && result === null && (
        <MathKeypad className="mt-2" target={inputRef} onValue={setValue} />
      )}

      {interactive && (
        <div className="mt-3">
          <InteractiveQuestion
            question={question}
            value={value}
            onChange={setValue}
            disabled={result !== null}
            revealed={result === true}
          />
          <Button
            className="mt-3"
            onClick={() => submit(value)}
            disabled={!isInteractiveComplete(question, value) || result !== null}
          >
            Check
          </Button>
        </div>
      )}

      {result !== null && (
        <div
          className={cn(
            "mt-3 rounded-xl border p-3 text-sm leading-6",
            result ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10",
          )}
        >
          <p className="font-medium">{result ? "Correct" : "Not quite"}</p>
          <p className="mt-1 text-muted-foreground">
            Answer:{" "}
            <span className="font-medium text-foreground">
              <MathText text={question.answer} />
            </span>
          </p>
          {question.explanation && (
            <p className="mt-1 text-muted-foreground">
              <MathText text={question.explanation} />
            </p>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="mt-2"
            onClick={() => {
              setResult(null);
              setValue("");
              setRevealed(false);
            }}
          >
            <RotateCcw className="size-3.5" /> Try again
          </Button>
        </div>
      )}
    </div>
  );
}
