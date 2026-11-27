import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileQuestion,
  GraduationCap,
  Layers,
  Library,
  Play,
  Printer,
  Swords,
  Target,
} from "lucide-react";
import { MathText } from "@/components/math/math-text";
import { QuestionPractice } from "@/components/questions/question-practice";
import { ModuleMarkdownText } from "@/components/module-markdown";
import { AppShell, PageHeader, type SharedDeckTool } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EXAM_THEMES, type ExamTheme } from "@/lib/exam-print";
import {
  createViewerDeckCopy,
  type SharedBlock,
  type SharedQuestion,
  type SharedResource,
} from "@/lib/share-content";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { useKnowly } from "@/store/knowly";
import { questionTypes } from "@/lib/schema";
import type { Difficulty, Question } from "@/lib/types";

function documentTheme(value?: string): ExamTheme {
  return EXAM_THEMES.find((theme) => theme.id === value)?.id ?? "classic";
}

function practiceQuestionFromShare(question: SharedQuestion): Question | null {
  const type = questionTypes.find((value) => value === question.type);
  if (!type) return null;

  const difficulty: Difficulty =
    question.difficulty === "easy" ||
    question.difficulty === "medium" ||
    question.difficulty === "hard"
      ? question.difficulty
      : "medium";
  const pairs =
    question.pairs ??
    (question.matchingLeft &&
    question.matchingRight &&
    question.matchingLeft.length === question.matchingRight.length
      ? question.matchingLeft.map((left, index) => ({
          left,
          right: question.matchingRight?.[index] ?? "",
        }))
      : undefined);

  return {
    id: question.id,
    type,
    question: question.question,
    answer: question.answer ?? "",
    options: question.options,
    correctOptions: question.correctOptions,
    items: question.items,
    pairs,
    blanks: question.blanks,
    wordBank: question.wordBank,
    explanation: question.explanation,
    incorrectExplanation: question.incorrectExplanation,
    tutor: question.tutor,
    difficulty,
    concept: question.concept,
    hint: question.hint,
    tags: question.tags,
  };
}

function QuestionList({
  questions,
  showAnswers = true,
  deckView = false,
  interactive = false,
}: {
  questions: SharedQuestion[];
  showAnswers?: boolean;
  deckView?: boolean;
  interactive?: boolean;
}) {
  if (!questions.length) {
    return <p className="text-sm text-muted-foreground">No questions in this resource.</p>;
  }

  return (
    <ol className="space-y-3">
      {questions.map((question, index) => (
        <li
          key={question.id}
          className={deckView ? "panel p-5" : "rounded-xl border border-border bg-card p-4"}
        >
          {(() => {
            const practiceQuestion = interactive ? practiceQuestionFromShare(question) : null;
            return (
              <div className="flex items-start gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-3">
                  {deckView && (
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <Badge variant="outline" className="capitalize">
                        {question.type.replaceAll("-", " ")}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {question.difficulty}
                      </Badge>
                      {question.concept && <Badge variant="secondary">{question.concept}</Badge>}
                      {question.tags?.map((tag) => (
                        <Badge key={tag} variant="outline">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {practiceQuestion ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium leading-6">
                        <MathText text={question.question} />
                      </p>
                      <QuestionPractice question={practiceQuestion} />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium leading-6">
                        <MathText text={question.question} />
                      </p>
                      {question.options && (
                        <ul className="space-y-1.5 pl-1 text-sm text-muted-foreground">
                          {question.options.map((option, optionIndex) => (
                            <li key={`${optionIndex}-${option}`} className="flex gap-2">
                              <span className="shrink-0">
                                {question.type === "multiple-select"
                                  ? "☐"
                                  : `${String.fromCharCode(65 + optionIndex)}.`}
                              </span>
                              <MathText text={option} />
                            </li>
                          ))}
                        </ul>
                      )}
                      {question.type === "true-false" && (
                        <p className="space-x-4 text-sm text-muted-foreground">
                          <span>○ True</span>
                          <span>○ False</span>
                        </p>
                      )}
                      {question.wordBank && (
                        <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Word bank: </span>
                          {question.wordBank.join(" · ")}
                        </p>
                      )}
                      {question.items && (
                        <ol className="space-y-1.5 pl-5 text-sm text-muted-foreground">
                          {question.items.map((item, itemIndex) => (
                            <li key={`${itemIndex}-${item}`}>
                              <MathText text={item} />
                            </li>
                          ))}
                        </ol>
                      )}
                      {question.pairs && (
                        <dl className="grid gap-1 text-sm sm:grid-cols-2">
                          {question.pairs.map((pair, pairIndex) => (
                            <div
                              key={`${pairIndex}-${pair.left}`}
                              className="rounded-lg bg-muted/40 p-2"
                            >
                              <dt className="font-medium">{pair.left}</dt>
                              <dd className="text-muted-foreground">{pair.right}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      {question.matchingLeft && question.matchingRight && (
                        <div className="grid gap-4 text-sm sm:grid-cols-2">
                          <ol className="space-y-1.5">
                            {question.matchingLeft.map((item, itemIndex) => (
                              <li
                                key={`${itemIndex}-${item}`}
                                className="rounded-lg bg-muted/40 p-2"
                              >
                                {item}
                              </li>
                            ))}
                          </ol>
                          <ol className="space-y-1.5">
                            {question.matchingRight.map((item, itemIndex) => (
                              <li
                                key={`${itemIndex}-${item}`}
                                className="rounded-lg bg-muted/40 p-2"
                              >
                                {String.fromCharCode(65 + itemIndex)}. {item}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {showAnswers && (question.answer || question.correctOptions?.length) && (
                        <details className="shared-answer-details rounded-lg bg-muted/40 px-3 py-2 text-sm">
                          <summary className="cursor-pointer font-medium">Show answer</summary>
                          <div className="mt-2 space-y-2 text-muted-foreground">
                            <p className="whitespace-pre-wrap">
                              {question.type === "multiple-select"
                                ? question.correctOptions?.join(", ")
                                : question.answer}
                            </p>
                            {question.explanation && (
                              <p className="border-t border-border pt-2">{question.explanation}</p>
                            )}
                            {question.incorrectExplanation && (
                              <p className="border-t border-border pt-2">
                                Common mistake: {question.incorrectExplanation}
                              </p>
                            )}
                            {question.tutor?.simple && (
                              <p className="border-t border-border pt-2">
                                In simple terms: {question.tutor.simple}
                              </p>
                            )}
                            {question.tutor?.mnemonic && (
                              <p className="border-t border-border pt-2">
                                Memory hook: {question.tutor.mnemonic}
                              </p>
                            )}
                            {question.tutor?.example && (
                              <p className="border-t border-border pt-2">
                                Example: {question.tutor.example}
                              </p>
                            )}
                            {question.tutor?.whyCorrect && (
                              <p className="border-t border-border pt-2">
                                Why it is correct: {question.tutor.whyCorrect}
                              </p>
                            )}
                            {question.tutor?.whyWrong?.map((entry) => (
                              <p key={entry.option} className="border-t border-border pt-2">
                                {entry.option}: {entry.why}
                              </p>
                            ))}
                          </div>
                        </details>
                      )}
                    </>
                  )}
                  {question.concept && (
                    <Badge variant="outline" className="text-[10px]">
                      {question.concept}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })()}
        </li>
      ))}
    </ol>
  );
}

function ContentBlocks({ blocks, theme }: { blocks: SharedBlock[]; theme: ExamTheme }) {
  return (
    <div className="space-y-4">
      {blocks.map((block) => {
        if (block.type === "divider") {
          return <hr key={block.id} className="border-border" />;
        }
        if (block.type === "image" && block.url) {
          return (
            <figure key={block.id} className="space-y-2">
              <img
                src={block.url}
                alt={block.alt ?? ""}
                className="mx-auto max-h-[34rem] max-w-full rounded-xl object-contain"
                loading="lazy"
              />
              {block.caption && (
                <figcaption className="text-center text-xs text-muted-foreground">
                  {block.caption}
                </figcaption>
              )}
            </figure>
          );
        }
        if (block.markdown) {
          const content = (
            <ModuleMarkdownText
              markdown={block.markdown}
              theme={theme}
              suggestedHighlights={block.highlightedText}
              className="text-sm sm:text-base"
            />
          );
          if (block.type === "callout" || block.type === "example") {
            return (
              <aside
                key={block.id}
                className="rounded-xl border border-border bg-card/70 p-4 sm:p-5"
              >
                {block.title && <h3 className="mb-2 font-semibold">{block.title}</h3>}
                {content}
              </aside>
            );
          }
          return <div key={block.id}>{content}</div>;
        }
        if (block.title) {
          return (
            <p key={block.id} className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
              {block.title}
            </p>
          );
        }
        return null;
      })}
    </div>
  );
}

export function SharedResourceView({
  resource,
  shareId,
  previewMode = false,
  onExitPreview,
}: {
  resource: SharedResource;
  shareId: string;
  previewMode?: boolean;
  onExitPreview?: () => void;
}) {
  const { state, hydrated, addDeck } = useKnowly();
  const isDeck = resource.resourceType === "deck";
  const isCourse = resource.resourceType === "course";
  const navigate = useNavigate();
  const [openModules, setOpenModules] = useState<Record<number, boolean>>({});
  const hasQuestions = Boolean(resource.payload.questions?.length);
  const viewerDeckId = `shared-${shareId}`;
  const hasViewerCopy = state.decks.some((deck) => deck.id === viewerDeckId);
  const copyStarted = useRef(false);
  const ensureDeckCopy = (forTool = false) => {
    if (hasViewerCopy || copyStarted.current) return true;
    if (!hydrated) {
      toast.info("The local library is still loading. Try again in a moment.");
      return false;
    }
    const copy = createViewerDeckCopy(resource, viewerDeckId);
    if (!copy.ok) {
      toast.error("This shared deck couldn't be added to your library.", {
        description: copy.error,
      });
      return false;
    }

    copyStarted.current = true;
    addDeck(copy.deck);
    if (copy.skippedQuestionCount > 0) {
      const count = copy.skippedQuestionCount;
      toast.info(`${count} malformed question${count === 1 ? " was" : "s were"} skipped.`, {
        description: "A copy with the remaining questions was added to your library.",
      });
    } else {
      toast.success(
        forTool
          ? "A copy was added to your library to open this study tool."
          : "A copy was added to your library.",
      );
    }
    return true;
  };
  const saveDeck = () => {
    if (hasViewerCopy) {
      toast.info("This shared deck is already in your library.");
      return;
    }
    ensureDeckCopy();
  };
  const openDeckTool = (tool: SharedDeckTool) => {
    if (!ensureDeckCopy(true)) return;
    switch (tool) {
      case "details":
        void navigate({ to: "/decks/$deckId", params: { deckId: viewerDeckId } });
        break;
      case "study":
        void navigate({
          to: "/study/$deckId",
          params: { deckId: viewerDeckId },
          search: { part: undefined, stageId: undefined, activityId: undefined },
        });
        break;
      case "arena":
        void navigate({ to: "/arena/$deckId", params: { deckId: viewerDeckId } });
        break;
      case "review":
        void navigate({ to: "/review", search: { deck: viewerDeckId } });
        break;
      case "weak-spots":
        void navigate({ to: "/review", search: { deck: viewerDeckId, mode: "weak" } });
        break;
      case "cram":
        void navigate({ to: "/cram", search: { deckId: viewerDeckId } });
        break;
      case "quiz":
        void navigate({ to: "/quiz", search: { deckId: viewerDeckId } });
        break;
      case "exam":
        void navigate({ to: "/exam", search: { deckId: viewerDeckId } });
        break;
      case "print":
        void navigate({ to: "/print", search: { deckId: viewerDeckId } });
        break;
      case "cards":
        void navigate({ to: "/cards", search: { deckId: viewerDeckId } });
        break;
    }
  };

  const { payload } = resource;
  const theme = documentTheme(payload.theme);
  const isPrintExam = payload.resourceType === "print_exam";
  const resourceLabel = {
    deck: "Shared deck",
    module: "Shared module",
    course: "Shared course",
    practice_quiz: "Practice quiz",
    print_exam: "Print exam",
  }[payload.resourceType];
  const description = isDeck
    ? [payload.subject, `${payload.questions?.length ?? 0} questions`].filter(Boolean).join(" · ")
    : (payload.description ??
      [payload.subject, "Shared learning resource"].filter(Boolean).join(" · "));
  const showExamAnswers = payload.examDetails?.includeAnswerKey ?? true;
  const courseModules = payload.modules ?? [];
  const courseLessonCount = courseModules.reduce(
    (count, courseModule) => count + courseModule.lessons.length,
    0,
  );
  const courseQuestionCount =
    courseModules.reduce(
      (count, courseModule) =>
        count +
        courseModule.lessons.reduce(
          (lessonCount, lesson) => lessonCount + lesson.questions.length,
          0,
        ) +
        (courseModule.quiz?.questions.length ?? 0),
      0,
    ) + (payload.finalExam?.questions.length ?? 0);
  const courseAccent = payload.color ?? "var(--primary)";
  const printCourse = () => {
    const previousOpenModules = openModules;
    setOpenModules(Object.fromEntries(courseModules.map((_, index) => [index, true])));
    window.setTimeout(() => {
      window.print();
      setOpenModules(previousOpenModules);
    }, 0);
  };
  const stagedQuestionIds = new Set(
    payload.stages?.flatMap((stage) =>
      stage.activities.flatMap((activity) => activity.questionIds),
    ) ?? [],
  );
  const unassignedDeckQuestions =
    payload.resourceType === "deck" && payload.stages?.length
      ? (payload.questions ?? []).filter((question) => !stagedQuestionIds.has(question.id))
      : [];

  return (
    <AppShell
      sharedView={isDeck ? { kind: "deck", deckId: viewerDeckId, onNavigate: openDeckTool } : true}
    >
      <div className="mx-auto w-full max-w-[1500px]">
        {!isCourse && (
          <PageHeader
            title={resource.title}
            description={description}
            action={
              <div className="print-hide flex flex-wrap items-center gap-2">
                {previewMode && (
                  <>
                    <Badge variant="secondary">DEV preview · link not published</Badge>
                    <Button type="button" variant="outline" onClick={onExitPreview}>
                      <ArrowLeft className="size-4" />
                      Back to content
                    </Button>
                  </>
                )}
                {isDeck && (
                  <>
                    <Button
                      type="button"
                      onClick={() => openDeckTool("study")}
                      disabled={!hasQuestions}
                    >
                      <Play className="size-4" />
                      Study
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => openDeckTool("quiz")}
                      disabled={!hasQuestions}
                    >
                      <BrainCircuit className="size-4" />
                      Quiz
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openDeckTool("arena")}
                      disabled={!hasQuestions}
                    >
                      <Swords className="size-4" />
                      Arena
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openDeckTool("print")}
                      disabled={!hasQuestions}
                    >
                      <Printer className="size-4" />
                      Print exam
                    </Button>
                    <Button type="button" variant="outline" onClick={() => window.print()}>
                      <Printer className="size-4" />
                      Print deck
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={saveDeck}
                      disabled={!hydrated || !hasQuestions || hasViewerCopy}
                    >
                      <Library className="size-4" />
                      {hasViewerCopy ? "In my library" : "Add to my library"}
                    </Button>
                  </>
                )}
                {!isDeck && (
                  <Button type="button" variant="outline" onClick={() => window.print()}>
                    <Printer className="size-4" />
                    Print resource
                  </Button>
                )}
              </div>
            }
          />
        )}
        <article
          className={
            isDeck
              ? "shared-resource-article mx-auto max-w-5xl space-y-6"
              : isCourse
                ? "shared-resource-article w-full space-y-6"
                : "shared-resource-article mx-auto max-w-5xl overflow-hidden rounded-[28px] border-2 border-border bg-card shadow-[5px_5px_0_var(--border)]"
          }
        >
          {isCourse ? (
            <section className="relative overflow-hidden rounded-[30px] border border-border bg-surface p-5 shadow-[0_28px_80px_-36px_color-mix(in_oklab,var(--foreground)_40%,transparent)] sm:p-8 lg:p-10">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-24 -top-36 size-[32rem] rounded-full opacity-50 blur-3xl"
                style={{
                  background: courseAccent,
                }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-56 left-1/4 size-[26rem] rounded-full bg-primary/20 blur-3xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,color-mix(in_oklab,var(--surface)_92%,transparent),transparent_52%,color-mix(in_oklab,var(--background)_85%,transparent))]"
              />
              <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-end">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <BookOpen className="size-4 text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Knowly · Shared course
                      </span>
                      {previewMode && <Badge variant="secondary">DEV preview</Badge>}
                    </div>
                    <div className="print-hide flex flex-wrap items-center gap-2">
                      {previewMode && (
                        <Button type="button" variant="outline" size="sm" onClick={onExitPreview}>
                          <ArrowLeft className="size-4" />
                          Back to content
                        </Button>
                      )}
                      <Button type="button" variant="outline" size="sm" onClick={printCourse}>
                        <Printer className="size-4" />
                        Print course
                      </Button>
                    </div>
                  </div>

                  <div className="mt-8 flex items-start gap-4">
                    <span
                      className="grid size-16 shrink-0 place-items-center rounded-3xl border border-border bg-foreground/10 text-4xl shadow-sm"
                      style={{
                        boxShadow: `0 18px 45px -22px color-mix(in oklab, ${courseAccent} 75%, transparent)`,
                      }}
                    >
                      {payload.emoji || "📘"}
                    </span>
                    <div className="min-w-0">
                      {(payload.subject || payload.level) && (
                        <p className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {payload.subject && <span>{payload.subject}</span>}
                          {payload.subject && payload.level && <span aria-hidden>·</span>}
                          {payload.level && <span>{payload.level}</span>}
                        </p>
                      )}
                      <h1 className="mt-2 max-w-3xl font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                        <MathText text={resource.title} />
                      </h1>
                      {payload.description && (
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                          <MathText text={payload.description} />
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-7 flex flex-wrap gap-2">
                    {courseModules.length > 0 && (
                      <Button asChild size="lg" className="rounded-xl">
                        <a href="#course-module-0">
                          <Play className="size-4 fill-current" />
                          Start learning
                        </a>
                      </Button>
                    )}
                    {payload.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="self-center">
                        #{tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Layers className="size-3.5" /> {courseModules.length} modules
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpenCheck className="size-3.5" /> {courseLessonCount} lessons
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <FileQuestion className="size-3.5" /> {courseQuestionCount} questions
                    </span>
                    {payload.estimatedMinutes ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="size-3.5" /> {payload.estimatedMinutes} min
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-3xl border border-border bg-card/85 p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div
                      className="grid size-12 shrink-0 place-items-center rounded-2xl"
                      style={{
                        background: `color-mix(in oklab, ${courseAccent} 12%, transparent)`,
                        color: courseAccent,
                      }}
                    >
                      <Target className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Course overview</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {courseModules.length} modules · {courseLessonCount} lessons to explore
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-surface p-3">
                      <p className="font-display text-xl font-semibold">{courseModules.length}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Modules
                      </p>
                    </div>
                    <div className="rounded-xl bg-surface p-3">
                      <p className="font-display text-xl font-semibold">{courseQuestionCount}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Questions
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <header
              className={
                isDeck
                  ? "shared-resource-header panel p-5 sm:p-7"
                  : "shared-resource-header border-b-2 border-border bg-muted/20 p-5 sm:p-9"
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {isDeck ? "Knowly · Deck preview" : "Knowly · Shared resource"}
                </span>
                {!isDeck && <Badge variant="outline">{resourceLabel}</Badge>}
              </div>
              {isDeck && (payload.tags?.length ?? 0) > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {payload.tags?.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
              {!isDeck && payload.subject && (
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {payload.subject}
                </p>
              )}
              {isDeck && payload.description && (
                <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {payload.description}
                </p>
              )}
            </header>
          )}

          <div className={isDeck ? "space-y-6" : isCourse ? "space-y-8" : "space-y-8 p-5 sm:p-9"}>
            {payload.stages?.map((stage, index) => {
              const stageQuestionIds = new Set(
                stage.activities.flatMap((activity) => activity.questionIds),
              );
              const stageQuestions = (payload.questions ?? []).filter((question) =>
                stageQuestionIds.has(question.id),
              );
              return (
                <section
                  key={`${stage.title}-${index}`}
                  className={isDeck ? "panel space-y-4 p-5 sm:p-7" : "space-y-4"}
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                      Learning Path · Stage {index + 1}
                    </p>
                    <h2 className="mt-1 font-display text-xl font-semibold">{stage.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{stage.purpose}</p>
                    {stage.description && (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {stage.description}
                      </p>
                    )}
                    {stage.concepts.length > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Concepts: {stage.concepts.join(" · ")}
                      </p>
                    )}
                    {stage.objectives.length > 0 && (
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {stage.objectives.map((objective, objectiveIndex) => (
                          <li key={`${objectiveIndex}-${objective}`}>{objective}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {stage.activities.length > 0 && (
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {stage.activities.map((activity, activityIndex) => (
                        <li
                          key={`${activity.title}-${activityIndex}`}
                          className="rounded-xl border border-border bg-card p-3"
                        >
                          <p className="text-sm font-medium">{activity.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {activity.description || activity.objective || activity.type}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                  {stageQuestions.length > 0 && (
                    <QuestionList questions={stageQuestions} deckView={isDeck} />
                  )}
                </section>
              );
            })}

            {unassignedDeckQuestions.length > 0 && (
              <section className={isDeck ? "panel space-y-4 p-5 sm:p-7" : "space-y-4"}>
                <h2 className="font-display text-xl font-semibold">Additional practice</h2>
                <QuestionList questions={unassignedDeckQuestions} deckView />
              </section>
            )}

            {payload.resourceType === "deck" && !payload.stages?.length && payload.questions && (
              <section className="panel space-y-4 p-5 sm:p-7">
                <h2 className="font-display text-xl font-semibold">Questions</h2>
                <QuestionList questions={payload.questions} deckView />
              </section>
            )}

            {payload.resourceType === "module" && (
              <>
                {payload.blocks && <ContentBlocks blocks={payload.blocks} theme={theme} />}
                {payload.questions && (
                  <section className="space-y-4">
                    <h2 className="font-display text-xl font-semibold">Practice</h2>
                    <QuestionList questions={payload.questions} interactive />
                  </section>
                )}
              </>
            )}

            {payload.resourceType === "course" && (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
                <section className="min-w-0">
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <h2 className="font-display text-2xl font-semibold tracking-tight">
                        Curriculum
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Explore each module, read the lessons, and check your understanding.
                      </p>
                    </div>
                    <Badge variant="outline">{courseModules.length} modules</Badge>
                  </div>

                  <div className="space-y-3">
                    {courseModules.map((courseModule, moduleIndex) => {
                      const open = openModules[moduleIndex] ?? moduleIndex === 0;
                      return (
                        <section
                          id={`course-module-${moduleIndex}`}
                          key={`${courseModule.title}-${moduleIndex}`}
                          className="scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenModules((current) => ({
                                ...current,
                                [moduleIndex]: !open,
                              }))
                            }
                            aria-expanded={open}
                            className="press flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface/60 sm:p-5"
                          >
                            <span
                              className="grid size-11 shrink-0 place-items-center rounded-2xl text-sm font-semibold"
                              style={{
                                background: `color-mix(in oklab, ${courseAccent} 12%, transparent)`,
                                color: courseAccent,
                              }}
                            >
                              {String(moduleIndex + 1).padStart(2, "0")}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="font-display text-base font-semibold">
                                <MathText text={courseModule.title} />
                              </span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {courseModule.lessons.length} lessons
                                {courseModule.quiz ? " · module quiz" : ""}
                              </span>
                            </span>
                            <ChevronDown
                              aria-hidden
                              className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                                open ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {open && (
                            <div className="space-y-4 border-t border-border p-3 sm:p-4">
                              {(courseModule.summary || courseModule.objectives.length > 0) && (
                                <div className="rounded-xl bg-surface/60 p-4">
                                  {courseModule.summary && (
                                    <p className="text-sm leading-6 text-muted-foreground">
                                      <MathText text={courseModule.summary} />
                                    </p>
                                  )}
                                  {courseModule.objectives.length > 0 && (
                                    <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                                      {courseModule.objectives.map((objective, objectiveIndex) => (
                                        <li
                                          key={`${objectiveIndex}-${objective}`}
                                          className="flex gap-2"
                                        >
                                          <CheckCircle2 className="mt-1 size-3.5 shrink-0 text-success" />
                                          <MathText text={objective} />
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              )}
                              {courseModule.lessons.map((lesson, lessonIndex) => (
                                <article
                                  id={`course-lesson-${moduleIndex}-${lessonIndex}`}
                                  key={`${lesson.title}-${lessonIndex}`}
                                  className="document-reading scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                                  data-document-theme={theme}
                                >
                                  <header className="document-reading-header border-b-[3px] border-border bg-surface px-4 py-4 sm:px-6">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge variant="outline">Lesson {lessonIndex + 1}</Badge>
                                      {lesson.estimatedMinutes ? (
                                        <Badge variant="outline">
                                          <Clock3 className="mr-1 size-3" />
                                          {lesson.estimatedMinutes} min
                                        </Badge>
                                      ) : null}
                                      {lesson.objectives.length > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                          {lesson.objectives.length} learning objectives
                                        </span>
                                      )}
                                    </div>
                                    <h3 className="mt-3 font-display text-xl font-semibold">
                                      <MathText text={lesson.title} />
                                    </h3>
                                    {lesson.summary && (
                                      <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                                        <MathText text={lesson.summary} />
                                      </p>
                                    )}
                                  </header>
                                  <div className="document-reading-panel space-y-5 p-4 sm:p-6">
                                    {lesson.objectives.length > 0 && (
                                      <ul className="space-y-1.5 text-sm text-muted-foreground">
                                        {lesson.objectives.map((objective, objectiveIndex) => (
                                          <li
                                            key={`${objectiveIndex}-${objective}`}
                                            className="flex gap-2"
                                          >
                                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                                            <MathText text={objective} />
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                    <ContentBlocks blocks={lesson.blocks} theme={theme} />
                                    {lesson.questions.length > 0 && (
                                      <section className="border-t border-border pt-5">
                                        <div className="mb-4 flex items-center gap-2">
                                          <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
                                            <CheckCircle2 className="size-4" />
                                          </span>
                                          <div>
                                            <h4 className="font-display text-lg font-semibold">
                                              Check your understanding
                                            </h4>
                                            <p className="text-xs text-muted-foreground">
                                              Try the checkpoints to see what you know.
                                            </p>
                                          </div>
                                        </div>
                                        <QuestionList questions={lesson.questions} interactive />
                                      </section>
                                    )}
                                  </div>
                                </article>
                              ))}
                              {courseModule.quiz && (
                                <section
                                  id={`course-module-quiz-${moduleIndex}`}
                                  className="scroll-mt-24 rounded-2xl border border-border bg-surface/50 p-4 sm:p-5"
                                >
                                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                      <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                                        <FileQuestion className="size-4" />
                                      </span>
                                      <div>
                                        <h3 className="font-display font-semibold">
                                          <MathText text={courseModule.quiz.title} />
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                          {courseModule.quiz.questions.length} questions
                                          {courseModule.quiz.passingScore !== undefined
                                            ? ` · pass at ${courseModule.quiz.passingScore}%`
                                            : ""}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <QuestionList
                                    questions={courseModule.quiz.questions}
                                    interactive
                                  />
                                </section>
                              )}
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </div>

                  {payload.finalExam && (
                    <section
                      id="course-final-exam"
                      className="relative mt-4 scroll-mt-24 overflow-hidden rounded-2xl border-[3px] border-border bg-surface p-5 shadow-[4px_4px_0_0_var(--shadow-ink)]"
                    >
                      <div
                        aria-hidden
                        className="absolute -right-10 -top-16 size-40 rounded-full bg-primary/10 blur-2xl"
                      />
                      <div className="relative">
                        <div className="mb-4 flex items-center gap-3">
                          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
                            <GraduationCap className="size-5" />
                          </span>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                              Final assessment
                            </p>
                            <h2 className="mt-0.5 font-display text-lg font-semibold">
                              <MathText text={payload.finalExam.title} />
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {payload.finalExam.questions.length} questions
                              {payload.finalExam.passingScore !== undefined
                                ? ` · pass at ${payload.finalExam.passingScore}%`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <QuestionList questions={payload.finalExam.questions} interactive />
                      </div>
                    </section>
                  )}
                </section>

                <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                  {payload.objectives && payload.objectives.length > 0 && (
                    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Target className="size-4 text-primary" />
                        <h2 className="font-display text-base font-semibold">What you'll learn</h2>
                      </div>
                      <ul className="mt-4 space-y-2.5 text-sm leading-6 text-muted-foreground">
                        {payload.objectives.map((objective, objectiveIndex) => (
                          <li key={`${objectiveIndex}-${objective}`} className="flex gap-2.5">
                            <CheckCircle2 className="mt-1.5 size-3.5 shrink-0 text-success" />
                            <MathText text={objective} />
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <nav className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <h2 className="px-2 font-display text-base font-semibold">Course outline</h2>
                    <div className="mt-3 space-y-1">
                      {courseModules.map((courseModule, moduleIndex) => (
                        <a
                          key={`${courseModule.title}-${moduleIndex}`}
                          href={`#course-module-${moduleIndex}`}
                          className="press flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                        >
                          <span
                            className="grid size-6 shrink-0 place-items-center rounded-lg text-[10px] font-semibold"
                            style={{
                              background: `color-mix(in oklab, ${courseAccent} 12%, transparent)`,
                              color: courseAccent,
                            }}
                          >
                            {moduleIndex + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            <MathText text={courseModule.title} />
                          </span>
                          <span className="shrink-0 text-[10px]">
                            {courseModule.lessons.length}
                          </span>
                        </a>
                      ))}
                      {payload.finalExam && (
                        <a
                          href="#course-final-exam"
                          className="press mt-2 flex items-center gap-2 rounded-xl border border-border px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                        >
                          <GraduationCap className="size-4 shrink-0 text-primary" />
                          <span className="min-w-0 flex-1 truncate">
                            <MathText text={payload.finalExam.title} />
                          </span>
                        </a>
                      )}
                    </div>
                  </nav>
                </aside>
              </div>
            )}

            {payload.finalExam && payload.resourceType !== "course" && (
              <section className="space-y-3">
                <h2 className="font-display text-xl font-semibold">{payload.finalExam.title}</h2>
                <QuestionList questions={payload.finalExam.questions} />
              </section>
            )}

            {payload.resourceType === "practice_quiz" && (
              <section className="space-y-4">
                <h2 className="font-display text-xl font-semibold">Practice quiz</h2>
                <QuestionList questions={payload.questions ?? []} />
              </section>
            )}

            {isPrintExam && (
              <section className="space-y-4">
                {payload.examDetails?.instructions && (
                  <p className="rounded-lg border-l-2 border-primary bg-muted/30 p-3 text-sm italic">
                    {payload.examDetails.instructions}
                  </p>
                )}
                <QuestionList questions={payload.questions ?? []} showAnswers={showExamAnswers} />
              </section>
            )}
          </div>
          {!isDeck && (
            <footer className="shared-resource-footer border-t border-border px-5 py-4 text-center text-xs text-muted-foreground sm:px-9">
              Shared from Knowly · The owner controls access to this link
            </footer>
          )}
        </article>
      </div>
    </AppShell>
  );
}
