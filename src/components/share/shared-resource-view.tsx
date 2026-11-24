import { ArrowRight, BookOpen, Library, ListChecks, Printer, Sparkles, Swords } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { MathText } from "@/components/math/math-text";
import { ModuleMarkdownText } from "@/components/module-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EXAM_THEMES, type ExamTheme } from "@/lib/exam-print";
import { applyThemeToRoot } from "@/lib/theme-dom";
import {
  createViewerDeckCopy,
  type SharedBlock,
  type SharedQuestion,
  type SharedResource,
} from "@/lib/share-content";
import { toast } from "sonner";
import { useKnowly } from "@/store/knowly";

function documentTheme(value?: string): ExamTheme {
  return EXAM_THEMES.find((theme) => theme.id === value)?.id ?? "classic";
}

function QuestionList({
  questions,
  showAnswers = true,
}: {
  questions: SharedQuestion[];
  showAnswers?: boolean;
}) {
  if (!questions.length) {
    return <p className="text-sm text-muted-foreground">No questions in this resource.</p>;
  }

  return (
    <ol className="space-y-3">
      {questions.map((question, index) => (
        <li key={question.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 space-y-3">
              <p className="text-sm font-medium leading-6">
                <MathText text={question.question} />
              </p>
              {question.options && (
                <ul className="space-y-1.5 pl-1 text-sm text-muted-foreground">
                  {question.options.map((option, optionIndex) => (
                    <li key={`${optionIndex}-${option}`} className="flex gap-2">
                      <span className="shrink-0">{String.fromCharCode(65 + optionIndex)}.</span>
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
                    <div key={`${pairIndex}-${pair.left}`} className="rounded-lg bg-muted/40 p-2">
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
                      <li key={`${itemIndex}-${item}`} className="rounded-lg bg-muted/40 p-2">
                        {item}
                      </li>
                    ))}
                  </ol>
                  <ol className="space-y-1.5">
                    {question.matchingRight.map((item, itemIndex) => (
                      <li key={`${itemIndex}-${item}`} className="rounded-lg bg-muted/40 p-2">
                        {String.fromCharCode(65 + itemIndex)}. {item}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {showAnswers && question.answer && (
                <details className="shared-answer-details rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <summary className="cursor-pointer font-medium">Show answer</summary>
                  <div className="mt-2 space-y-2 text-muted-foreground">
                    <p className="whitespace-pre-wrap">{question.answer}</p>
                    {question.explanation && (
                      <p className="border-t border-border pt-2">{question.explanation}</p>
                    )}
                  </div>
                </details>
              )}
              {question.concept && (
                <Badge variant="outline" className="text-[10px]">
                  {question.concept}
                </Badge>
              )}
            </div>
          </div>
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

function useSystemThemeForSharedView() {
  const { state } = useKnowly();
  const settings = useRef(state.settings);
  settings.current = state.settings;

  useEffect(() => {
    const root = document.documentElement;
    const preference = window.matchMedia("(prefers-color-scheme: dark)");
    const applySystemTheme = () => {
      root.classList.toggle("dark", preference.matches);
      root.classList.toggle("light", !preference.matches);
    };

    applySystemTheme();
    preference.addEventListener("change", applySystemTheme);
    return () => {
      preference.removeEventListener("change", applySystemTheme);
      applyThemeToRoot(settings.current);
    };
  }, []);
}

function SharedResourceSidebar({
  resource,
  shareId,
}: {
  resource: SharedResource;
  shareId: string;
}) {
  const { state, hydrated, addDeck } = useKnowly();
  const navigate = useNavigate();
  const isDeck = resource.resourceType === "deck";
  const hasQuestions = Boolean(resource.payload.questions?.length);

  const ensureLocalDeck = () => {
    const id = `shared-${shareId}`;
    if (state.decks.some((deck) => deck.id === id)) return { id, created: false };

    const copy = createViewerDeckCopy(resource, id);
    if (!copy.ok) {
      toast.error("This shared deck couldn't be opened for practice.", {
        description: copy.error,
      });
      return null;
    }

    addDeck(copy.deck);
    return { id, created: true };
  };

  const openDeckRoute = (destination: "study" | "quiz" | "arena") => {
    const localDeck = ensureLocalDeck();
    if (!localDeck) return;
    const { id: deckId, created } = localDeck;
    if (created) toast.success("A practice copy was added to your library.");

    if (destination === "study") {
      navigate({
        to: "/study/$deckId",
        params: { deckId },
        search: { part: undefined, stageId: undefined, activityId: undefined },
      });
    } else if (destination === "arena") {
      navigate({ to: "/arena/$deckId", params: { deckId } });
    } else {
      navigate({ to: "/quiz", search: { deckId } });
    }
  };

  const saveDeck = () => {
    const localDeck = ensureLocalDeck();
    if (localDeck?.created) {
      toast.success("A practice copy was added to your library.");
    } else if (localDeck) {
      toast.info("This shared deck is already in your library.");
    }
  };

  const deckActions = [
    { label: "Study path", icon: BookOpen, action: () => openDeckRoute("study") },
    { label: "Practice quiz", icon: ListChecks, action: () => openDeckRoute("quiz") },
    { label: "Arena mode", icon: Swords, action: () => openDeckRoute("arena") },
  ];

  return (
    <aside className="shared-resource-sidebar flex w-full shrink-0 flex-col border-b-[3px] border-sidebar-border bg-sidebar px-4 py-4 text-sidebar-foreground lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r-[3px] lg:px-5 lg:py-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border-2 border-border bg-background text-primary shadow-[2px_2px_0_var(--border)]">
            <BookOpen className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-bold leading-tight">Knowly</p>
            <p className="text-xs text-muted-foreground">Shared learning</p>
          </div>
        </div>
        <Button asChild size="sm" className="shrink-0 rounded-xl lg:hidden">
          <Link to="/login">
            Sign up <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <nav
        aria-label="Shared resource actions"
        className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:flex-col lg:overflow-visible lg:pb-0"
      >
        {isDeck && (
          <>
            <Button
              type="button"
              variant="outline"
              className="shrink-0 justify-start gap-2 rounded-xl lg:w-full"
              onClick={saveDeck}
              disabled={!hydrated || !hasQuestions}
            >
              <Library className="size-4" />
              Add to my library
            </Button>
            {deckActions.map(({ label, icon: Icon, action }) => (
              <Button
                key={label}
                type="button"
                variant="ghost"
                className="shrink-0 justify-start gap-2 rounded-xl lg:w-full"
                onClick={action}
                disabled={!hydrated || !hasQuestions}
              >
                <Icon className="size-4" />
                {label}
              </Button>
            ))}
          </>
        )}
        <Button
          type="button"
          variant={isDeck ? "ghost" : "outline"}
          className="shrink-0 justify-start gap-2 rounded-xl lg:w-full"
          onClick={() => window.print()}
        >
          <Printer className="size-4" />
          {isDeck ? "Print deck" : "Print resource"}
        </Button>
      </nav>

      {isDeck && (
        <p className="mt-3 hidden text-xs leading-5 text-muted-foreground lg:block">
          Practice uses your own copy. The shared Deck stays unchanged.
        </p>
      )}

      <div className="shared-resource-signup mt-auto hidden rounded-2xl border-2 border-border bg-background p-4 shadow-[3px_3px_0_var(--border)] lg:block">
        <Badge variant="outline" className="gap-1">
          <Sparkles className="size-3" /> Keep learning
        </Badge>
        <p className="mt-3 font-semibold">Make Knowly yours</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Create an account to keep your library and learning progress in sync.
        </p>
        <Button asChild className="mt-4 w-full rounded-xl">
          <Link to="/login">
            Create a free account <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </aside>
  );
}

export function SharedResourceView({
  resource,
  shareId,
}: {
  resource: SharedResource;
  shareId: string;
}) {
  useSystemThemeForSharedView();
  const { payload } = resource;
  const theme = documentTheme(payload.theme);
  const isPrintExam = payload.resourceType === "print_exam";
  const showExamAnswers = payload.examDetails?.includeAnswerKey ?? true;
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
    <main className="min-h-screen bg-background text-foreground">
      <div className="shared-resource-layout flex min-h-screen flex-col lg:flex-row">
        <SharedResourceSidebar resource={resource} shareId={shareId} />
        <div className="shared-resource-reader-shell min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <article className="shared-resource-article mx-auto max-w-5xl overflow-hidden rounded-[28px] border-2 border-border bg-card shadow-[5px_5px_0_var(--border)]">
            <header className="shared-resource-header border-b-2 border-border bg-muted/20 p-5 sm:p-9">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Knowly · Shared view
                  </span>
                  <Badge variant="outline">
                    {payload.resourceType === "deck" ? "Shared deck" : "View only"}
                  </Badge>
                </div>
              </div>
              <div className="mt-7">
                {payload.subject && (
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {payload.subject}
                  </p>
                )}
                <h1 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                  {resource.title}
                </h1>
                {payload.description && (
                  <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {payload.description}
                  </p>
                )}
              </div>
            </header>

            <div className="space-y-8 p-5 sm:p-9">
              {payload.stages?.map((stage, index) => {
                const stageQuestionIds = new Set(
                  stage.activities.flatMap((activity) => activity.questionIds),
                );
                const stageQuestions = (payload.questions ?? []).filter((question) =>
                  stageQuestionIds.has(question.id),
                );
                return (
                  <section key={`${stage.title}-${index}`} className="space-y-4">
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
                    {stageQuestions.length > 0 && <QuestionList questions={stageQuestions} />}
                  </section>
                );
              })}

              {unassignedDeckQuestions.length > 0 && (
                <section className="space-y-4">
                  <h2 className="font-display text-xl font-semibold">Additional practice</h2>
                  <QuestionList questions={unassignedDeckQuestions} />
                </section>
              )}

              {payload.resourceType === "deck" && !payload.stages?.length && payload.questions && (
                <section className="space-y-4">
                  <h2 className="font-display text-xl font-semibold">Questions</h2>
                  <QuestionList questions={payload.questions} />
                </section>
              )}

              {payload.resourceType === "module" && (
                <>
                  {payload.blocks && <ContentBlocks blocks={payload.blocks} theme={theme} />}
                  {payload.questions && (
                    <section className="space-y-4">
                      <h2 className="font-display text-xl font-semibold">Practice</h2>
                      <QuestionList questions={payload.questions} />
                    </section>
                  )}
                </>
              )}

              {payload.resourceType === "course" &&
                payload.modules?.map((courseModule, moduleIndex) => (
                  <section key={`${courseModule.title}-${moduleIndex}`} className="space-y-6">
                    <div className="border-b border-border pb-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                        Unit {moduleIndex + 1}
                      </p>
                      <h2 className="mt-1 font-display text-2xl font-semibold">
                        {courseModule.title}
                      </h2>
                      {courseModule.summary && (
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {courseModule.summary}
                        </p>
                      )}
                      {courseModule.objectives.length > 0 && (
                        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          {courseModule.objectives.map((objective, objectiveIndex) => (
                            <li key={`${objectiveIndex}-${objective}`}>{objective}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {courseModule.lessons.map((lesson, lessonIndex) => (
                      <section key={`${lesson.title}-${lessonIndex}`} className="space-y-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Lesson {lessonIndex + 1}
                            {lesson.estimatedMinutes ? ` · ${lesson.estimatedMinutes} min` : ""}
                          </p>
                          <h3 className="mt-1 font-display text-xl font-semibold">
                            {lesson.title}
                          </h3>
                          {lesson.summary && (
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {lesson.summary}
                            </p>
                          )}
                          {lesson.objectives.length > 0 && (
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                              {lesson.objectives.map((objective, objectiveIndex) => (
                                <li key={`${objectiveIndex}-${objective}`}>{objective}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <ContentBlocks blocks={lesson.blocks} theme={theme} />
                        {lesson.questions.length > 0 && (
                          <QuestionList questions={lesson.questions} />
                        )}
                      </section>
                    ))}
                    {courseModule.quiz && (
                      <section className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                        <h3 className="font-semibold">{courseModule.quiz.title}</h3>
                        <QuestionList questions={courseModule.quiz.questions} />
                      </section>
                    )}
                  </section>
                ))}

              {payload.finalExam && (
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
            <footer className="shared-resource-footer border-t border-border px-5 py-4 text-center text-xs text-muted-foreground sm:px-9">
              Shared from Knowly · The owner controls access to this link
            </footer>
          </article>
        </div>
      </div>
    </main>
  );
}
