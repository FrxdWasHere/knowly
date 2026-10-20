import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpenCheck, ChevronRight, Layers, Plus, Search, Sparkles, Wand2 } from "lucide-react";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { courseStats, nextLesson } from "@/lib/courses";
import { useKnowly } from "@/store/knowly";
import { cn } from "@/lib/utils";
import type { Course } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/courses/")({
  head: () => ({
    meta: [
      { title: "Courses — Structured Learning Paths | Knowly" },
      {
        name: "description",
        content:
          "Build AI-generated or hand-written courses with modules, lessons, checkpoints, quizzes and a final exam. Courses work independently of decks and can link to them for extra practice.",
      },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const { state } = useKnowly();
  const [query, setQuery] = useState("");
  const courses = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return state.courses;
    return state.courses.filter((course) =>
      [course.title, course.subject, course.description, course.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [state.courses, query]);

  return (
    <AppPage>
      <PageHeader
        title="Courses"
        description="Structured learning paths with lessons, checkpoints and assessments — independent of decks, connected when you want them to be."
        action={
          <>
            <Button asChild variant="outline">
              <Link to="/courses/import">
                <Plus className="size-4" /> Import course
              </Link>
            </Button>
            <Button asChild>
              <Link to="/courses/forge">
                <Wand2 className="size-4" /> Course Forge
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search courses, subjects or tags…"
            className="pl-9"
          />
        </div>
        <Badge variant="outline">{state.courses.length} courses</Badge>
      </div>

      {courses.length === 0 ? (
        <EmptyCourses hasCourses={state.courses.length > 0} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </AppPage>
  );
}

function CourseCard({ course }: { course: Course }) {
  const { state } = useKnowly();
  const progress = state.courseProgress[course.id];
  const stats = courseStats(course, progress);
  const next = nextLesson(course, progress);

  return (
    <Link
      to="/courses/$courseId"
      params={{ courseId: course.id }}
      className="panel group flex min-w-0 flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35"
    >
      <div className="h-1.5 w-full" style={{ background: course.color }} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface2 text-2xl ring-1 ring-border">
            {course.emoji || "📘"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-display text-lg font-semibold">{course.title}</h2>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {course.subject}
              {course.level ? ` · ${course.level}` : ""}
            </p>
          </div>
        </div>

        {course.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {course.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5">
          <Badge variant="outline">{course.modules.length} modules</Badge>
          <Badge variant="outline">{stats.lessons} lessons</Badge>
          <Badge variant="outline">{stats.questions} questions</Badge>
          {stats.assessments > 0 && (
            <Badge variant="outline">{stats.assessments} assessments</Badge>
          )}
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {stats.completedLessons}/{stats.lessons} lessons complete
            </span>
            <span className="font-semibold">{stats.percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface2">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${stats.percent}%`, background: course.color }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
          <span className="truncate text-muted-foreground">
            {next
              ? `Next: ${next.lesson.title}`
              : stats.lessons
                ? "All lessons complete"
                : "No lessons yet"}
          </span>
          {stats.due > 0 && (
            <Badge className="shrink-0 bg-primary/15 text-primary">{stats.due} due</Badge>
          )}
        </div>
      </div>
    </Link>
  );
}

function EmptyCourses({ hasCourses }: { hasCourses: boolean }) {
  return (
    <div className="panel flex flex-col items-center px-6 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
        {hasCourses ? <Search className="size-7" /> : <BookOpenCheck className="size-7" />}
      </span>
      <h2 className="mt-4 font-display text-xl font-semibold">
        {hasCourses ? "No courses match that search" : "Your first course starts here"}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {hasCourses
          ? "Try a different title, subject or tag."
          : "Generate a full course from a topic or reference notes, import AI JSON, or build the structure by hand."}
      </p>
      {!hasCourses && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/courses/forge">
              <Sparkles className="size-4" /> Generate a course
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/courses/import">
              <Layers className="size-4" /> Import JSON
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
