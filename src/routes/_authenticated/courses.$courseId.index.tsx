import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileQuestion,
  Library,
  NotebookPen,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  courseStats,
  decksForCourse,
  lessonProgress,
  lessonStats,
  nextLesson,
} from "@/lib/courses";
import { createId } from "@/lib/id";
import { useKnowly } from "@/store/knowly";
import type { CourseLesson, Deck } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/courses/$courseId/")({
  head: () => ({ meta: [{ title: "Course — Lessons, Progress & Assessments | Knowly" }] }),
  component: CourseOverviewPage,
});

function CourseOverviewPage() {
  const { courseId } = Route.useParams();
  const { state, deleteCourse, updateCourse, addDeck } = useKnowly();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deckToLink, setDeckToLink] = useState("");

  const course = state.courses.find((item) => item.id === courseId);
  const progress = course ? state.courseProgress[course.id] : undefined;
  const stats = useMemo(() => (course ? courseStats(course, progress) : null), [course, progress]);
  const next = useMemo(() => (course ? nextLesson(course, progress) : null), [course, progress]);
  const linkedDecks = useMemo(
    () => (course ? decksForCourse(course, state.decks) : []),
    [course, state.decks],
  );

  if (!course || !stats) {
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

  const createDeckFromLesson = (lesson: CourseLesson) => {
    const now = Date.now();
    const deck: Deck = {
      id: createId(),
      title: `${lesson.title} — Course Practice`,
      subject: course.subject,
      description: lesson.summary ?? `Practice deck copied from ${course.title}.`,
      color: course.color,
      tags: [...course.tags, "course-practice"],
      createdAt: now,
      favorite: false,
      questions: lesson.questions.map((question) => ({ ...question, id: createId() })),
      masteredIds: [],
      bookmarks: [],
      notes: {},
    };
    addDeck(deck);
    updateCourse(course.id, {
      linkedDeckIds: Array.from(new Set([...course.linkedDeckIds, deck.id])),
    });
    toast.success("Practice deck created", { description: lesson.title });
    navigate({ to: "/decks/$deckId", params: { deckId: deck.id } });
  };

  const linkDeck = () => {
    if (!deckToLink || course.linkedDeckIds.includes(deckToLink)) return;
    updateCourse(course.id, { linkedDeckIds: [...course.linkedDeckIds, deckToLink] });
    toast.success("Deck linked to course");
    setDeckToLink("");
  };

  return (
    <AppPage>
      <PageHeader
        title={course.title}
        description={`${course.subject}${course.level ? ` · ${course.level}` : ""}${
          course.description ? ` — ${course.description}` : ""
        }`}
        action={
          <>
            <Button asChild variant="ghost">
              <Link to="/courses">
                <ArrowLeft className="size-4" /> Courses
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/courses/$courseId/edit" params={{ courseId: course.id }}>
                <Pencil className="size-4" /> Edit
              </Link>
            </Button>
            <Button asChild>
              <Link to="/courses/$courseId/quiz" params={{ courseId: course.id }}>
                <FileQuestion className="size-4" /> Take a quiz
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete course"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        }
      />

      <section className="panel mb-6 overflow-hidden">
        <div className="h-2 w-full" style={{ background: course.color }} />
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-14 place-items-center rounded-2xl bg-surface2 text-3xl ring-1 ring-border">
                {course.emoji || "📘"}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  {stats.completedLessons} of {stats.lessons} lessons complete
                </p>
                <p className="font-display text-3xl font-semibold">{stats.percent}%</p>
              </div>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface2">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${stats.percent}%`, background: course.color }}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Lessons" value={stats.lessons} />
              <Stat label="Questions" value={stats.questions} />
              <Stat label="Due now" value={stats.due} />
              <Stat label="Assessments" value={`${stats.passedAssessments}/${stats.assessments}`} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface2/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {next ? "Continue learning" : "Course complete"}
            </p>
            {next ? (
              <>
                <p className="mt-2 font-display text-lg font-semibold">{next.lesson.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{next.module.title}</p>
                <Button asChild className="mt-4 w-full">
                  <Link
                    to="/courses/$courseId/lessons/$lessonId"
                    params={{ courseId: course.id, lessonId: next.lesson.id }}
                  >
                    <Play className="size-4" /> Open lesson
                  </Link>
                </Button>
              </>
            ) : (
              <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                Every lesson is marked complete. Take the final quiz to check retention.
              </div>
            )}
            {course.objectives.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground">Course objectives</p>
                <ul className="mt-2 space-y-1.5 text-xs leading-5 text-muted-foreground">
                  {course.objectives.slice(0, 4).map((objective) => (
                    <li key={objective} className="flex gap-2">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                      {objective}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <section className="space-y-4">
          {course.modules.map((module, moduleIndex) => (
            <div key={module.id} className="panel overflow-hidden">
              <div className="border-b border-border p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Module {moduleIndex + 1}
                    </p>
                    <h2 className="mt-1 font-display text-xl font-semibold">{module.title}</h2>
                    {module.summary && (
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {module.summary}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">{module.lessons.length} lessons</Badge>
                    {module.quiz && <Badge variant="outline">Quiz</Badge>}
                  </div>
                </div>
                {module.objectives.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {module.objectives.map((objective) => (
                      <span
                        key={objective}
                        className="rounded-full bg-surface2 px-2.5 py-1 text-xs text-muted-foreground"
                      >
                        {objective}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="divide-y divide-border">
                {module.lessons.map((lesson, lessonIndex) => {
                  const lessonState = lessonProgress(progress, lesson.id);
                  const lessonStat = lessonStats(progress, lesson);
                  const complete = lessonState.status === "completed";
                  return (
                    <div
                      key={lesson.id}
                      className="flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-surface2/50 sm:px-5"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface2 text-xs font-semibold text-muted-foreground">
                        {complete ? (
                          <CheckCircle2 className="size-4 text-success" />
                        ) : (
                          lessonIndex + 1
                        )}
                      </span>
                      <div className="min-w-0 flex-1 basis-52">
                        <Link
                          to="/courses/$courseId/lessons/$lessonId"
                          params={{ courseId: course.id, lessonId: lesson.id }}
                          className="font-medium hover:text-primary"
                        >
                          {lesson.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {lesson.questions.length} checkpoints
                          {lessonStat.due > 0 ? ` · ${lessonStat.due} due` : ""}
                          {lesson.estimatedMinutes ? ` · ${lesson.estimatedMinutes} min` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button asChild size="sm" variant="outline">
                          <Link
                            to="/courses/$courseId/lessons/$lessonId"
                            params={{ courseId: course.id, lessonId: lesson.id }}
                          >
                            {complete ? "Review" : "Study"}
                            <ChevronRight className="size-3.5" />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Create practice deck from lesson"
                          onClick={() => createDeckFromLesson(lesson)}
                          disabled={!lesson.questions.length}
                        >
                          <Library className="size-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {module.quiz && module.quiz.questions.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface2/40 p-4">
                  <div>
                    <p className="text-sm font-medium">{module.quiz.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {module.quiz.questions.length} questions · pass at {module.quiz.passingScore}%
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link
                      to="/courses/$courseId/quiz"
                      params={{ courseId: course.id }}
                      search={{ assessment: module.quiz.id }}
                    >
                      <FileQuestion className="size-4" /> Module quiz
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ))}

          {course.finalExam && course.finalExam.questions.length > 0 && (
            <div className="panel flex flex-wrap items-center justify-between gap-4 border-primary/30 bg-primary/5 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  Final assessment
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold">
                  {course.finalExam.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {course.finalExam.questions.length} questions · pass at{" "}
                  {course.finalExam.passingScore}%
                  {course.finalExam.timeLimitMinutes
                    ? ` · ${course.finalExam.timeLimitMinutes} min`
                    : ""}
                </p>
              </div>
              <Button asChild>
                <Link
                  to="/courses/$courseId/quiz"
                  params={{ courseId: course.id }}
                  search={{ assessment: course.finalExam.id }}
                >
                  <Play className="size-4" /> Start final
                </Link>
              </Button>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="panel p-5">
            <div className="flex items-center gap-2">
              <NotebookPen className="size-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">Linked decks</h2>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Decks are optional extra practice. Course progress stays independent.
            </p>
            <div className="mt-4 space-y-2">
              {linkedDecks.map((deck) => (
                <Link
                  key={deck.id}
                  to="/decks/$deckId"
                  params={{ deckId: deck.id }}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface2/60 p-3 text-sm transition-colors hover:border-primary/30"
                >
                  <span className="truncate">{deck.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {deck.questions.length} cards
                  </span>
                </Link>
              ))}
              {!linkedDecks.length && (
                <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                  No decks linked yet.
                </p>
              )}
            </div>
            {state.decks.length > 0 && (
              <div className="mt-4 flex gap-2">
                <Select value={deckToLink} onValueChange={setDeckToLink}>
                  <SelectTrigger className="min-w-0 flex-1">
                    <SelectValue placeholder="Choose a deck" />
                  </SelectTrigger>
                  <SelectContent>
                    {state.decks
                      .filter((deck) => !course.linkedDeckIds.includes(deck.id))
                      .map((deck) => (
                        <SelectItem key={deck.id} value={deck.id}>
                          {deck.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={linkDeck} disabled={!deckToLink}>
                  <Plus className="size-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="panel p-5">
            <div className="flex items-center gap-2">
              <Clock3 className="size-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">Course details</h2>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Modules" value={course.modules.length} />
              <Row label="Lessons" value={stats.lessons} />
              <Row label="Questions" value={stats.questions} />
              <Row
                label="Est. time"
                value={course.estimatedMinutes ? `${course.estimatedMinutes} min` : "—"}
              />
            </dl>
            {course.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {course.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this course?"
        description="Course content and progress will be removed. Linked decks stay in your library."
        confirmLabel="Delete course"
        destructive
        onConfirm={() => {
          deleteCourse(course.id);
          toast.success("Course deleted");
          navigate({ to: "/courses" });
        }}
      />
    </AppPage>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-surface2/50 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-lg font-semibold">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
