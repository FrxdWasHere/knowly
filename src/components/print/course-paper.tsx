import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { EXAM_FONTS, LETTERS, printableAnswer } from "@/lib/exam-print";
import { courseStats, lessonProgress, lessonStats, type CourseStats } from "@/lib/courses";
import { TYPE_LABELS } from "@/lib/answers";
import {
  type Course,
  type CourseAssessment,
  type CourseBlock,
  type CourseLesson,
  type CourseModule,
  type CourseProgress,
  type Deck,
  type Question,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

/**
 * Full "study pack" for one course: cover, modules, lessons (formatted blocks),
 * checkpoints, quizzes, final exam, linked practice and answers.
 * Uses the same white paper style as ExamPaper so the print is clean.
 */
export function CoursePaper({
  course,
  progress,
  decks,
}: {
  course: Course;
  progress: CourseProgress | undefined;
  decks: Deck[];
}) {
  const stats = courseStats(course, progress);
  const printedDecks = new Set<string>();
  const courseDeckEntries = decksForIds(course.linkedDeckIds, decks, printedDecks);
  const font = EXAM_FONTS.find((font) => font.id === "default") ?? EXAM_FONTS[0]!;

  return (
    <div
      className="exam-paper course-paper bg-card p-6 text-[12.5px] leading-relaxed shadow-sm sm:p-8 md:p-10"
      style={{ fontFamily: font.stack }}
    >
      <CourseCover course={course} stats={stats} />

      {course.modules.map((module, moduleIndex) => (
        <PaperModule
          key={module.id}
          module={module}
          moduleIndex={moduleIndex}
          course={course}
          progress={progress}
          decks={decksForIds(module.linkedDeckIds, decks, printedDecks)}
        />
      ))}

      {course.finalExam && course.finalExam.questions.length > 0 && (
        <PaperAssessment course={course} assessment={course.finalExam} kind="final" pageBreak />
      )}

      {courseDeckEntries.length > 0 && (
        <PaperPractice
          course={course}
          title="Course practice"
          entries={courseDeckEntries}
          pageBreak
        />
      )}

      <PaperAnswerKey course={course} decks={decks} printedIds={printedDecks} />
    </div>
  );
}

/* ---------------------------- cover ---------------------------- */

function CourseCover({ course, stats }: { course: Course; stats: CourseStats }) {
  return (
    <section className="pb-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {course.subject}
        {course.level ? ` · ${course.level}` : ""}
      </p>
      <h1 className="mt-2 text-[2em] font-bold leading-tight">{course.title}</h1>
      {course.description && (
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">{course.description}</p>
      )}

      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">{course.modules.length} modules</span>
        <span>{stats.lessons} lessons</span>
        <span>{stats.questions} questions</span>
        {stats.assessments > 0 && <span>{stats.assessments} assessments</span>}
        {course.estimatedMinutes ? <span>{course.estimatedMinutes} minutes</span> : null}
        <span>{stats.percent}% complete</span>
      </div>

      {course.objectives.length > 0 && (
        <div className="mt-6 border-t-2 border-foreground pt-5">
          <h2 className="text-[1.15em] font-bold">What you'll learn</h2>
          <ul className="mt-3 space-y-1.5 leading-6">
            {course.objectives.map((objective) => (
              <li key={objective} className="flex gap-2">
                <span
                  aria-hidden
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground/70"
                />
                {objective}
              </li>
            ))}
          </ul>
        </div>
      )}

      {course.tags.length > 0 && (
        <p className="mt-5 text-[11px] text-muted-foreground">Tags: {course.tags.join(" · ")}</p>
      )}
    </section>
  );
}

/* ---------------------------- module ---------------------------- */

function PaperModule({
  module,
  moduleIndex,
  course,
  progress,
  decks,
}: {
  module: CourseModule;
  moduleIndex: number;
  course: Course;
  progress: CourseProgress | undefined;
  decks: Deck[];
}) {
  const completed = module.lessons.filter(
    (lesson) => lessonProgress(progress, lesson.id).status === "completed",
  ).length;
  const percent = module.lessons.length ? Math.round((completed / module.lessons.length) * 100) : 0;
  const usedLessonDecks = new Set<string>();

  return (
    <PaperSection pageBreak={moduleIndex > 0}>
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Module {moduleIndex + 1} · {module.lessons.length} lessons · {percent}% complete
        </p>
        <h2 className="mt-1.5 text-[1.6em] font-bold leading-snug">{module.title}</h2>
        {module.summary && (
          <p className="mt-2 max-w-3xl leading-7 text-muted-foreground">{module.summary}</p>
        )}

        {module.objectives.length > 0 && (
          <div className="mt-4 border-l-2 border-foreground/30 pl-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Module objectives
            </p>
            <ul className="mt-2 space-y-1 leading-6">
              {module.objectives.map((objective) => (
                <li key={objective}>{objective}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {module.lessons.map((lesson, lessonIndex) => (
        <PaperLesson
          key={lesson.id}
          course={course}
          lesson={lesson}
          lessonIndex={lessonIndex}
          progress={progress}
          decks={decksForIds(lesson.linkedDeckIds, decks, usedLessonDecks)}
        />
      ))}

      {module.quiz && module.quiz.questions.length > 0 && (
        <PaperAssessment course={course} assessment={module.quiz} kind="quiz" />
      )}

      {decks.length > 0 && (
        <PaperPractice course={course} title="Module practice" entries={decks} />
      )}
    </PaperSection>
  );
}

/* ---------------------------- lesson ---------------------------- */

function PaperLesson({
  course,
  lesson,
  lessonIndex,
  progress,
  decks,
}: {
  course: Course;
  lesson: CourseLesson;
  lessonIndex: number;
  progress: CourseProgress | undefined;
  decks: Deck[];
}) {
  const lessonState = lessonProgress(progress, lesson.id);
  const stats = lessonStats(progress, lesson);
  const complete = lessonState.status === "completed";

  return (
    <section className="mt-8">
      <div className="break-inside-avoid">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Lesson {lessonIndex + 1}
          {lesson.estimatedMinutes ? ` · ${lesson.estimatedMinutes} min` : ""} ·{" "}
          {complete ? "Completed" : lessonState.status.replace("-", " ")}
          {stats.percent ? ` · ${stats.percent}% correct` : ""}
        </p>
        <h3 className="mt-1 text-[1.28em] font-semibold leading-snug">{lesson.title}</h3>
        {lesson.summary && (
          <p className="mt-2 max-w-3xl leading-7 text-muted-foreground">{lesson.summary}</p>
        )}
        {lesson.objectives.length > 0 && (
          <ul className="mt-3 space-y-1 text-[0.94em] text-muted-foreground">
            {lesson.objectives.map((objective) => (
              <li key={objective} className="flex gap-2">
                <span
                  aria-hidden
                  className="mt-[0.55rem] size-1 shrink-0 rounded-full bg-foreground/50"
                />
                {objective}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {lesson.blocks.map((block) => (
          <PaperBlock key={block.id} block={block} />
        ))}
      </div>

      {lessonState.notes && (
        <div className="mt-6 border-l-2 border-primary/50 pl-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Lesson notes
          </p>
          <div className="mt-2">
            <PaperMarkdown markdown={lessonState.notes} />
          </div>
        </div>
      )}

      {lesson.questions.length > 0 && (
        <PaperQuestionSet
          course={course}
          title="Check your understanding"
          questions={lesson.questions}
          start={1}
        />
      )}

      {decks.length > 0 && (
        <PaperPractice course={course} title="Lesson practice" entries={decks} />
      )}
    </section>
  );
}

/* ---------------------------- lesson blocks ---------------------------- */

function PaperBlock({ block }: { block: CourseBlock }) {
  switch (block.type) {
    case "divider":
      return <hr className="my-5 border-foreground/25" />;
    case "image":
      return (
        <figure className="text-center">
          {block.url && (
            <img
              src={block.url}
              alt={block.alt ?? ""}
              className="mx-auto max-h-72 rounded-lg border border-foreground/25 object-contain"
            />
          )}
          {block.caption && (
            <figcaption className="mt-2 text-[11px] text-muted-foreground">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
    case "callout":
    case "example": {
      return (
        <div
          className={cn(
            "rounded-xl border px-4 py-3",
            block.type === "example"
              ? "border-foreground/35 bg-foreground/[0.03]"
              : "border-foreground/25 bg-foreground/[0.02]",
          )}
        >
          <p className="text-[12px] font-semibold">
            {block.title || (block.type === "example" ? "Example" : "Note")}
          </p>
          <PaperMarkdown markdown={block.markdown ?? ""} />
        </div>
      );
    }
    case "checkpoint":
      return null;
    default:
      return <PaperMarkdown markdown={block.markdown ?? ""} />;
  }
}

function PaperMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="paper-markdown text-[0.98em] leading-7 text-foreground/90">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}

/* ---------------------------- question section ---------------------------- */

function PaperQuestionSet({
  course,
  title,
  questions,
  titlePrefix,
  start = 1,
}: {
  course: Course;
  title: string;
  questions: Question[];
  titlePrefix?: string;
  start?: number;
}) {
  return (
    <section className="mt-7">
      <div className="border-b border-foreground/40 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {titlePrefix ? `${titlePrefix} · ` : ""}
          {course.subject}
        </p>
        <h4 className="mt-1 text-[1.12em] font-bold">{title}</h4>
      </div>

      <ol className="mt-4 space-y-5">
        {questions.map((question, index) => (
          <li key={question.id} className="exam-question">
            <PaperQuestion question={question} number={start + index} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function PaperQuestion({
  question,
  number,
  context,
}: {
  question: Question;
  number: number;
  context?: string;
}) {
  const difficulty = question.difficulty ? `${question.difficulty}` : "";
  return (
    <div className="break-inside-avoid">
      <div className="flex gap-3">
        <span className="mt-0.5 min-w-0 shrink-0 font-semibold">{number}.</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-6">{question.question}</p>
          <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <span>{TYPE_LABELS[question.type]}</span>
            {difficulty && <span>{difficulty}</span>}
            {question.concept && <span>{question.concept}</span>}
            {context && <span>{context}</span>}
          </p>
          <PaperQuestionBody question={question} />
        </div>
      </div>
    </div>
  );
}

function PaperQuestionBody({ question }: { question: Question }) {
  switch (question.type) {
    case "multiple-choice":
      return (
        <ol className="mt-2 space-y-1">
          {(question.options ?? []).map((option, index) => (
            <li key={`${option}-${index}`} className="flex gap-2">
              <span className="font-semibold">{LETTERS[index] ?? index + 1}.</span>
              {option}
            </li>
          ))}
        </ol>
      );
    case "true-false":
      return (
        <p className="mt-2">
          <span className="mr-6">☐ True</span>
          <span>☐ False</span>
        </p>
      );
    case "ordering":
      return (
        <div className="mt-2 space-y-1">
          {(question.items ?? []).map((item, index) => (
            <p key={`${item}-${index}`} className="flex gap-3">
              <span className="w-5 shrink-0 border-b border-foreground/40">&nbsp;</span>
              {item}
            </p>
          ))}
        </div>
      );
    case "matching": {
      const pairs = question.pairs ?? [];
      return (
        <div className="mt-2 grid gap-6 sm:grid-cols-2 print:grid-cols-2">
          <div className="space-y-1">
            {pairs.map((pair, index) => (
              <p key={`${pair.left}-${index}`}>
                <span className="mr-2 inline-block w-5 border-b border-foreground/40">&nbsp;</span>
                {pair.left}
              </p>
            ))}
          </div>
          <div className="space-y-1">
            {pairs.map((pair, index) => (
              <p key={`${pair.right}-${index}`}>
                <span className="mr-2 font-semibold">{LETTERS[index] ?? index + 1}.</span>
                {pair.right}
              </p>
            ))}
          </div>
        </div>
      );
    }
    case "word-bank":
      return (
        <div className="mt-2">
          {!!question.wordBank?.length && (
            <p className="border border-foreground/40 px-3 py-2 text-[10.5px] leading-5 text-muted-foreground">
              <span className="font-semibold text-foreground">Word bank: </span>
              {question.wordBank.join(" · ")}
            </p>
          )}
          <PaperLines count={Math.max(1, question.blanks?.length ?? 1)} />
        </div>
      );
    case "fill-blank":
    case "short-answer":
    case "flashcard":
    default:
      return <PaperLines count={question.type === "flashcard" ? 2 : 3} />;
  }
}

function PaperLines({ count }: { count: number }) {
  return (
    <div className="mt-2 space-y-4">
      {Array.from({ length: Math.max(1, count) }).map((_, index) => (
        <div key={index} className="border-b border-foreground/25" />
      ))}
    </div>
  );
}

/* ---------------------------- assessments / practice ---------------------------- */

function PaperAssessment({
  course,
  assessment,
  kind,
  pageBreak = false,
}: {
  course: Course;
  assessment: CourseAssessment;
  kind: "quiz" | "final";
  pageBreak?: boolean;
}) {
  return (
    <PaperSection pageBreak={pageBreak}>
      <PaperQuestionSet
        course={course}
        title={assessment.title}
        titlePrefix={kind === "final" ? "Final exam" : "Module quiz"}
        questions={assessment.questions}
      />
      <p className="mt-4 text-[11px] text-muted-foreground">
        Pass mark: {assessment.passingScore}%
        {assessment.timeLimitMinutes ? ` · Time limit: ${assessment.timeLimitMinutes} min` : ""}
      </p>
    </PaperSection>
  );
}

function PaperPractice({
  course,
  title,
  entries,
  pageBreak = false,
}: {
  course: Course;
  title: string;
  entries: Deck[];
  pageBreak?: boolean;
}) {
  return (
    <PaperSection pageBreak={pageBreak}>
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {course.title} · {title}
        </p>
        <h2 className="mt-1 text-[1.4em] font-bold">Linked practice decks</h2>
      </section>

      {entries.map((deck, index) => (
        <DeckGroup key={deck.id} deck={deck} deckIndex={index + 1} course={course} />
      ))}
    </PaperSection>
  );
}

function DeckGroup({ deck, deckIndex, course }: { deck: Deck; deckIndex: number; course: Course }) {
  return (
    <section className="mt-7">
      <div className="break-inside-avoid">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Practice deck {deckIndex} · {deck.subject}
        </p>
        <h3 className="mt-1 text-[1.22em] font-semibold">{deck.title}</h3>
        {deck.description && (
          <p className="mt-1.5 text-[0.94em] leading-6 text-muted-foreground">{deck.description}</p>
        )}
      </div>
      <ol className="mt-3 space-y-4">
        {deck.questions.map((question, index) => (
          <li key={question.id} className="exam-question">
            <PaperQuestion question={question} number={index + 1} context={deck.title} />
          </li>
        ))}
      </ol>
      {deck.tags.length > 0 && (
        <p className="mt-2 text-[10px] text-muted-foreground">Tags: {deck.tags.join(" · ")}</p>
      )}
    </section>
  );
}

/* ---------------------------- answer key ---------------------------- */

function PaperAnswerKey({
  course,
  decks,
  printedIds,
}: {
  course: Course;
  decks: Deck[];
  printedIds: Set<string>;
}) {
  return (
    <section className="exam-answer-key mt-10 border-t-2 border-foreground pt-5">
      <h2 className="text-[1.4em] font-bold">Answer key · {course.title}</h2>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Use it with the quiz page or while checking your checkpoints.
      </p>

      {course.modules.map((module, moduleIndex) => (
        <div key={module.id} className="mt-6">
          <h3 className="text-[1.08em] font-semibold">
            Module {moduleIndex + 1} · {module.title}
          </h3>

          {module.lessons.map((lesson) => {
            if (!lesson.questions.length) return null;
            return (
              <div key={lesson.id} className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Lesson · {lesson.title}
                </p>
                <ol className="mt-2 space-y-1 text-[0.94em]">
                  {lesson.questions.map((question, questionIndex) => (
                    <li key={question.id} className="break-inside-avoid">
                      <span className="font-semibold">{questionIndex + 1}.</span>{" "}
                      {printableAnswer(question)}
                      {question.explanation ? (
                        <span className="italic text-muted-foreground">
                          {" "}
                          — {question.explanation}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}

          {module.quiz?.questions.length ? (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Module quiz · {module.quiz.title}
              </p>
              <ol className="mt-2 space-y-1 text-[0.94em]">
                {module.quiz.questions.map((question, questionIndex) => (
                  <li key={question.id} className="break-inside-avoid">
                    <span className="font-semibold">{questionIndex + 1}.</span>{" "}
                    {printableAnswer(question)}
                    {question.explanation ? (
                      <span className="italic text-muted-foreground">
                        {" "}
                        — {question.explanation}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {module.linkedDeckIds.length > 0 && (
            <PaperDeckAnswers
              title="Module practice answers"
              decks={decksForIds(module.linkedDeckIds, decks, printedIds)}
            />
          )}
        </div>
      ))}

      {course.finalExam?.questions.length ? (
        <div className="mt-7">
          <h3 className="text-[1.08em] font-semibold">Final exam · {course.finalExam.title}</h3>
          <ol className="mt-2 space-y-1 text-[0.94em]">
            {course.finalExam.questions.map((question, questionIndex) => (
              <li key={question.id} className="break-inside-avoid">
                <span className="font-semibold">{questionIndex + 1}.</span>{" "}
                {printableAnswer(question)}
                {question.explanation ? (
                  <span className="italic text-muted-foreground"> — {question.explanation}</span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {course.linkedDeckIds.length > 0 && (
        <PaperDeckAnswers
          title="Course practice answers"
          decks={decksForIds(course.linkedDeckIds, decks, printedIds)}
        />
      )}
    </section>
  );
}

function PaperDeckAnswers({ title, decks }: { title: string; decks: Deck[] }) {
  return (
    <section className="mt-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </p>
      {decks.map((deck) => (
        <div key={deck.id} className="mt-3">
          <p className="text-[11px] font-semibold">{deck.title}</p>
          <ol className="mt-1 space-y-1 text-[0.94em]">
            {deck.questions.map((question, index) => (
              <li key={question.id} className="break-inside-avoid">
                <span className="font-semibold">{index + 1}.</span> {printableAnswer(question)}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}

/* ---------------------------- utils ---------------------------- */

function PaperSection({ pageBreak, children }: { pageBreak?: boolean; children: ReactNode }) {
  return (
    <section className={cn("mt-10", pageBreak && "print:break-before-page")}>{children}</section>
  );
}

function decksForIds(ids: string[], decks: Deck[], used: Set<string>): Deck[] {
  const fresh: Deck[] = [];
  for (const id of ids) {
    if (used.has(id)) continue;
    const deck = decks.find((deck) => deck.id === id);
    if (!deck || !deck.questions.length) continue;
    fresh.push(deck);
    used.add(deck.id);
  }
  return fresh;
}
