import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  FileJson,
  UploadCloud,
  Wand2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SAMPLE_COURSE_JSON, validateCourseJson } from "@/lib/course-schema";
import { courseQuestionCount } from "@/lib/courses";
import { useKnowly } from "@/store/knowly";

export const Route = createFileRoute("/_authenticated/courses/import")({
  head: () => ({
    meta: [
      { title: "Import a Course — Validate AI Course JSON | Knowly" },
      {
        name: "description",
        content:
          "Paste or upload AI-generated course JSON. Knowly validates modules, lessons, markdown blocks, checkpoints, quizzes and the final exam before creating the course.",
      },
    ],
  }),
  component: CourseImportPage,
});

function CourseImportPage() {
  const { addCourse } = useKnowly();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState("");
  const [dragging, setDragging] = useState(false);

  const result = useMemo(() => (raw.trim() ? validateCourseJson(raw) : null), [raw]);
  const course = result?.course;
  const lessonCount = course?.modules.reduce((sum, module) => sum + module.lessons.length, 0) ?? 0;
  const questionCount = course ? courseQuestionCount(course) : 0;

  const loadFile = async (file: File) => {
    setRaw(await file.text());
    toast.success(`Loaded ${file.name}`);
  };

  const doImport = () => {
    if (!course) return;
    addCourse(course);
    toast.success(`Imported ${course.title}`, {
      description: `${course.modules.length} modules · ${lessonCount} lessons · ${questionCount} questions`,
    });
    navigate({ to: "/courses/$courseId", params: { courseId: course.id } });
  };

  return (
    <AppPage>
      <PageHeader
        title="Import a course"
        description="Paste the JSON from Course Forge, or upload a course file. Nothing is added until every module, lesson and question passes validation."
        action={
          <>
            <Button asChild variant="outline">
              <Link to="/courses/forge">
                <Wand2 className="size-4" /> Course Forge
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setRaw(SAMPLE_COURSE_JSON)}>
              Load sample
            </Button>
            <Button onClick={doImport} disabled={!course}>
              <CheckCircle2 className="size-4" /> Import course
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <section className="panel p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileJson className="size-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">Course JSON</h2>
            </div>
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void loadFile(file);
                }}
              />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <UploadCloud className="size-4" /> Upload
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRaw("")} disabled={!raw}>
                Clear
              </Button>
            </div>
          </div>

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files?.[0];
              if (file) void loadFile(file);
            }}
            className={dragging ? "rounded-xl ring-2 ring-primary/50" : ""}
          >
            <Textarea
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              placeholder="Paste the course JSON here, or drag a .json file onto this box…"
              className="min-h-[480px] font-mono text-xs leading-6"
              spellCheck={false}
            />
          </div>

          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Schema: course metadata → modules → lessons → markdown blocks and checkpoint questions.
            Module quizzes and a final exam are optional.
          </p>
        </section>

        <section className="space-y-4">
          {!result && (
            <div className="panel flex flex-col items-center px-6 py-16 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-primary/12 text-primary">
                <BookOpenCheck className="size-6" />
              </span>
              <h2 className="mt-4 font-display text-lg font-semibold">Preview appears here</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Paste a generated course to see its modules, lessons, questions and any validation
                issues before importing.
              </p>
            </div>
          )}

          {result && (
            <>
              <div
                className={`panel p-5 ${result.ok ? "border-success/40" : "border-destructive/40"}`}
              >
                <div className="flex items-start gap-3">
                  {result.ok ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                  ) : (
                    <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-semibold">
                      {result.ok ? course?.title : "Course needs fixes"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {result.ok
                        ? `${course?.subject}${course?.level ? ` · ${course.level}` : ""}`
                        : "Fix the errors below, then validate again."}
                    </p>
                  </div>
                </div>

                {result.ok && course && (
                  <>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <Badge variant="outline">{course.modules.length} modules</Badge>
                      <Badge variant="outline">{lessonCount} lessons</Badge>
                      <Badge variant="outline">{questionCount} questions</Badge>
                      {course.finalExam && <Badge variant="outline">Final exam</Badge>}
                    </div>
                    {course.description && (
                      <p className="mt-4 text-sm leading-6 text-muted-foreground">
                        {course.description}
                      </p>
                    )}
                    <div className="mt-4 space-y-2">
                      {course.modules.map((module, index) => (
                        <div
                          key={module.id}
                          className="rounded-xl border border-border bg-surface2/60 p-3"
                        >
                          <p className="text-sm font-medium">
                            {index + 1}. {module.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {module.lessons.length} lessons ·{" "}
                            {module.lessons.reduce(
                              (sum, lesson) => sum + lesson.questions.length,
                              0,
                            )}{" "}
                            checkpoints
                            {module.quiz ? " · quiz" : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="panel border-destructive/40 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                    <XCircle className="size-4" /> {result.errors.length} errors
                  </p>
                  <ul className="mt-3 max-h-64 space-y-2 overflow-auto text-xs leading-5">
                    {result.errors.map((error, index) => (
                      <li key={index} className="rounded-lg bg-destructive/10 p-2 font-mono">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.warnings.length > 0 && (
                <div className="panel border-amber-500/30 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-300">
                    <AlertTriangle className="size-4" /> {result.warnings.length} warnings
                  </p>
                  <ul className="mt-3 max-h-52 space-y-2 overflow-auto text-xs leading-5 text-muted-foreground">
                    {result.warnings.map((warning, index) => (
                      <li key={index} className="rounded-lg bg-amber-500/10 p-2">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.ok && course && (
                <Button className="w-full" onClick={doImport}>
                  <CheckCircle2 className="size-4" /> Add this course to Knowly
                </Button>
              )}
            </>
          )}
        </section>
      </div>
    </AppPage>
  );
}
