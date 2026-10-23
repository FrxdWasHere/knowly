import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileQuestion,
  GraduationCap,
  Layers,
  Library,
  NotebookPen,
  Pencil,
  Play,
  Printer,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
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
import { cn } from "@/lib/utils";
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
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

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

  const firstLesson = course.modules.find((module) => module.lessons.length)?.lessons[0];
  const continueLesson = next?.lesson ?? firstLesson;
  const continueModule = next?.module ?? course.modules.find((module) => module.lessons.length);
  const featuredAssessment = course.finalExam ?? course.modules.find((module) => module.quiz)?.quiz;

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
      <div className="mx-auto w-full max-w-[1500px]">
        <section className="relative overflow-hidden rounded-[30px] border border-border bg-surface shadow-[0_28px_80px_-36px_color-mix(in_oklab,var(--foreground)_40%,transparent)]">
          <div
            aria-hidden
            className="absolute -right-24 -top-36 size-[32rem] rounded-full opacity-50 blur-3xl"
            style={{ background: course.color }}
          />
          <div
            aria-hidden
            className="absolute -bottom-56 left-1/4 size-[26rem] rounded-full bg-primary/20 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(120deg,color-mix(in_oklab,var(--surface)_92%,transparent),transparent_52%,color-mix(in_oklab,var(--background)_85%,transparent))]"
          />

          <div className="relative grid gap-7 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-end lg:p-10">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  to="/courses"
                  className="press inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" /> All courses
                </Link>
                <div className="flex items-center gap-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/courses/$courseId/print" params={{ courseId: course.id }}>
                      <Printer className="size-3.5" /> Print course
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/courses/$courseId/edit" params={{ courseId: course.id }}>
                      <Pencil className="size-3.5" /> Edit
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
                </div>
              </div>

              <div className="mt-8 flex items-start gap-4">
                <span
                  className="grid size-16 shrink-0 place-items-center rounded-3xl border border-border bg-foreground/10 text-4xl shadow-2xl backdrop-blur"
                  style={{
                    boxShadow: `0 18px 45px -22px color-mix(in oklab, ${course.color} 75%, transparent)`,
                  }}
                >
                  {course.emoji || "📘"}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <span>{course.subject}</span>
                    {course.level && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{course.level}</span>
                      </>
                    )}
                  </div>
                  <h1 className="mt-2 max-w-3xl font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                    {course.title}
                  </h1>
                  {course.description && (
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                      {course.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                {continueLesson && continueModule && (
                  <Button asChild size="lg" className="rounded-xl">
                    <Link
                      to="/courses/$courseId/lessons/$lessonId"
                      params={{ courseId: course.id, lessonId: continueLesson.id }}
                    >
                      <Play className="size-4 fill-current" />
                      {next ? "Continue learning" : "Review lessons"}
                    </Link>
                  </Button>
                )}
                {featuredAssessment && (
                  <Button asChild size="lg" variant="outline" className="rounded-xl">
                    <Link
                      to="/courses/$courseId/quiz"
                      params={{ courseId: course.id }}
                      search={{ assessment: featuredAssessment.id }}
                    >
                      <FileQuestion className="size-4" />
                      {featuredAssessment === course.finalExam ? "Final exam" : "Module quiz"}
                    </Link>
                  </Button>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="size-3.5" /> {course.modules.length} modules
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BookOpenCheck className="size-3.5" /> {stats.lessons} lessons
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FileQuestion className="size-3.5" /> {stats.questions} questions
                </span>
                {course.estimatedMinutes ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="size-3.5" /> {course.estimatedMinutes} min
                  </span>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-foreground/[0.06] p-5 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="relative size-24 shrink-0">
                  <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      style={{ stroke: "var(--border)" }}
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke={course.color}
                      strokeWidth="8"
                      strokeLinecap="round"
                      pathLength={100}
                      strokeDasharray={`${Math.max(stats.percent, 1)} ${100 - Math.max(stats.percent, 1)}`}
                    />
                  </svg>
                  <div className="absolute inset-0 grid place-items-center text-center">
                    <div>
                      <p className="font-display text-2xl font-semibold leading-none">
                        {stats.percent}%
                      </p>
                      <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                        complete
                      </p>
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">Your progress</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {stats.completedLessons} of {stats.lessons} lessons finished
                  </p>
                  {next && (
                    <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-foreground/70">
                      Next: {next.lesson.title}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <HeroStat label="Lessons" value={`${stats.completedLessons}/${stats.lessons}`} />
                <HeroStat label="Due now" value={stats.due} />
                <HeroStat label="Questions" value={stats.questions} />
                <HeroStat
                  label="Assessments"
                  value={`${stats.passedAssessments}/${stats.assessments}`}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight">Curriculum</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Work through each module, then check your understanding.
                </p>
              </div>
              <Badge variant="outline">
                {stats.completedLessons}/{stats.lessons} complete
              </Badge>
            </div>

            <div className="space-y-3">
              {course.modules.map((module, moduleIndex) => {
                const moduleDone = module.lessons.filter(
                  (lesson) => lessonProgress(progress, lesson.id).status === "completed",
                ).length;
                const modulePercent = module.lessons.length
                  ? Math.round((moduleDone / module.lessons.length) * 100)
                  : 0;
                const moduleActive = next?.module.id === module.id;
                const open = openModules[module.id] ?? (moduleIndex === 0 || Boolean(moduleActive));

                return (
                  <div
                    key={module.id}
                    className={cn(
                      "overflow-hidden rounded-2xl border bg-card shadow-sm transition-colors",
                      moduleActive ? "border-primary/30" : "border-border",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenModules((current) => ({ ...current, [module.id]: !open }))
                      }
                      aria-expanded={open}
                      className="press flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface/60 sm:p-5"
                    >
                      <span
                        className="grid size-11 shrink-0 place-items-center rounded-2xl text-sm font-semibold"
                        style={{ background: `${course.color}1f`, color: course.color }}
                      >
                        {String(moduleIndex + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-base font-semibold">
                            {module.title}
                          </span>
                          {moduleActive && (
                            <Badge className="bg-primary/10 text-primary">Up next</Badge>
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {module.lessons.length} lessons
                          {module.quiz ? " · module quiz" : ""} · {moduleDone} complete
                        </span>
                        <span className="mt-2 flex max-w-xs items-center gap-2">
                          <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface2">
                            <span
                              className="block h-full rounded-full transition-all"
                              style={{
                                width: `${modulePercent}%`,
                                background: course.color,
                              }}
                            />
                          </span>
                          <span className="w-8 text-right text-[10px] tabular-nums text-muted-foreground">
                            {modulePercent}%
                          </span>
                        </span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                          open && "rotate-180",
                        )}
                      />
                    </button>

                    {open && (
                      <div className="border-t border-border">
                        {module.lessons.map((lesson, lessonIndex) => {
                          const lessonState = lessonProgress(progress, lesson.id);
                          const lessonStat = lessonStats(progress, lesson);
                          const complete = lessonState.status === "completed";
                          const isNext = next?.lesson.id === lesson.id;
                          return (
                            <div
                              key={lesson.id}
                              className={cn(
                                "group flex flex-wrap items-center gap-3 border-b border-border/70 px-4 py-3 transition-colors last:border-b-0 hover:bg-surface/50 sm:px-5",
                                isNext && "bg-primary/[0.035]",
                              )}
                            >
                              <span
                                className={cn(
                                  "grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold ring-1",
                                  complete
                                    ? "bg-success/10 text-success ring-success/20"
                                    : isNext
                                      ? "bg-primary/10 text-primary ring-primary/20"
                                      : "bg-surface2 text-muted-foreground ring-border",
                                )}
                              >
                                {complete ? <CheckCircle2 className="size-4" /> : lessonIndex + 1}
                              </span>
                              <Link
                                to="/courses/$courseId/lessons/$lessonId"
                                params={{ courseId: course.id, lessonId: lesson.id }}
                                className="min-w-0 flex-1 basis-52"
                              >
                                <span className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={cn(
                                      "text-sm font-medium transition-colors group-hover:text-primary",
                                      complete && "text-muted-foreground",
                                    )}
                                  >
                                    {lesson.title}
                                  </span>
                                  {isNext && (
                                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                                      Next
                                    </span>
                                  )}
                                </span>
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                  {lesson.questions.length} checkpoints
                                  {lessonStat.due > 0 ? ` · ${lessonStat.due} due` : ""}
                                  {lesson.estimatedMinutes
                                    ? ` · ${lesson.estimatedMinutes} min`
                                    : ""}
                                </span>
                              </Link>
                              <div className="flex shrink-0 items-center gap-1">
                                <Button asChild size="sm" variant="outline">
                                  <Link
                                    to="/courses/$courseId/lessons/$lessonId"
                                    params={{ courseId: course.id, lessonId: lesson.id }}
                                  >
                                    {complete ? "Review" : "Open"}
                                    <ArrowRight className="size-3.5" />
                                  </Link>
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label="Create practice deck from lesson"
                                  title="Create practice deck"
                                  onClick={() => createDeckFromLesson(lesson)}
                                  disabled={!lesson.questions.length}
                                >
                                  <Library className="size-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}

                        {module.quiz && module.quiz.questions.length > 0 && (
                          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface/50 px-4 py-3 sm:px-5">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                                <FileQuestion className="size-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{module.quiz.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {module.quiz.questions.length} questions · pass at{" "}
                                  {module.quiz.passingScore}%
                                </p>
                              </div>
                            </div>
                            <Button asChild size="sm" variant="outline">
                              <Link
                                to="/courses/$courseId/quiz"
                                params={{ courseId: course.id }}
                                search={{ assessment: module.quiz.id }}
                              >
                                Take quiz <ArrowRight className="size-3.5" />
                              </Link>
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {course.finalExam && course.finalExam.questions.length > 0 && (
              <div className="relative mt-4 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5">
                <div
                  aria-hidden
                  className="absolute -right-10 -top-16 size-40 rounded-full bg-primary/10 blur-2xl"
                />
                <div className="relative flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
                      <GraduationCap className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                        Final assessment
                      </p>
                      <h2 className="mt-0.5 truncate font-display text-lg font-semibold">
                        {course.finalExam.title}
                      </h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {course.finalExam.questions.length} questions · pass at{" "}
                        {course.finalExam.passingScore}%
                        {course.finalExam.timeLimitMinutes
                          ? ` · ${course.finalExam.timeLimitMinutes} min`
                          : ""}
                      </p>
                    </div>
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
              </div>
            )}
          </section>

          <aside className="space-y-4">
            {course.objectives.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Target className="size-4 text-primary" />
                  <h2 className="font-display text-base font-semibold">What you'll learn</h2>
                </div>
                <ul className="mt-4 space-y-2.5 text-sm leading-6 text-muted-foreground">
                  {course.objectives.map((objective) => (
                    <li key={objective} className="flex gap-2.5">
                      <CheckCircle2 className="mt-1.5 size-3.5 shrink-0 text-success" />
                      {objective}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Trophy className="size-4 text-primary" />
                <h2 className="font-display text-base font-semibold">Course details</h2>
              </div>
              <dl className="mt-4 space-y-2.5 text-sm">
                <DetailRow label="Modules" value={course.modules.length} />
                <DetailRow label="Lessons" value={stats.lessons} />
                <DetailRow label="Questions" value={stats.questions} />
                <DetailRow
                  label="Estimated time"
                  value={course.estimatedMinutes ? `${course.estimatedMinutes} min` : "—"}
                />
                <DetailRow
                  label="Last studied"
                  value={
                    stats.lastStudiedAt
                      ? new Date(stats.lastStudiedAt).toLocaleDateString()
                      : "Not yet"
                  }
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

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <NotebookPen className="size-4 text-primary" />
                <h2 className="font-display text-base font-semibold">Linked practice</h2>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Decks are optional. Course progress and review stay independent.
              </p>
              <div className="mt-4 space-y-2">
                {linkedDecks.map((deck) => (
                  <Link
                    key={deck.id}
                    to="/decks/$deckId"
                    params={{ deckId: deck.id }}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface/60 p-3 text-sm transition-colors hover:border-primary/30"
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
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={linkDeck}
                    disabled={!deckToLink}
                    aria-label="Link deck"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-gradient-to-br from-surface to-card p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="size-4 text-primary" /> Study rhythm
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {stats.due > 0
                  ? `${stats.due} checkpoint${stats.due === 1 ? "" : "s"} are ready for review right now.`
                  : "You're caught up on checkpoint reviews. Open the next lesson to keep momentum."}
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                <Link to="/review">
                  <ArrowRight className="size-3.5" /> Open daily review
                </Link>
              </Button>
            </div>
          </aside>
        </div>
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

function HeroStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-foreground/[0.05] px-3 py-2">
      <p className="text-[9px] uppercase tracking-[0.13em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
