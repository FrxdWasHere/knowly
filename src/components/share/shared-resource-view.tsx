import { BookOpen, Printer } from "lucide-react";
import { MathText } from "@/components/math/math-text";
import { ModuleMarkdownText } from "@/components/module-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EXAM_THEMES, type ExamTheme } from "@/lib/exam-print";
import { documentThemeStyle } from "@/lib/document-themes";
import type { SharedBlock, SharedQuestion, SharedResource } from "@/lib/share-content";

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
                <details className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
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

export function SharedResourceView({ resource }: { resource: SharedResource }) {
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
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-12">
      <article
        className="document-reading mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
        data-document-theme={theme}
        style={documentThemeStyle(theme)}
      >
        <header className="border-b border-border bg-muted/20 p-5 sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Knowly · Shared view
              </span>
              <Badge variant="outline">View only</Badge>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </Button>
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
                  <h2 className="mt-1 font-display text-2xl font-semibold">{courseModule.title}</h2>
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
                      <h3 className="mt-1 font-display text-xl font-semibold">{lesson.title}</h3>
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
                    {lesson.questions.length > 0 && <QuestionList questions={lesson.questions} />}
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
        <footer className="border-t border-border px-5 py-4 text-center text-xs text-muted-foreground sm:px-9">
          Shared from Knowly · The owner controls access to this link
        </footer>
      </article>
    </main>
  );
}
