import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LETTERS, printableAnswer } from "@/lib/exam-print";
import { courseStats, decksForCourse, lessonProgress, type CourseStats } from "@/lib/courses";
import { TYPE_LABELS } from "@/lib/answers";
import {
  type Course,
  type CourseBlock,
  type CourseLesson,
  type CourseModule,
  type CourseProgress,
  type Deck,
  type Question,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/* --------------------------------------------------------------------- *
 * Print options + paper sizes
 * --------------------------------------------------------------------- */

export type PaperSizeId = "a4" | "letter" | "b5" | "a5";
export type PaperOrientation = "portrait" | "landscape";
export type PaperFontScale = "small" | "normal" | "large";
export type PaperMarginId = "narrow" | "normal" | "wide";
export type PaperTypeface = "sans" | "serif";
export type PaperSpacing = "compact" | "normal" | "relaxed";
export type PaperBreaks = "flow" | "modules" | "lessons";
export type PaperFooterStyle = "count" | "of" | "plain" | "none";
export type PaperCoverStyle = "book" | "classic";

export interface CoursePrintOptions {
  paper: PaperSizeId;
  orientation: PaperOrientation;
  margins: PaperMarginId;
  fontScale: PaperFontScale;
  typeface: PaperTypeface;
  spacing: PaperSpacing;
  breaks: PaperBreaks;
  footerStyle: PaperFooterStyle;
  includeCover: boolean;
  coverStyle: PaperCoverStyle;
  includeToc: boolean;
  includeAnswerKey: boolean;
  includeNotes: boolean;
  runningHeader: boolean;
}

export const defaultCoursePrintOptions: CoursePrintOptions = {
  paper: "a4",
  orientation: "portrait",
  margins: "normal",
  fontScale: "normal",
  typeface: "sans",
  spacing: "normal",
  breaks: "modules",
  footerStyle: "count",
  includeCover: true,
  coverStyle: "book",
  includeToc: true,
  includeAnswerKey: true,
  includeNotes: true,
  runningHeader: true,
};

export const STORAGE_KEY_COURSE_PRINT = "knowly.course-print.v1";

export const PAPER_SIZE_OPTIONS: { id: PaperSizeId; label: string; sub: string }[] = [
  { id: "a4", label: "A4", sub: "210 × 297 mm" },
  { id: "letter", label: "US Letter", sub: "8.5 × 11 in" },
  { id: "b5", label: "B5", sub: "176 × 250 mm" },
  { id: "a5", label: "A5", sub: "148 × 210 mm" },
];

/** Sheet size in CSS px at 96dpi — matches the injected @page rules exactly. */
const PAPER_DIMS: Record<PaperSizeId, { w: number; h: number }> = {
  a4: { w: 794, h: 1123 },
  letter: { w: 816, h: 1056 },
  b5: { w: 665, h: 945 },
  a5: { w: 559, h: 794 },
};

export function getPaperDims(paper: PaperSizeId, orientation: PaperOrientation) {
  const size = PAPER_DIMS[paper];
  return orientation === "landscape"
    ? { width: size.h, height: size.w }
    : { width: size.w, height: size.h };
}

export const MARGIN_OPTIONS: { id: PaperMarginId; label: string; sub: string }[] = [
  { id: "narrow", label: "Narrow", sub: "≈12 mm" },
  { id: "normal", label: "Normal", sub: "≈18 mm" },
  { id: "wide", label: "Wide", sub: "≈25 mm" },
];

/** Padding as a share of the sheet; used by preview, print and the DOCX export. */
const MARGIN_FACTORS: Record<PaperMarginId, { side: number; top: number; bottom: number }> = {
  narrow: { side: 0.055, top: 0.042, bottom: 0.055 },
  normal: { side: 0.088, top: 0.06, bottom: 0.075 },
  wide: { side: 0.115, top: 0.078, bottom: 0.095 },
};

export const SPACING_OPTIONS: { id: PaperSpacing; label: string }[] = [
  { id: "compact", label: "Compact" },
  { id: "normal", label: "Normal" },
  { id: "relaxed", label: "Relaxed" },
];

const SPACING_FACTORS: Record<PaperSpacing, number> = {
  compact: 0.9,
  normal: 1,
  relaxed: 1.14,
};

export const FONT_SCALE_OPTIONS: { id: PaperFontScale; label: string }[] = [
  { id: "small", label: "Small" },
  { id: "normal", label: "Normal" },
  { id: "large", label: "Large" },
];

export const TYPEFACE_OPTIONS: { id: PaperTypeface; label: string; sub: string; stack: string }[] =
  [
    {
      id: "sans",
      label: "Modern",
      sub: "Clean sans",
      stack: 'var(--font-sans, "Segoe UI"), Arial, sans-serif',
    },
    {
      id: "serif",
      label: "Classic",
      sub: "Book serif",
      stack: 'Georgia, Cambria, "Palatino Linotype", "Times New Roman", serif',
    },
  ];

export const BREAK_OPTIONS: { id: PaperBreaks; label: string; sub: string }[] = [
  { id: "flow", label: "Flow", sub: "Fill every page" },
  { id: "modules", label: "New page · modules", sub: "Each module starts fresh" },
  { id: "lessons", label: "New page · lessons", sub: "Each lesson starts fresh" },
];

export const FOOTER_OPTIONS: { id: PaperFooterStyle; label: string; sub: string }[] = [
  { id: "count", label: "3 / 9", sub: "page · count" },
  { id: "of", label: "Page 3 of 9", sub: "formal" },
  { id: "plain", label: "3", sub: "minimal" },
  { id: "none", label: "None", sub: "no footer" },
];

export const COVER_OPTIONS: { id: PaperCoverStyle; label: string; sub: string }[] = [
  { id: "book", label: "Book", sub: "Full-color cover" },
  { id: "classic", label: "Classic", sub: "White with accents" },
];

const SERIF_HEADINGS_STACK = '"Book Antiqua", "Palatino Linotype", Georgia, serif';

/* --------------------------------------------------------------------- *
 * Content units — the atomic blocks the paginator flows across pages.
 * --------------------------------------------------------------------- */

interface TocRowData {
  label: string;
  meta?: string;
  indent?: boolean;
  strong?: boolean;
  tocKey?: string;
}

type UnitData =
  | { kind: "toc-header" }
  | { kind: "toc-row"; row: TocRowData }
  | { kind: "course-objectives"; items: string[] }
  | { kind: "module-header"; module: CourseModule; index: number }
  | { kind: "objectives"; title: string; items: string[] }
  | { kind: "lesson-header"; lesson: CourseLesson; index: number }
  | { kind: "markdown"; text: string }
  | { kind: "callout"; block: CourseBlock }
  | { kind: "image"; block: CourseBlock }
  | { kind: "divider" }
  | { kind: "notes"; text: string }
  | { kind: "section-header"; label: string }
  | { kind: "question"; question: Question; number: number; context?: string }
  | { kind: "assessment-header"; prefix: string; title: string; meta: string }
  | { kind: "deck-header"; deck: Deck; index: number }
  | { kind: "answer-header" }
  | { kind: "answer-sub"; label: string; tone: "one" | "two" }
  | { kind: "answer-item"; label: string; value: string; explanation?: string };

interface PaperUnit {
  id: string;
  data: UnitData;
  tocKey?: string;
}

const UNIT_SPACE: Partial<Record<UnitData["kind"], number>> = {
  "toc-header": 0,
  "toc-row": 6,
  "course-objectives": 18,
  "module-header": 30,
  objectives: 12,
  "lesson-header": 28,
  markdown: 8,
  callout: 10,
  image: 10,
  divider: 14,
  notes: 18,
  "section-header": 24,
  question: 14,
  "assessment-header": 28,
  "deck-header": 26,
  "answer-header": 28,
  "answer-sub": 14,
  "answer-item": 6,
};

function markdownChunks(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function buildUnits(
  course: Course,
  progress: CourseProgress | undefined,
  decks: Deck[],
  options: CoursePrintOptions,
): PaperUnit[] {
  const units: PaperUnit[] = [];
  let uid = 0;
  const push = (data: UnitData, tocKey?: string) => {
    units.push({ id: `unit-${++uid}`, data, tocKey });
  };

  /* ---------------------------- TOC ---------------------------- */
  if (options.includeToc) {
    push({ kind: "toc-header" });
    course.modules.forEach((module, moduleIndex) => {
      push({
        kind: "toc-row",
        row: {
          label: `${moduleIndex + 1}. ${module.title}`,
          meta: `${module.lessons.length} lessons`,
          strong: true,
          tocKey: `module:${module.id}`,
        },
      });
      module.lessons.forEach((lesson, lessonIndex) => {
        push({
          kind: "toc-row",
          row: {
            label: lesson.title,
            meta: lesson.estimatedMinutes ? `${lesson.estimatedMinutes} min` : undefined,
            indent: true,
            tocKey: `lesson:${lesson.id}`,
          },
        });
      });
      if (module.quiz?.questions.length) {
        push({
          kind: "toc-row",
          row: {
            label: module.quiz.title,
            meta: `${module.quiz.questions.length} questions`,
            indent: true,
            tocKey: `quiz:${module.quiz.id}`,
          },
        });
      }
    });
    if (course.finalExam?.questions.length) {
      push({
        kind: "toc-row",
        row: {
          label: `Final exam · ${course.finalExam.title}`,
          meta: `${course.finalExam.questions.length} questions`,
          strong: true,
          tocKey: `quiz:${course.finalExam.id}`,
        },
      });
    }
    const practiceDeckCount = decksForCourse(course, decks).filter(
      (deck) => deck.questions.length > 0,
    ).length;
    if (practiceDeckCount > 0) {
      push({
        kind: "toc-row",
        row: {
          label: "Linked practice decks",
          meta: `${practiceDeckCount} decks`,
          strong: true,
          tocKey: "practice",
        },
      });
    }
    if (options.includeAnswerKey) {
      push({
        kind: "toc-row",
        row: { label: "Answer key", strong: true, tocKey: "answer-key" },
      });
    }
    if (course.objectives.length > 0) {
      push({ kind: "course-objectives", items: course.objectives });
    }
  }

  /* ---------------------------- helpers ---------------------------- */
  const deckById = new Map(decks.map((deck) => [deck.id, deck]));
  const printedDeckIds = new Set<string>();
  let deckIndex = 0;
  let practiceKeyAssigned = false;

  const pushDeckGroup = (ids: string[]) => {
    for (const id of ids) {
      const deck = deckById.get(id);
      if (!deck || !deck.questions.length || printedDeckIds.has(id)) continue;
      printedDeckIds.add(id);
      deckIndex += 1;
      let tocKey: string | undefined;
      if (!practiceKeyAssigned) {
        tocKey = "practice";
        practiceKeyAssigned = true;
      }
      push({ kind: "deck-header", deck, index: deckIndex }, tocKey);
      deck.questions.forEach((question, questionIndex) =>
        push({
          kind: "question",
          question,
          number: questionIndex + 1,
          context: deck.title,
        }),
      );
    }
  };

  const pushQuestionSet = (label: string, questions: Question[]) => {
    if (!questions.length) return;
    push({ kind: "section-header", label });
    questions.forEach((question, questionIndex) =>
      push({ kind: "question", question, number: questionIndex + 1, context: label }),
    );
  };

  const answerDeckIds = new Set<string>();
  const pushAnswerDeck = (ids: string[]) => {
    const fresh = ids
      .map((id) => deckById.get(id))
      .filter((deck): deck is Deck => Boolean(deck) && !answerDeckIds.has(deck!.id));
    for (const deck of fresh) {
      answerDeckIds.add(deck.id);
      push({ kind: "answer-sub", label: deck.title, tone: "two" });
      deck.questions.forEach((question, questionIndex) =>
        push({
          kind: "answer-item",
          label: `${questionIndex + 1}.`,
          value: printableAnswer(question),
          explanation: question.explanation,
        }),
      );
    }
  };

  /* ---------------------------- modules ---------------------------- */
  course.modules.forEach((module, moduleIndex) => {
    const completed = module.lessons.filter(
      (lesson) => lessonProgress(progress, lesson.id).status === "completed",
    ).length;
    const percent = module.lessons.length
      ? Math.round((completed / module.lessons.length) * 100)
      : 0;

    push(
      {
        kind: "module-header",
        module,
        index: moduleIndex,
        // extra percent is carried on the data below
      },
      `module:${module.id}`,
    );
    // module percent is rendered from progress inside ModuleHeader via module data; recompute there
    if (module.summary) push({ kind: "markdown", text: module.summary });
    if (module.objectives.length > 0) {
      push({ kind: "objectives", title: "Module objectives", items: module.objectives });
    }

    module.lessons.forEach((lesson, lessonIndex) => {
      push({ kind: "lesson-header", lesson, index: lessonIndex }, `lesson:${lesson.id}`);
      for (const block of lesson.blocks) {
        if (block.type === "checkpoint") continue;
        if (block.type === "markdown") {
          for (const chunk of markdownChunks(block.markdown ?? "")) {
            push({ kind: "markdown", text: chunk });
          }
        } else if (block.type === "image") {
          push({ kind: "image", block });
        } else if (block.type === "callout" || block.type === "example") {
          push({ kind: "callout", block });
        } else if (block.type === "divider") {
          push({ kind: "divider" });
        }
      }

      const lessonState = lessonProgress(progress, lesson.id);
      if (lessonState.notes && options.includeNotes)
        push({ kind: "notes", text: lessonState.notes });
      pushQuestionSet("Check your understanding", lesson.questions);
      pushDeckGroup(lesson.linkedDeckIds);
    });

    if (module.quiz?.questions.length) {
      push(
        {
          kind: "assessment-header",
          prefix: "Module quiz",
          title: module.quiz.title,
          meta: `${module.quiz.questions.length} questions · pass at ${module.quiz.passingScore}%${
            module.quiz.timeLimitMinutes ? ` · ${module.quiz.timeLimitMinutes} min` : ""
          }`,
        },
        `quiz:${module.quiz.id}`,
      );
      module.quiz.questions.forEach((question, questionIndex) =>
        push({ kind: "question", question, number: questionIndex + 1 }),
      );
    }

    pushDeckGroup(module.linkedDeckIds);
  });

  /* ---------------------------- final exam ---------------------------- */
  if (course.finalExam?.questions.length) {
    push(
      {
        kind: "assessment-header",
        prefix: "Final exam",
        title: course.finalExam.title,
        meta: `${course.finalExam.questions.length} questions · pass at ${course.finalExam.passingScore}%${
          course.finalExam.timeLimitMinutes ? ` · ${course.finalExam.timeLimitMinutes} min` : ""
        }`,
      },
      `quiz:${course.finalExam.id}`,
    );
    course.finalExam.questions.forEach((question, questionIndex) =>
      push({ kind: "question", question, number: questionIndex + 1 }),
    );
  }

  /* ---------------------------- course practice ---------------------------- */
  pushDeckGroup(course.linkedDeckIds);

  /* ---------------------------- answer key ---------------------------- */
  if (options.includeAnswerKey) {
    push({ kind: "answer-header" }, "answer-key");

    course.modules.forEach((module, moduleIndex) => {
      push({
        kind: "answer-sub",
        label: `Module ${moduleIndex + 1} · ${module.title}`,
        tone: "one",
      });
      module.lessons.forEach((lesson) => {
        if (!lesson.questions.length) return;
        push({ kind: "answer-sub", label: `Lesson · ${lesson.title}`, tone: "two" });
        lesson.questions.forEach((question, questionIndex) =>
          push({
            kind: "answer-item",
            label: `${questionIndex + 1}.`,
            value: printableAnswer(question),
            explanation: question.explanation,
          }),
        );
      });
      if (module.quiz?.questions.length) {
        push({ kind: "answer-sub", label: `Module quiz · ${module.quiz.title}`, tone: "two" });
        module.quiz.questions.forEach((question, questionIndex) =>
          push({
            kind: "answer-item",
            label: `${questionIndex + 1}.`,
            value: printableAnswer(question),
            explanation: question.explanation,
          }),
        );
      }
      pushAnswerDeck(module.linkedDeckIds);
    });

    if (course.finalExam?.questions.length) {
      push({ kind: "answer-sub", label: `Final exam · ${course.finalExam.title}`, tone: "one" });
      course.finalExam.questions.forEach((question, questionIndex) =>
        push({
          kind: "answer-item",
          label: `${questionIndex + 1}.`,
          value: printableAnswer(question),
          explanation: question.explanation,
        }),
      );
    }
    pushAnswerDeck(course.linkedDeckIds);
  }

  return units;
}

/* --------------------------------------------------------------------- *
 * CoursePaper — measured paginator + paper preview + print stylesheet.
 * --------------------------------------------------------------------- */

const INK = "#111827";
const INK_MUTED = "#6b7280";

export function CoursePaper({
  course,
  progress,
  decks,
  options,
}: {
  course: Course;
  progress: CourseProgress | undefined;
  decks: Deck[];
  options: CoursePrintOptions;
}) {
  const dims = useMemo(
    () => getPaperDims(options.paper, options.orientation),
    [options.paper, options.orientation],
  );
  const factors = MARGIN_FACTORS[options.margins];
  const padX = Math.round(dims.width * factors.side);
  const padTop = Math.round(dims.height * factors.top);
  const padBottom = Math.round(dims.height * factors.bottom);
  const contentWidth = Math.max(200, dims.width - padX * 2);
  const contentHeight = Math.max(200, dims.height - padTop - padBottom);
  const fontPx = options.fontScale === "small" ? 11.5 : options.fontScale === "large" ? 13.5 : 12.5;
  const lineHeight = 1.55 * SPACING_FACTORS[options.spacing];
  const fontFamily = TYPEFACE_OPTIONS.find((t) => t.id === options.typeface)?.stack;

  const units = useMemo(
    () => buildUnits(course, progress, decks, options),
    [course, progress, decks, options],
  );

  const measureRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<{
    pages: PaperUnit[][];
    toc: Record<string, number>;
  } | null>(null);
  const [stageWidth, setStageWidth] = useState<number | null>(null);

  /* paginate by measuring the hidden flow */
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      const host = measureRef.current;
      if (!host || cancelled) return;
      const slots = Array.from(host.children) as HTMLElement[];
      if (!slots.length) {
        setLayout({ pages: [], toc: {} });
        return;
      }
      const heights = slots.map((slot) => slot.getBoundingClientRect().height);
      const pages: PaperUnit[][] = [];
      const toc: Record<string, number> = {};
      let current: PaperUnit[] = [];
      let cursor = 0;
      let index = 0;
      // the answer key and the final exam are separate "book parts" — always new pages
      const offset = options.includeCover ? 2 : 1;
      for (const unit of units) {
        const height = heights[index++] ?? 0;
        const forced =
          unit.data.kind === "answer-header" ||
          (unit.data.kind === "assessment-header" && unit.data.prefix === "Final exam");
        const soft =
          options.breaks === "lessons"
            ? unit.data.kind === "module-header" || unit.data.kind === "lesson-header"
            : options.breaks === "modules"
              ? unit.data.kind === "module-header"
              : false;
        if (current.length > 0 && (forced || soft || cursor + height > contentHeight)) {
          pages.push(current);
          current = [];
          cursor = 0;
        }
        if (unit.tocKey) toc[unit.tocKey] = pages.length + offset;
        current.push(unit);
        cursor += height;
      }
      if (current.length > 0) pages.push(current);
      setLayout({ pages, toc });
    };
    run();
    document.fonts?.ready.then(run).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [
    units,
    contentWidth,
    contentHeight,
    fontPx,
    lineHeight,
    fontFamily,
    options.paper,
    options.orientation,
    options.breaks,
    options.includeCover,
  ]);

  /* responsive preview scale */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setStageWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const scale = stageWidth ? Math.max(0.05, Math.min(1, stageWidth / dims.width)) : 1;

  const totalPages = (layout?.pages.length ?? 0) + (options.includeCover ? 1 : 0);
  const coverDims = dims;
  const flowPages = layout?.pages ?? [];
  const footerPageText = (page: number) => {
    if (options.footerStyle === "of") return `Page ${page} of ${totalPages}`;
    if (options.footerStyle === "plain") return String(page);
    return `${page} / ${totalPages}`;
  };

  return (
    <div className="max-w-full">
      <style>{printStylesheet(dims)}</style>

      {/* hidden measuring flow; hidden from screen + print */}
      <div
        ref={measureRef}
        aria-hidden
        className="measure-pane pointer-events-none absolute -left-[9999px] top-0"
        style={{
          width: contentWidth,
          fontSize: fontPx,
          fontFamily,
          lineHeight,
          visibility: "hidden",
        }}
      >
        {units.map((unit) => (
          <UnitSlot key={unit.id} unit={unit} courseColor={course.color} toc={{}} />
        ))}
      </div>

      {/* paper stage */}
      <div ref={stageRef} className="flex w-full flex-col items-center gap-7">
        {!layout &&
          Array.from({ length: 3 }).map((_, skeletonIndex) => (
            <SheetShell
              key={`skeleton-${skeletonIndex}`}
              dims={coverDims}
              scale={scale}
              padding={{ padX, padTop, padBottom }}
              fontSize={fontPx}
              fontFamily={fontFamily}
              lineHeight={lineHeight}
            >
              <div className="grid h-full place-items-center rounded-lg text-gray-400">
                Preparing print preview…
              </div>
            </SheetShell>
          ))}

        {options.includeCover && (
          <SheetShell
            dims={coverDims}
            scale={scale}
            padding={{ padX, padTop, padBottom }}
            footer={{
              left: course.title,
              text: options.footerStyle === "none" ? null : footerPageText(1),
              light: true,
            }}
            fullBleed
          >
            {options.coverStyle === "classic" ? (
              <CoverBodyClassic
                course={course}
                stats={courseStats(course, progress)}
                padX={padX}
                padTop={padTop}
                fontFamily={fontFamily}
              />
            ) : (
              <CoverBody
                course={course}
                stats={courseStats(course, progress)}
                padX={padX}
                padTop={padTop}
                fontFamily={fontFamily}
              />
            )}
          </SheetShell>
        )}

        {flowPages.map((pageUnits, pageIndex) => (
          <SheetShell
            key={`page-${pageIndex}`}
            dims={coverDims}
            scale={scale}
            padding={{ padX, padTop, padBottom }}
            fontSize={fontPx}
            fontFamily={fontFamily}
            lineHeight={lineHeight}
            headerText={options.runningHeader ? course.title : null}
            footer={{
              left: course.title,
              text:
                options.footerStyle === "none"
                  ? null
                  : footerPageText(pageIndex + (options.includeCover ? 2 : 1)),
            }}
          >
            {pageUnits.map((unit) => (
              <UnitSlot
                key={unit.id}
                unit={unit}
                courseColor={course.color}
                toc={layout?.toc ?? {}}
              />
            ))}
          </SheetShell>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- *
 * Sheet shell (white paper with footer) + responsive scaling wrapper
 * --------------------------------------------------------------------- */

function SheetShell({
  dims,
  scale,
  padding,
  fontSize,
  fontFamily,
  lineHeight,
  headerText,
  footer,
  fullBleed,
  children,
}: {
  dims: { width: number; height: number };
  scale: number;
  padding: { padX: number; padTop: number; padBottom: number };
  fontSize?: number;
  fontFamily?: string;
  lineHeight?: number;
  headerText?: string | null;
  footer?: { left: string; text: string | null; light?: boolean };
  fullBleed?: boolean;
  children: ReactNode;
}) {
  const tone = footer?.light ? "text-white/70" : "text-gray-500";
  return (
    <div
      className="preview-scale-wrap"
      style={{ width: dims.width * scale, height: dims.height * scale }}
    >
      <div
        className="preview-scale"
        style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
      >
        <div
          className="print-page course-paper relative overflow-hidden bg-white"
          style={{
            width: dims.width,
            height: dims.height,
            boxShadow: "0 24px 60px -34px rgba(15,23,42,0.65)",
            border: "1px solid rgba(15,23,42,0.12)",
          }}
        >
          {fullBleed ? (
            children
          ) : (
            <div
              style={{
                padding: `${padding.padTop}px ${padding.padX}px ${padding.padBottom}px`,
                fontSize,
                fontFamily,
                lineHeight,
                color: INK,
              }}
            >
              {children}
            </div>
          )}
          {headerText && (
            <header
              className="absolute inset-x-0 flex items-center justify-center gap-2 text-[9px] font-semibold uppercase tracking-[0.28em] text-gray-400"
              style={{
                top: Math.round(padding.padTop * 0.24),
                paddingLeft: padding.padX,
                paddingRight: padding.padX,
              }}
            >
              {headerText}
            </header>
          )}
          {footer && footer.text && (
            <footer
              className="absolute inset-x-0 flex items-center justify-between gap-5"
              style={{
                bottom: fullBleed ? 40 : Math.round(padding.padBottom * 0.32),
                paddingLeft: padding.padX,
                paddingRight: padding.padX,
              }}
            >
              <span className={cn("min-w-0 truncate text-[10px]", tone)}>{footer.left}</span>
              <span className={cn("shrink-0 text-[10px] font-medium tabular-nums", tone)}>
                {footer.text}
              </span>
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- *
 * Unit wrappers + renderers
 * --------------------------------------------------------------------- */

function UnitSlot({
  unit,
  courseColor,
  toc,
}: {
  unit: PaperUnit;
  courseColor: string;
  toc: Record<string, number>;
}) {
  return (
    <div style={{ paddingTop: UNIT_SPACE[unit.data.kind] ?? 8 }}>
      <UnitView data={unit.data} courseColor={courseColor} toc={toc} />
    </div>
  );
}

function UnitView({
  data,
  courseColor,
  toc,
}: {
  data: UnitData;
  courseColor: string;
  toc: Record<string, number>;
}) {
  switch (data.kind) {
    case "toc-header":
      return (
        <header className="border-b-2 border-gray-900 pb-3">
          <p className="text-[0.72em] font-semibold uppercase tracking-[0.22em] text-gray-500">
            Course overview · modules · assessments
          </p>
          <h2 className="mt-1 text-[1.35em] font-bold">Contents</h2>
        </header>
      );
    case "toc-row": {
      const pageNum = data.row.tocKey ? toc[data.row.tocKey] : undefined;
      return (
        <div className={cn("flex items-baseline gap-3", data.row.indent && "pl-6")}>
          <span
            className={cn(
              "min-w-0 truncate",
              data.row.strong ? "font-semibold text-gray-900" : "text-gray-700",
            )}
          >
            {data.row.label}
          </span>
          <span aria-hidden className="min-w-4 flex-1 border-b border-dotted border-gray-300" />
          {data.row.meta && (
            <span className="min-w-12 shrink-0 text-right text-[0.8em] text-gray-500">
              {data.row.meta}
            </span>
          )}
          <span className="w-9 shrink-0 text-right text-[0.9em] font-semibold tabular-nums text-gray-900">
            {pageNum ?? "—"}
          </span>
        </div>
      );
    }
    case "course-objectives":
      return <ObjectivesList title="What you'll learn" items={data.items} accent={courseColor} />;
    case "module-header":
      return (
        <div>
          <div className="flex items-start gap-3">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-lg text-[0.95em] font-bold text-white"
              style={{ background: courseColor }}
            >
              {data.index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                Module {data.index + 1} · {data.module.lessons.length} lessons
              </p>
              <h2 className="mt-1 text-[1.5em] font-bold leading-snug">{data.module.title}</h2>
            </div>
          </div>
        </div>
      );
    case "objectives":
      return <ObjectivesList title={data.title} items={data.items} accent={courseColor} />;
    case "lesson-header": {
      const state = data.lesson.summary ?? "";
      return (
        <div>
          <p className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
            <span
              aria-hidden
              className="inline-block size-1.5 rounded-full"
              style={{ background: courseColor }}
            />
            Lesson {data.index + 1}
            {data.lesson.estimatedMinutes ? ` · ${data.lesson.estimatedMinutes} min` : ""}
          </p>
          <h3 className="mt-1 text-[1.25em] font-semibold leading-snug">{data.lesson.title}</h3>
          {state && <p className="mt-2 text-gray-600">{state}</p>}
          {data.lesson.objectives.length > 0 && (
            <ul className="mt-2 space-y-1 text-[0.92em] text-gray-600">
              {data.lesson.objectives.map((objective) => (
                <li key={objective} className="flex gap-2">
                  <span
                    aria-hidden
                    className="mt-[0.5em] size-1 shrink-0 rounded-full bg-gray-400"
                  />
                  <span className="min-w-0">{objective}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }
    case "markdown":
      return <PaperMarkdown markdown={data.text} />;
    case "callout": {
      const tone = data.block.type === "example" ? "example" : (data.block.tone ?? "info");
      return (
        <div
          className={cn(
            "rounded-xl border px-4 py-3",
            tone === "example" && "border-emerald-600/40 bg-emerald-500/10",
            tone === "warning" && "border-amber-600/45 bg-amber-500/10",
            tone === "definition" && "border-sky-600/40 bg-sky-500/10",
            tone === "info" && "border-slate-500/35 bg-slate-500/5",
          )}
        >
          <p
            className={cn(
              "text-[0.95em] font-semibold",
              tone === "example" && "text-emerald-900",
              tone === "warning" && "text-amber-900",
              tone === "definition" && "text-sky-900",
            )}
          >
            {data.block.title || (data.block.type === "example" ? "Example" : "Note")}
          </p>
          <PaperMarkdown markdown={data.block.markdown ?? ""} />
        </div>
      );
    }
    case "image":
      return (
        <figure className="text-center">
          {data.block.url && (
            <img
              src={data.block.url}
              alt={data.block.alt ?? ""}
              className="mx-auto max-h-64 rounded-lg border border-gray-300 object-contain"
            />
          )}
          {data.block.caption && (
            <figcaption className="mt-1.5 text-[0.85em] text-gray-500">
              {data.block.caption}
            </figcaption>
          )}
        </figure>
      );
    case "divider":
      return <hr className="border-gray-300" />;
    case "notes":
      return (
        <div className="border-l-4 border-gray-300 pl-3">
          <p className="text-[0.8em] font-semibold uppercase tracking-[0.16em] text-gray-500">
            Lesson notes
          </p>
          <PaperMarkdown markdown={data.text} />
        </div>
      );
    case "section-header":
      return (
        <div className="border-b border-gray-300 pb-2">
          <h4 className="text-[1.05em] font-bold">{data.label}</h4>
        </div>
      );
    case "question":
      return <QuestionView question={data.question} number={data.number} context={data.context} />;
    case "assessment-header":
      return (
        <div className="border-b-2 border-gray-900 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
            {data.prefix}
          </p>
          <h2 className="mt-1 text-[1.3em] font-bold">{data.title}</h2>
          <p className="mt-1 text-[0.9em] text-gray-600">{data.meta}</p>
        </div>
      );
    case "deck-header":
      return (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
            Practice deck {data.index} · {data.deck.subject}
          </p>
          <h3 className="mt-1 text-[1.2em] font-semibold">{data.deck.title}</h3>
          {data.deck.description && (
            <p className="mt-1 text-[0.95em] text-gray-600">{data.deck.description}</p>
          )}
        </div>
      );
    case "answer-header":
      return (
        <div className="border-b-2 border-gray-900 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
            Answers
          </p>
          <h2 className="mt-1 text-[1.3em] font-bold">Answer key</h2>
          <p className="mt-1 text-[0.9em] text-gray-600">
            Check your checkpoints and practice attempts against these answers.
          </p>
        </div>
      );
    case "answer-sub":
      return (
        <p
          className={cn(
            data.tone === "one" ? "text-[1.05em] font-bold" : "text-[0.95em] font-semibold",
            data.tone === "two" && "text-gray-500",
          )}
        >
          {data.label}
        </p>
      );
    case "answer-item":
      return (
        <p className="flex gap-2 text-[0.95em]">
          <span className="font-semibold">{data.label}</span>
          <span className="min-w-0">
            {data.value}
            {data.explanation && (
              <span className="italic text-gray-500"> — {data.explanation}</span>
            )}
          </span>
        </p>
      );
    default:
      return null;
  }
}

/* --------------------------------------------------------------------- *
 * Cover page
 * --------------------------------------------------------------------- */

function CoverBody({
  course,
  stats,
  padX,
  padTop,
  fontFamily,
}: {
  course: Course;
  stats: CourseStats;
  padX: number;
  padTop: number;
  fontFamily?: string;
}) {
  const statPairs: [string, string | number][] = [
    ["Modules", course.modules.length],
    ["Lessons", stats.lessons],
    ["Questions", stats.questions],
    ["Assessments", stats.assessments],
    ["Minutes", course.estimatedMinutes ?? "—"],
    ["Progress", `${stats.percent}%`],
  ];
  return (
    <div
      className="relative flex size-full flex-col overflow-hidden text-white"
      style={{
        background: `radial-gradient(140% 100% at 90% -20%, color-mix(in oklab, ${course.color} 45%, #ffffff 6%) 0%, transparent 52%), linear-gradient(158deg, ${course.color} 0%, color-mix(in oklab, ${course.color} 40%, #0a1322) 60%, #091120 100%)`,
      }}
    >
      {/* classic book frame */}
      <div
        aria-hidden
        className="pointer-events-none absolute border border-white/25"
        style={{ inset: 26 }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute border border-white/10"
        style={{ inset: 33 }}
      />
      {/* soft ornaments */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -left-16 size-72 rounded-full bg-black/30 blur-3xl"
      />

      <div
        className="relative flex size-full flex-col"
        style={{ padding: `${padTop}px ${padX}px ${Math.round(padTop * 0.95)}px`, fontFamily }}
      >
        {/* head */}
        <div className="flex items-center gap-3.5">
          <span className="grid size-14 shrink-0 place-items-center rounded-xl border border-white/25 bg-white/15 text-[1.9em]">
            {course.emoji || "📘"}
          </span>
          <div>
            <p className="text-[0.72em] font-semibold uppercase tracking-[0.32em] text-white/80">
              {course.subject}
              {course.level ? ` · ${course.level}` : ""}
            </p>
            <p className="mt-1 text-[0.72em] uppercase tracking-[0.24em] text-white/45">
              Knowly study pack
            </p>
          </div>
        </div>

        {/* title block, vertically centered like a book cover */}
        <div className="my-auto py-10">
          <div aria-hidden className="flex items-center gap-3">
            <span className="h-px w-10 bg-white/50" />
            <span className="size-1.5 rounded-full bg-white/70" />
            <span className="h-px w-4 bg-white/40" />
          </div>
          <h1
            className="mt-5 font-display text-[3em] font-bold leading-[1.04] tracking-tight"
            style={fontFamily ? { fontFamily } : undefined}
          >
            {course.title}
          </h1>
          {course.description && (
            <p className="mt-5 max-w-md text-[1.08em] italic text-white/75">{course.description}</p>
          )}
        </div>

        {/* foot meta */}
        <div>
          <div aria-hidden className="h-px w-full bg-white/20" />
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
            {statPairs.map(([label, value]) => (
              <p key={label} className="flex items-baseline gap-1.5">
                <span className="text-[1.05em] font-bold tabular-nums">{value}</span>
                <span className="text-[0.78em] uppercase tracking-[0.18em] text-white/60">
                  {label}
                </span>
              </p>
            ))}
          </div>
          {course.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {course.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/25 px-2.5 py-1 text-[0.8em] text-white/80"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p className="mt-4 text-[0.78em] uppercase tracking-[0.2em] text-white/45">
            Printed study pack · generated with Knowly
          </p>
        </div>
      </div>
    </div>
  );
}

/** White, text-first cover — the restrained "classic book" alternative. */
function CoverBodyClassic({
  course,
  stats,
  padX,
  padTop,
  fontFamily,
}: {
  course: Course;
  stats: CourseStats;
  padX: number;
  padTop: number;
  fontFamily?: string;
}) {
  const statLine = [
    `${course.modules.length} modules`,
    `${stats.lessons} lessons`,
    `${stats.questions} questions`,
    course.estimatedMinutes ? `${course.estimatedMinutes} min` : null,
    `${stats.percent}% complete`,
  ]
    .filter(Boolean)
    .join("  ·  ");
  return (
    <div
      className="relative flex size-full flex-col"
      style={{ padding: `${padTop * 1.1}px ${padX}px ${padTop * 0.95}px`, color: INK, fontFamily }}
    >
      {/* top rule + imprint */}
      <div aria-hidden className="h-1 w-14" style={{ background: course.color }} />
      <p className="mt-4 text-[0.78em] font-semibold uppercase tracking-[0.32em] text-gray-500">
        {course.subject}
        {course.level ? ` · ${course.level}` : ""}
      </p>
      <p className="mt-1 text-[0.78em] uppercase tracking-[0.24em] text-gray-400">
        Knowly study pack
      </p>

      {/* centre title block */}
      <div className="my-auto flex flex-col items-start py-12">
        <h1 className="text-[2.7em] font-bold leading-[1.06] tracking-tight">{course.title}</h1>
        {course.description && (
          <p className="mt-5 max-w-md text-[1.05em] leading-[1.6] text-gray-600">
            {course.description}
          </p>
        )}
        {course.objectives.length > 0 && (
          <ul className="mt-6 max-w-md space-y-1.5">
            {course.objectives.slice(0, 5).map((objective) => (
              <li key={objective} className="flex gap-2 text-[0.95em] text-gray-600">
                <span
                  aria-hidden
                  className="mt-[0.52em] size-1.5 shrink-0 rounded-full"
                  style={{ background: course.color }}
                />
                <span className="min-w-0">{objective}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* bottom meta */}
      <div aria-hidden className="h-px w-full bg-gray-200" />
      <p className="mt-4 text-[0.85em] font-medium tabular-nums text-gray-600">{statLine}</p>
      {course.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {course.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-gray-300 px-2.5 py-1 text-[0.8em] text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <p className="mt-4 text-[0.78em] uppercase tracking-[0.2em] text-gray-400">
        Printed study pack · generated with Knowly
      </p>
    </div>
  );
}

/* --------------------------------------------------------------------- *
 * Content atoms
 * --------------------------------------------------------------------- */

function ObjectivesList({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent: string;
}) {
  return (
    <div>
      <p className="text-[0.8em] font-semibold uppercase tracking-[0.18em] text-gray-500">
        {title}
      </p>
      <ul className="mt-2 space-y-1">
        {items.map((objective) => (
          <li key={objective} className="flex gap-2">
            <span
              aria-hidden
              className="mt-[0.55em] size-1.5 shrink-0 rounded-full"
              style={{ background: accent }}
            />
            <span className="min-w-0">{objective}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PaperMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="paper-markdown text-[0.98em] text-[#1f2937] [&_a]:text-gray-900 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-gray-400 [&_blockquote]:pl-3 [&_blockquote]:text-gray-600 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:text-[0.9em] [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-[1.25em] [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-[1.15em] [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:my-2 [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:bg-gray-100 [&_pre]:p-3 [&_pre]:text-[0.9em] [&_strong]:font-bold [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:p-1.5 [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:p-1.5 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}

function QuestionView({
  question,
  number,
  context,
}: {
  question: Question;
  number: number;
  context?: string;
}) {
  return (
    <div className="break-inside-avoid">
      <div className="flex gap-3">
        <span className="mt-0.5 min-w-0 shrink-0 font-bold">{number}.</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{question.question}</p>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[9.5px] uppercase tracking-[0.14em] text-gray-500">
            <span style={{ color: INK_MUTED }}>{TYPE_LABELS[question.type]}</span>
            {question.difficulty && <span>{question.difficulty}</span>}
            {question.concept && <span>{question.concept}</span>}
            {context && <span>{context}</span>}
          </p>
          <QuestionBody question={question} />
        </div>
      </div>
    </div>
  );
}

function QuestionBody({ question }: { question: Question }) {
  switch (question.type) {
    case "multiple-choice":
      return (
        <ol className="mt-2 space-y-1">
          {(question.options ?? []).map((option, index) => (
            <li key={`${option}-${index}`} className="flex gap-2">
              <span className="font-semibold">{LETTERS[index] ?? index + 1}.</span>
              <span className="min-w-0">{option}</span>
            </li>
          ))}
        </ol>
      );
    case "true-false":
      return (
        <p className="mt-2 text-gray-700">
          <span className="mr-6">☐ True</span>
          <span>☐ False</span>
        </p>
      );
    case "ordering":
      return (
        <div className="mt-2 space-y-1">
          {(question.items ?? []).map((item, index) => (
            <p key={`${item}-${index}`} className="flex gap-3">
              <span aria-hidden className="inline-block w-6 border-b border-gray-400" />
              <span className="min-w-0">{item}</span>
            </p>
          ))}
        </div>
      );
    case "matching": {
      const pairs = question.pairs ?? [];
      return (
        <div className="mt-2 grid gap-5 sm:grid-cols-2">
          <div className="space-y-1">
            {pairs.map((pair, index) => (
              <p key={`${pair.left}-${index}`}>
                <span aria-hidden className="mr-2 inline-block w-6 border-b border-gray-400" />
                <span className="min-w-0">{pair.left}</span>
              </p>
            ))}
          </div>
          <div className="space-y-1">
            {pairs.map((pair, index) => (
              <p key={`${pair.right}-${index}`}>
                <span className="mr-2 font-semibold">{LETTERS[index] ?? index + 1}.</span>
                <span className="min-w-0">{pair.right}</span>
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
            <p className="border border-gray-400 px-3 py-1.5 text-[0.9em] text-gray-700">
              <span className="font-semibold text-gray-900">Word bank: </span>
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
      {Array.from({ length: Math.max(1, count) }).map((_, lineIndex) => (
        <div key={lineIndex} className="border-b border-gray-300" />
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------- *
 * Print stylesheet injected per paper (overrides the app's default @page)
 * --------------------------------------------------------------------- */

function printStylesheet(dims: { width: number; height: number }) {
  return `@media print {
  @page { size: ${dims.width}px ${dims.height}px; margin: 0; }
  .preview-stage { padding: 0 !important; background: none !important; }
  .preview-scale-wrap { width: auto !important; height: auto !important; }
  .preview-scale { transform: none !important; }
  .print-page {
    width: ${dims.width}px !important;
    height: ${dims.height}px !important;
    break-after: page;
    page-break-after: always;
    box-shadow: none !important;
    border: 0 !important;
  }
  .print-page:last-of-type { break-after: auto; page-break-after: auto; }
  .measure-pane { display: none !important; }
  .course-paper { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}`;
}
