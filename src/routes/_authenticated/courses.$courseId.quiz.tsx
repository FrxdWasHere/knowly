import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCircle2, FileQuestion, RotateCcw, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InteractiveQuestion,
  isInteractiveComplete,
} from "@/components/questions/interactive-question";
import { MathText } from "@/components/math/math-text";
import { checkAnswer, TYPE_LABELS } from "@/lib/answers";
import { allCourseQuestions, allLessons } from "@/lib/courses";
import { createId } from "@/lib/id";
import { useKnowly } from "@/store/knowly";
import type { CourseAssessmentResult, Question } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/courses/$courseId/quiz")({
  validateSearch: (search: Record<string, unknown>): { assessment?: string } => ({
    assessment: typeof search.assessment === "string" ? search.assessment : undefined,
  }),
  head: () => ({ meta: [{ title: "Course Quiz — Checkpoints & Final Exam | Knowly" }] }),
  component: CourseQuizPage,
});

function CourseQuizPage() {
  const { courseId } = Route.useParams();
  const { assessment } = Route.useSearch();
  const { state, recordCourseAssessment, recordSession } = useKnowly();
  const course = state.courses.find((item) => item.id === courseId);
  const assessmentList = useMemo(
    () =>
      course
        ? [
            ...course.modules.flatMap((module) =>
              module.quiz ? [{ ...module.quiz, moduleTitle: module.title }] : [],
            ),
            ...(course.finalExam ? [{ ...course.finalExam, moduleTitle: "Final exam" }] : []),
          ]
        : [],
    [course],
  );
  const selected = assessment ? assessmentList.find((item) => item.id === assessment) : undefined;
  const questions = useMemo(() => {
    if (!course) return [];
    if (selected) return selected.questions;
    return allCourseQuestions(course);
  }, [course, selected]);

  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [answers, setAnswers] = useState<{ question: Question; given: string; correct: boolean }[]>(
    [],
  );
  const [result, setResult] = useState<CourseAssessmentResult | null>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const autoFinishRef = useRef<() => void>(() => {});
  const timeLimitSeconds = selected?.timeLimitMinutes
    ? Math.max(1, Math.round(selected.timeLimitMinutes * 60))
    : null;

  useEffect(() => {
    if (!course || !questions.length || !timeLimitSeconds || result) {
      setTimeLeft(null);
      return;
    }
    const deadline = Date.now() + timeLimitSeconds * 1000;
    let finished = false;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0 && !finished) {
        finished = true;
        autoFinishRef.current();
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [course, questions.length, timeLimitSeconds, result, selected?.id]);

  useEffect(() => {
    setIndex(0);
    setValue("");
    setAnswers([]);
    setResult(null);
    setStartedAt(Date.now());
  }, [selected?.id, courseId]);

  if (!course) {
    return (
      <AppPage>
        <div className="panel mx-auto max-w-lg p-8 text-center">
          <FileQuestion className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-4 font-display text-xl font-semibold">Course not found</h1>
          <Button asChild className="mt-5">
            <Link to="/courses">Back to courses</Link>
          </Button>
        </div>
      </AppPage>
    );
  }

  if (!questions.length) {
    return (
      <AppPage>
        <PageHeader
          title={selected?.title || "Course quiz"}
          description="No questions are available in this assessment yet."
          action={
            <Button asChild variant="outline">
              <Link to="/courses/$courseId" params={{ courseId: course.id }}>
                <ArrowLeft className="size-4" /> Back to course
              </Link>
            </Button>
          }
        />
        <div className="panel p-10 text-center text-sm text-muted-foreground">
          Add checkpoint questions or import an assessment to start practising.
        </div>
      </AppPage>
    );
  }

  const total = questions.length;
  const current = questions[index];
  const interactive = ["ordering", "matching", "word-bank"].includes(current.type);
  const canSubmit = interactive
    ? isInteractiveComplete(current, value)
    : ["flashcard"].includes(current.type)
      ? true
      : value.trim().length > 0;

  const finishAssessment = (
    finalAnswers: { question: Question; given: string; correct: boolean }[],
    timedOut = false,
  ) => {
    const score = finalAnswers.filter((answer) => answer.correct).length;
    const percentage = Math.round((score / total) * 100);
    const passingScore = selected?.passingScore ?? 80;
    const final: CourseAssessmentResult = {
      id: createId(),
      assessmentId: selected?.id ?? "course-practice",
      createdAt: Date.now(),
      score,
      total,
      percentage,
      passed: percentage >= passingScore,
      durationMs: Date.now() - startedAt,
    };
    setAnswers(finalAnswers);
    setResult(final);
    recordCourseAssessment(course.id, final);
    if (state.settings.xpEnabled) {
      recordSession({
        mode: "quiz",
        deckIds: [],
        deckTitles: [`${course.title} · ${selected?.title ?? "Course quiz"}`],
        answered: total,
        correct: score,
        skipped: 0,
        durationMs: final.durationMs,
        xpEarned: score * 5,
        bestCombo: 0,
        masteredIds: {},
        conceptStats: {},
      });
    }
    toast.success(
      timedOut ? "Time's up" : final.passed ? "Assessment passed" : "Assessment complete",
      {
        description: `${score}/${total} · ${percentage}%`,
      },
    );
  };

  const submit = (forced?: boolean) => {
    const correct = forced ?? checkAnswer(current, value);
    const nextAnswers = [...answers, { question: current, given: value, correct }];
    if (index + 1 < total) {
      setAnswers(nextAnswers);
      setIndex(index + 1);
      setValue("");
      return;
    }
    finishAssessment(nextAnswers);
  };

  autoFinishRef.current = () => {
    const currentCorrect = canSubmit ? checkAnswer(current, value) : false;
    const remaining = questions.slice(index).map((question, offset) => ({
      question,
      given: offset === 0 ? value : "",
      correct: offset === 0 && currentCorrect,
    }));
    finishAssessment([...answers, ...remaining], true);
  };

  if (result) {
    return (
      <AppPage>
        <PageHeader
          title={selected?.title || "Course quiz complete"}
          description={`${course.title} · ${result.score}/${result.total} correct`}
          action={
            <Button asChild variant="outline">
              <Link to="/courses/$courseId" params={{ courseId: course.id }}>
                <ArrowLeft className="size-4" /> Back to course
              </Link>
            </Button>
          }
        />
        <div className="panel mx-auto max-w-2xl p-6 text-center sm:p-10">
          <span
            className={cn(
              "mx-auto grid size-20 place-items-center rounded-full",
              result.passed ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
            )}
          >
            <Trophy className="size-9" />
          </span>
          <p className="mt-5 font-display text-5xl font-semibold">{result.percentage}%</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {result.score} of {result.total} correct ·{" "}
            {result.passed ? "passed" : `needed ${selected?.passingScore ?? 80}%`}
          </p>
          <div className="mt-6 grid gap-2 text-left">
            {answers.map((answer, answerIndex) => (
              <div
                key={`${answer.question.id}-${answerIndex}`}
                className={cn(
                  "rounded-xl border p-3 text-sm",
                  answer.correct
                    ? "border-success/30 bg-success/8"
                    : "border-destructive/30 bg-destructive/8",
                )}
              >
                <p className="flex items-start gap-2 font-medium">
                  {answer.correct ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  ) : (
                    <X className="mt-0.5 size-4 shrink-0 text-destructive" />
                  )}
                  <MathText text={answer.question.question} />
                </p>
                {!answer.correct && (
                  <p className="mt-1 pl-6 text-xs text-muted-foreground">
                    Correct answer: <MathText text={answer.question.answer} />
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button
              onClick={() => {
                setResult(null);
                setAnswers([]);
                setIndex(0);
                setValue("");
                setStartedAt(Date.now());
              }}
            >
              <RotateCcw className="size-4" /> Try again
            </Button>
            <Button asChild variant="outline">
              <Link to="/courses/$courseId" params={{ courseId: course.id }}>
                Course overview
              </Link>
            </Button>
          </div>
        </div>
      </AppPage>
    );
  }

  return (
    <AppPage>
      <PageHeader
        title={selected?.title || "Course practice"}
        description={`${course.title} · question ${index + 1} of ${total}`}
        action={
          <Button asChild variant="ghost">
            <Link to="/courses/$courseId" params={{ courseId: course.id }}>
              <ArrowLeft className="size-4" /> Exit
            </Link>
          </Button>
        }
      />

      <div className="mx-auto max-w-3xl">
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-surface2">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>

        <div className="panel p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{TYPE_LABELS[current.type]}</Badge>
            {current.concept && <Badge variant="outline">{current.concept}</Badge>}
            {current.difficulty && <Badge variant="outline">{current.difficulty}</Badge>}
            {timeLeft !== null && (
              <Badge variant={timeLeft <= 30 ? "destructive" : "outline"} className="tabular-nums">
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")} left
              </Badge>
            )}
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold leading-snug">
            <MathText text={current.question} />
          </h1>

          {current.type === "multiple-choice" && (
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {current.options?.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setValue(option)}
                  className={cn(
                    "min-h-12 rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                    value === option
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border bg-background hover:border-primary/30",
                  )}
                >
                  <MathText text={option} />
                </button>
              ))}
            </div>
          )}

          {current.type === "true-false" && (
            <div className="mt-5 flex gap-2">
              {["true", "false"].map((option) => (
                <Button
                  key={option}
                  variant={value === option ? "default" : "outline"}
                  onClick={() => setValue(option)}
                >
                  {option === "true" ? "True" : "False"}
                </Button>
              ))}
            </div>
          )}

          {current.type === "flashcard" && (
            <div className="mt-5 rounded-xl border border-border bg-surface2/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Answer
              </p>
              <p className="mt-2 text-sm leading-6">
                <MathText text={current.answer} />
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={() => submit(false)}>
                  <X className="size-4" /> Missed it
                </Button>
                <Button onClick={() => submit(true)}>
                  <Check className="size-4" /> Got it
                </Button>
              </div>
            </div>
          )}

          {interactive && (
            <div className="mt-5">
              <InteractiveQuestion
                question={current}
                value={value}
                onChange={setValue}
                revealed={false}
              />
            </div>
          )}

          {!interactive &&
            !["multiple-choice", "true-false", "flashcard"].includes(current.type) && (
              <input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Type your answer…"
                className="mt-5 min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canSubmit) submit();
                }}
              />
            )}

          {current.type !== "flashcard" && (
            <div className="mt-6 flex justify-end">
              <Button onClick={() => submit()} disabled={!canSubmit}>
                {index + 1 === total ? "Finish assessment" : "Next question"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppPage>
  );
}
