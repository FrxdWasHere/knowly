import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MathText } from "@/components/math/math-text";
import { ModuleMarkdownText } from "@/components/module-markdown";
import { LETTERS, printableAnswer } from "@/lib/exam-print";
import { TYPE_LABELS } from "@/lib/answers";
import {
  FOOTER_OPTIONS,
  FONT_SCALE_OPTIONS,
  MARGIN_OPTIONS,
  PAPER_SIZE_OPTIONS,
  SPACING_OPTIONS,
  TYPEFACE_OPTIONS,
  getPaperDims,
  type PaperFontScale,
  type PaperFooterStyle,
  type PaperMarginId,
  type PaperOrientation,
  type PaperSizeId,
  type PaperSpacing,
  type PaperTypeface,
} from "@/components/print/course-paper";
import type { CourseBlock, Deck, Module, Question } from "@/lib/types";
import { cn } from "@/lib/utils";

/* --------------------------------------------------------------------- *
 * Module print options — no cover page, colorful one-flow document.
 * --------------------------------------------------------------------- */

export interface ModulePrintOptions {
  paper: PaperSizeId;
  orientation: PaperOrientation;
  margins: PaperMarginId;
  typeface: PaperTypeface;
  fontScale: PaperFontScale;
  spacing: PaperSpacing;
  footerStyle: PaperFooterStyle;
  runningHeader: boolean;
  includeAnswerKey: boolean;
  includeNotes: boolean;
}

export const defaultModulePrintOptions: ModulePrintOptions = {
  paper: "a4",
  orientation: "portrait",
  margins: "normal",
  typeface: "sans",
  fontScale: "normal",
  spacing: "normal",
  footerStyle: "count",
  runningHeader: true,
  includeAnswerKey: true,
  includeNotes: true,
};

export const STORAGE_KEY_MODULE_PRINT = "knowly.module-print.v1";

/** Padding as a share of the sheet (mirrors the course paper values). */
const MARGIN_FACTORS: Record<PaperMarginId, { side: number; top: number; bottom: number }> = {
  narrow: { side: 0.055, top: 0.042, bottom: 0.055 },
  normal: { side: 0.088, top: 0.06, bottom: 0.075 },
  wide: { side: 0.115, top: 0.078, bottom: 0.095 },
};

const SPACING_FACTORS: Record<PaperSpacing, number> = {
  compact: 0.9,
  normal: 1,
  relaxed: 1.14,
};

/* --------------------------------------------------------------------- *
 * Content units
 * --------------------------------------------------------------------- */

type ModuleUnitData =
  | { kind: "hero" }
  | { kind: "objectives"; items: string[] }
  | { kind: "markdown"; text: string }
  | { kind: "callout"; block: CourseBlock }
  | { kind: "example"; block: CourseBlock }
  | { kind: "image"; block: CourseBlock }
  | { kind: "divider" }
  | { kind: "checkpoint"; questionId: string; number: number }
  | { kind: "activity"; block: CourseBlock; index: number }
  | { kind: "notes"; text: string }
  | { kind: "answer-header" }
  | { kind: "answer-item"; number: number; questionId: string };

interface ModuleUnit {
  id: string;
  data: ModuleUnitData;
}

const UNIT_SPACE: Partial<Record<ModuleUnitData["kind"], number>> = {
  hero: 0,
  objectives: 16,
  markdown: 10,
  callout: 12,
  example: 12,
  image: 10,
  divider: 16,
  checkpoint: 16,
  activity: 12,
  notes: 18,
  "answer-header": 26,
  "answer-item": 7,
};

const DIFFICULTY_LABEL = ["", "Intro", "Core", "Advanced"] as const;

const TONE_BG: Record<string, { border: string; bg: string; text: string; label: string }> = {
  info: {
    border: "oklch(0.55 0.17 / 0.35)",
    bg: "oklch(0.55 0.17 / 0.08)",
    text: "#3b5bdb",
    label: "Note",
  },
  tip: {
    border: "oklch(0.62 0.15 155 / 0.4)",
    bg: "oklch(0.62 0.15 155 / 0.1)",
    text: "#127a4a",
    label: "Tip",
  },
  warning: {
    border: "oklch(0.68 0.16 70 / 0.45)",
    bg: "oklch(0.68 0.16 70 / 0.11)",
    text: "#a05e0a",
    label: "Watch out",
  },
  definition: {
    border: "oklch(0.58 0.17 285 / 0.4)",
    bg: "oklch(0.58 0.17 285 / 0.1)",
    text: "#7048c8",
    label: "Key idea",
  },
  example: {
    border: "oklch(0.62 0.15 155 / 0.4)",
    bg: "oklch(0.62 0.15 155 / 0.1)",
    text: "#127a4a",
    label: "Example",
  },
};

function buildUnits(module: Module, decks: Deck[], options: ModulePrintOptions): ModuleUnit[] {
  const units: ModuleUnit[] = [];
  let uid = 0;
  const push = (data: ModuleUnitData) => {
    units.push({ id: `munit-${++uid}`, data });
  };

  push({ kind: "hero" });
  if (module.objectives.length) push({ kind: "objectives", items: module.objectives });

  // number checkpoints in printed order
  let checkpointNumber = 0;
  const checkpointOrdering = new Map<string, number>();
  for (const block of module.blocks) {
    if (block.type === "checkpoint" && block.questionId) {
      checkpointNumber += 1;
      checkpointOrdering.set(block.questionId, checkpointNumber);
    }
  }
  // questions without a checkpoint block get appended at the end
  for (const question of module.questions) {
    if (!checkpointOrdering.has(question.id)) {
      checkpointNumber += 1;
      checkpointOrdering.set(question.id, checkpointNumber);
    }
  }

  let activityIndex = 0;
  for (const block of module.blocks) {
    switch (block.type) {
      case "markdown":
        if (block.markdown?.trim()) push({ kind: "markdown", text: block.markdown });
        break;
      case "callout":
        push({ kind: "callout", block });
        break;
      case "example":
        push({ kind: "example", block });
        break;
      case "image":
        push({ kind: "image", block });
        break;
      case "divider":
        push({ kind: "divider" });
        break;
      case "checkpoint":
        if (block.questionId)
          push({
            kind: "checkpoint",
            questionId: block.questionId,
            number: checkpointOrdering.get(block.questionId) ?? 0,
          });
        break;
      case "activity":
        activityIndex += 1;
        push({ kind: "activity", block, index: activityIndex });
        break;
      default:
        break;
    }
  }

  if (options.includeNotes && module.notes?.trim()) {
    push({ kind: "notes", text: module.notes });
  }

  if (options.includeAnswerKey && module.questions.length) {
    push({ kind: "answer-header" });
    for (const question of module.questions) {
      push({
        kind: "answer-item",
        number: checkpointOrdering.get(question.id) ?? 0,
        questionId: question.id,
      });
    }
  }

  void decks;
  return units;
}

/* --------------------------------------------------------------------- *
 * ModulePaper — measured paginator + preview + print stylesheet.
 * --------------------------------------------------------------------- */

export function ModulePaper({
  module,
  decks,
  options,
}: {
  module: Module;
  decks: Deck[];
  options: ModulePrintOptions;
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

  const units = useMemo(() => buildUnits(module, decks, options), [module, decks, options]);

  const measureRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<ModuleUnit[][] | null>(null);
  const [stageWidth, setStageWidth] = useState<number | null>(null);

  /* paginate by measuring the hidden flow */
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      const host = measureRef.current;
      if (!host || cancelled) return;
      const slots = Array.from(host.children) as HTMLElement[];
      if (!slots.length) {
        setPages([]);
        return;
      }
      const heights = slots.map((slot) => slot.getBoundingClientRect().height);
      const built: ModuleUnit[][] = [];
      let current: ModuleUnit[] = [];
      let cursor = 0;
      for (const [index, unit] of units.entries()) {
        const height = heights[index] ?? 0;
        const forced = unit.data.kind === "answer-header" || unit.data.kind === "hero";
        if (current.length > 0 && (forced || cursor + height > contentHeight)) {
          built.push(current);
          current = [];
          cursor = 0;
        }
        current.push(unit);
        cursor += height;
      }
      if (current.length > 0) built.push(current);
      setPages(built);
    };
    run();
    document.fonts?.ready.then(run).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [units, contentWidth, contentHeight, fontPx, lineHeight, fontFamily]);

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

  const totalPages = pages?.length ?? 0;
  const footerPageText = (page: number) => {
    if (options.footerStyle === "of") return `Page ${page} of ${totalPages}`;
    if (options.footerStyle === "plain") return String(page);
    return `${page} / ${totalPages}`;
  };

  return (
    <div className="max-w-full">
      <style>{modulePrintStylesheet(dims)}</style>

      {/* hidden measuring flow */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none absolute -left-[9999px] top-0"
        style={{
          width: contentWidth,
          fontSize: fontPx,
          fontFamily,
          lineHeight,
          visibility: "hidden",
        }}
      >
        {units.map((unit) => (
          <UnitSpace key={unit.id} unit={unit} module={module} decks={decks} />
        ))}
      </div>

      {/* paper stage */}
      <div ref={stageRef} className="paper-flow flex w-full flex-col items-center gap-7">
        {!pages &&
          Array.from({ length: 2 }).map((_, skeletonIndex) => (
            <ModuleSheet
              key={`skeleton-${skeletonIndex}`}
              dims={dims}
              scale={scale}
              padding={{ padX, padTop, padBottom }}
              fontSize={fontPx}
              fontFamily={fontFamily}
              lineHeight={lineHeight}
            >
              <div className="grid h-full place-items-center rounded-lg text-muted-foreground">
                Preparing print preview…
              </div>
            </ModuleSheet>
          ))}

        {pages?.map((pageUnits, pageIndex) => (
          <ModuleSheet
            key={`page-${pageIndex}`}
            dims={dims}
            scale={scale}
            padding={{ padX, padTop, padBottom }}
            fontSize={fontPx}
            fontFamily={fontFamily}
            lineHeight={lineHeight}
            headerText={options.runningHeader && pageIndex > 0 ? module.title : null}
            footer={{
              left: module.title,
              text: options.footerStyle === "none" ? null : footerPageText(pageIndex + 1),
            }}
          >
            {pageUnits.map((unit) => (
              <UnitSpace key={unit.id} unit={unit} module={module} decks={decks} />
            ))}
          </ModuleSheet>
        ))}
      </div>
    </div>
  );
}

function UnitSpace({ unit, module, decks }: { unit: ModuleUnit; module: Module; decks: Deck[] }) {
  return (
    <div style={{ paddingTop: UNIT_SPACE[unit.data.kind] ?? 8 }}>
      <UnitView unit={unit} module={module} decks={decks} />
    </div>
  );
}

/* --------------------------------------------------------------------- *
 * Unit renderers — the colorful part
 * --------------------------------------------------------------------- */

function UnitView({ unit, module, decks }: { unit: ModuleUnit; module: Module; decks: Deck[] }) {
  const data = unit.data;
  const accent = module.color || "#3b5bdb";
  const accentInk = `color-mix(in oklab, ${accent} 78%, #171c26 22%)`;

  switch (data.kind) {
    case "hero":
      return (
        <div
          className="module-hero relative overflow-hidden rounded-2xl px-6 pb-5 pt-6 text-white"
          style={{
            background: `radial-gradient(120% 130% at 85% -20%, color-mix(in oklab, ${accent} 75%, #ffffff 22%) 0%, transparent 55%), linear-gradient(150deg, ${accent} 0%, color-mix(in oklab, ${accent} 55%, #10151c) 78%, #10151c 100%)`,
          }}
        >
          {/* faint oversized emoji ornament, top-right */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-3 -top-4 select-none text-[4.6em] leading-none opacity-[0.13]"
          >
            {module.emoji || "📘"}
          </span>

          <div className="relative flex items-start gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-xl border border-white/25 bg-white/15 text-2xl">
              {module.emoji || "📘"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline justify-between gap-3 text-[0.66em] font-semibold uppercase tracking-[0.32em] text-white/70">
                <span className="min-w-0 truncate">Knowly module · {module.subject}</span>
                <span className="shrink-0 tracking-[0.26em]">KNOWLY</span>
              </p>
              <h1 className="mt-1.5 text-[1.68em] font-bold leading-[1.18] tracking-tight text-white">
                {module.title}
              </h1>
            </div>
          </div>

          <div aria-hidden className="mt-4 flex items-center gap-2">
            <span className="h-px w-7 bg-white/45" />
            <span className="size-1.5 rotate-45 rounded-[0.1em] bg-white/60" />
            <span className="h-px w-4 bg-white/30" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {[
              `${module.estimatedMinutes} min`,
              DIFFICULTY_LABEL[module.difficulty],
              module.questions.length ? `${module.questions.length} checkpoints` : null,
            ]
              .filter(Boolean)
              .map((chip, index) => (
                <span
                  key={index}
                  className="rounded-full border border-white/25 bg-white/12 px-2.5 py-1 text-[0.7em] font-semibold uppercase tracking-[0.12em] text-white/90"
                >
                  {chip}
                </span>
              ))}
          </div>
        </div>
      );
    case "objectives":
      return (
        <div
          className="rounded-xl px-4 py-3.5"
          style={{ borderLeft: `3px solid ${accent}`, background: `${accent}0d` }}
        >
          <p
            className="text-[0.74em] font-bold uppercase tracking-[0.2em]"
            style={{ color: accentInk }}
          >
            What you'll learn
          </p>
          <ul className="mt-2.5 space-y-[0.45em]">
            {data.items.map((objective) => (
              <li key={objective} className="flex gap-2.5">
                <span
                  aria-hidden
                  className="mt-[0.52em] size-1.5 shrink-0 rotate-45 rounded-[0.08em]"
                  style={{ background: accent }}
                />
                <span className="min-w-0 text-pretty">{objective}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "markdown":
      return <ModuleMarkdownText variant="paper" accent={accent} markdown={data.text} />;
    case "callout": {
      const tone = TONE_BG[data.block.tone ?? "info"] ?? TONE_BG.info;
      return (
        <div
          className="rounded-xl px-4 py-3.5"
          style={{
            borderLeft: `3px solid ${tone.border}`,
            background: tone.bg,
            borderWidth: 0,
            borderLeftWidth: 3,
          }}
        >
          <p
            className="text-[0.74em] font-bold uppercase tracking-[0.18em]"
            style={{ color: tone.text }}
          >
            {data.block.title || tone.label}
          </p>
          <div className="mt-1">
            <ModuleMarkdownText
              variant="paper"
              accent={accent}
              markdown={data.block.markdown ?? ""}
            />
          </div>
        </div>
      );
    }
    case "example": {
      const tone = TONE_BG.example;
      return (
        <div
          className="rounded-xl px-4 py-3.5"
          style={{
            borderLeft: `3px solid ${tone.border}`,
            background: tone.bg,
            borderWidth: 0,
            borderLeftWidth: 3,
          }}
        >
          <p
            className="text-[0.74em] font-bold uppercase tracking-[0.18em]"
            style={{ color: tone.text }}
          >
            {data.block.title || "Worked example"}
          </p>
          <div className="mt-1">
            <ModuleMarkdownText
              variant="paper"
              accent={accent}
              markdown={data.block.markdown ?? ""}
            />
          </div>
        </div>
      );
    }
    case "image":
      return (
        <figure className="break-inside-avoid text-center">
          {data.block.url && (
            <img
              src={data.block.url}
              alt={data.block.alt ?? ""}
              className="mx-auto max-h-64 rounded-xl object-contain"
              style={{ border: `1px solid ${accent}44` }}
            />
          )}
          {data.block.caption && (
            <figcaption className="mt-1.5 text-[0.84em] italic text-muted-foreground">
              {data.block.caption}
            </figcaption>
          )}
        </figure>
      );
    case "divider":
      return (
        <div aria-hidden className="flex items-center justify-center gap-2">
          <span className="h-px flex-1 bg-foreground/25" />
          <span className="size-[0.5em] rotate-45 rounded-[0.1em]" style={{ background: accent }} />
          <span className="h-px flex-1 bg-foreground/25" />
        </div>
      );
    case "checkpoint": {
      const question = module.questions.find((q) => q.id === data.questionId);
      if (!question) return null;
      return (
        <div
          className="rounded-xl px-4 py-3.5"
          style={{ borderLeft: `3px solid ${accent}`, background: `${accent}0f` }}
        >
          <p className="flex items-center gap-2.5">
            <span
              className="grid size-[1.5em] shrink-0 place-items-center rounded-full text-[0.82em] font-bold text-white"
              style={{ background: accent }}
            >
              {data.number}
            </span>
            <span
              className="text-[0.72em] font-bold uppercase tracking-[0.22em]"
              style={{ color: accentInk }}
            >
              Checkpoint {data.number}
            </span>
            <span
              aria-hidden
              className="ml-auto inline-block h-2 w-8 shrink-0 rounded-full"
              style={{
                background: `repeating-linear-gradient(90deg, ${accent}66 0 3px, transparent 3px 6px)`,
              }}
            />
          </p>
          <p className="mt-2.5 font-medium leading-relaxed text-pretty">
            <MathText text={question.question} />
          </p>
          <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[0.68em] uppercase tracking-[0.16em] text-muted-foreground">
            <span style={{ color: accentInk }}>{TYPE_LABELS[question.type]}</span>
            {question.difficulty && <span>{question.difficulty}</span>}
            {question.concept && (
              <span>
                <MathText text={question.concept} />
              </span>
            )}
          </p>
          <div className="mt-1">
            <QuestionBody question={question} />
          </div>
        </div>
      );
    }
    case "activity": {
      const deck = decks.find((d) => d.id === data.block.markdown);
      return (
        <div
          className="rounded-xl border border-dashed px-4 py-3.5"
          style={{ borderColor: `${accent}88`, background: `${accent}08` }}
        >
          <p className="flex items-center gap-2.5">
            <span
              className="grid size-[1.35em] shrink-0 place-items-center rounded-md text-[0.78em] font-bold text-white"
              style={{ background: accent }}
            >
              {data.index}
            </span>
            <span
              className="text-[0.72em] font-bold uppercase tracking-[0.22em]"
              style={{ color: accentInk }}
            >
              Practice · on this device
            </span>
          </p>
          <p className="mt-2 font-semibold">{data.block.title || deck?.title || "Linked deck"}</p>
          {deck && (
            <p className="mt-0.5 text-[0.88em] text-muted-foreground">
              {deck.subject} · {deck.questions.length} cards ready to study
            </p>
          )}
          {!deck && (
            <p className="mt-0.5 text-[0.88em] text-muted-foreground">
              Relink this activity to a deck in the module editor.
            </p>
          )}
        </div>
      );
    }
    case "notes":
      return (
        <div className="pl-3.5" style={{ borderLeft: `3px solid ${accent}55` }}>
          <p
            className="text-[0.72em] font-bold uppercase tracking-[0.2em]"
            style={{ color: accentInk }}
          >
            My notes
          </p>
          <ModuleMarkdownText variant="paper" accent={accent} markdown={data.text} />
        </div>
      );
    case "answer-header":
      return (
        <div className="flex items-end justify-between gap-4 border-b-2 border-foreground pb-2.5">
          <div>
            <p
              className="text-[0.72em] font-bold uppercase tracking-[0.24em]"
              style={{ color: accentInk }}
            >
              Check yourself
            </p>
            <h2 className="mt-1 text-[1.32em] font-bold tracking-tight">Answer key</h2>
          </div>
          <p className="pb-0.5 text-[0.8em] italic text-muted-foreground">
            Score your checkpoints against these answers.
          </p>
        </div>
      );
    case "answer-item": {
      const question = module.questions.find((q) => q.id === data.questionId);
      if (!question) return null;
      return (
        <div className="flex gap-2.5">
          <span
            className="mt-[0.1em] grid size-[1.2em] shrink-0 place-items-center rounded-full text-[0.7em] font-bold text-white"
            style={{ background: accent }}
          >
            {data.number}
          </span>
          <p className="min-w-0 text-[0.95em] leading-relaxed text-pretty">
            <span className="font-semibold">Q{data.number}.</span>{" "}
            <MathText text={question.question} /> <span className="text-muted-foreground">—</span>{" "}
            <span className="font-medium">{printableAnswer(question)}</span>
            {question.explanation && (
              <span className="text-muted-foreground">
                {" "}
                <span className="italic">({question.explanation})</span>
              </span>
            )}
          </p>
        </div>
      );
    }
    default:
      return null;
  }
}

/* --------------------------------------------------------------------- *
 * Question body: write-on invitations
 * --------------------------------------------------------------------- */

function QuestionBody({ question }: { question: Question }) {
  switch (question.type) {
    case "multiple-choice":
      return (
        <ol className="mt-2 space-y-1">
          {(question.options ?? []).map((option, index) => (
            <li key={`${option}-${index}`} className="flex gap-2">
              <span className="font-semibold">{LETTERS[index] ?? index + 1}.</span>
              <MathText text={option} className="min-w-0" />
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
              <span aria-hidden className="inline-block w-6 border-b border-border" />
              <MathText text={item} className="min-w-0" />
            </p>
          ))}
        </div>
      );
    case "matching": {
      const pairs = question.pairs ?? [];
      return (
        <div className="mt-2 grid grid-cols-2 gap-5">
          <div className="space-y-1">
            {pairs.map((pair, index) => (
              <p key={`${pair.left}-${index}`}>
                <span aria-hidden className="mr-2 inline-block w-6 border-b border-border" />
                <MathText text={pair.left} className="min-w-0" />
              </p>
            ))}
          </div>
          <div className="space-y-1">
            {pairs.map((pair, index) => (
              <p key={`${pair.right}-${index}`}>
                <span className="mr-2 font-semibold">{LETTERS[index] ?? index + 1}.</span>
                <MathText text={pair.right} className="min-w-0" />
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
            <p className="border border-border px-3 py-1.5">
              <span className="font-semibold">Word bank: </span>
              {(question.wordBank ?? []).map((w, i) => (
                <span key={`${w}-${i}`}>
                  {i > 0 && " · "}
                  <MathText text={w} />
                </span>
              ))}
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
        <div key={lineIndex} className="border-b border-border" />
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------- *
 * Sheet shell
 * --------------------------------------------------------------------- */

function ModuleSheet({
  dims,
  scale,
  padding,
  fontSize,
  fontFamily,
  lineHeight,
  headerText,
  footer,
  children,
}: {
  dims: { width: number; height: number };
  scale: number;
  padding: { padX: number; padTop: number; padBottom: number };
  fontSize?: number;
  fontFamily?: string;
  lineHeight?: number;
  headerText?: string | null;
  footer?: { left: string; text: string | null };
  children: ReactNode;
}) {
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
          className="print-page module-paper relative overflow-hidden bg-card"
          style={{
            width: dims.width,
            height: dims.height,
            boxShadow: "0 24px 60px -34px color-mix(in oklab, var(--foreground) 42%, transparent)",
            border: "1px solid color-mix(in oklab, var(--foreground) 12%, transparent)",
          }}
        >
          <div
            style={{
              padding: `${padding.padTop}px ${padding.padX}px ${padding.padBottom}px`,
              fontSize,
              fontFamily,
              lineHeight,
              color: "var(--foreground)",
            }}
          >
            {children}
          </div>
          {headerText && (
            <div
              aria-hidden
              className="absolute inset-x-0 flex items-center justify-center gap-2 text-[9px] font-semibold uppercase tracking-[0.28em] text-muted-foreground"
              style={{
                top: Math.round(padding.padTop * 0.24),
                paddingLeft: padding.padX,
                paddingRight: padding.padX,
              }}
            >
              {headerText}
            </div>
          )}
          {footer && footer.text && (
            <footer
              className="absolute inset-x-0 flex items-center justify-between gap-5 text-muted-foreground"
              style={{
                bottom: Math.round(padding.padBottom * 0.32),
                paddingLeft: padding.padX,
                paddingRight: padding.padX,
              }}
            >
              <span className="min-w-0 truncate text-[10px]">{footer.left}</span>
              <span className="shrink-0 text-[10px] font-medium tabular-nums">{footer.text}</span>
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- *
 * Print stylesheet
 * --------------------------------------------------------------------- */

function modulePrintStylesheet(dims: { width: number; height: number }) {
  return `@media print {
  @page { size: ${dims.width}px ${dims.height}px; margin: 0; }
  html, body { overflow: visible !important; height: auto !important; }
  .preview-stage { padding: 0 !important; background: none !important; }
  .paper-flow { display: block !important; }
  .paper-flow > * { margin: 0 !important; }
  .preview-scale-wrap { width: auto !important; height: auto !important; }
  .preview-scale { transform: none !important; }
  .print-page {
    display: block !important;
    width: ${dims.width}px !important;
    height: ${dims.height - 0.5}px !important;
    break-after: page;
    page-break-after: always;
    break-inside: avoid;
    box-shadow: none !important;
    border: 0 !important;
  }
  .print-page:last-of-type { break-after: auto; page-break-after: auto; }
  .module-paper { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .paper-flow .print-page { background-color: #ffffff !important; }
  .paper-flow .print-page * {
    color: #1f2937 !important;
    border-color: #9ca3af !important;
  }
  /* the colorful hero keeps its own white-on-color text */
  .paper-flow .print-page .module-hero,
  .paper-flow .print-page .module-hero * {
    color: #ffffff !important;
    border-color: color-mix(in oklab, #ffffff 45%, transparent) !important;
  }
  .paper-flow .print-page img { filter: none !important; }
}`;
}

export {
  FONT_SCALE_OPTIONS,
  FOOTER_OPTIONS,
  MARGIN_OPTIONS,
  PAPER_SIZE_OPTIONS,
  SPACING_OPTIONS,
  TYPEFACE_OPTIONS,
};
