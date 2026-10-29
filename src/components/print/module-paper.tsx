import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { getColorTheme } from "@/lib/themes";
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
  /** full-page hero on sheet 1; the lesson proper starts on sheet 2 */
  includeTitlePage: boolean;
  /** "module" follows the module accent, otherwise a COLOR_THEMES id */
  coverTheme: string;
  /**
   * Vertical offset of the running header from the top margin, in % of sheet
   * height. Negative lifts it towards the paper edge, positive pushes it in.
   */
  headerInset: number;
  /**
   * Vertical offset of the footer from the bottom margin, in % of sheet height.
   * Positive lifts it up towards the text, negative drops it towards the edge.
   */
  footerInset: number;
  includeAnswerKey: boolean;
  includeNotes: boolean;
  /** preview-only: shows the editor for extra pages. The pages themselves are
   *  always part of the printed flow once they contain text. */
  editMode?: boolean;
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
  includeTitlePage: true,
  coverTheme: "module",
  headerInset: 0,
  footerInset: 0,
  includeAnswerKey: true,
  includeNotes: true,
};

export const STORAGE_KEY_MODULE_PRINT = "knowly.module-print.v1";
const STORAGE_KEY_MODULE_PAGES = "knowly.module-print-pages.v1";

const DEFAULT_ACCENT = "#3b5bdb";

/** Real margins in inches (96 CSS px per inch), identical for every paper size
 *  and orientation. */
const MARGIN_IN: Record<PaperMarginId, number> = {
  narrow: 0.5,
  normal: 0.75,
  wide: 1,
};
const PX_PER_IN = 96;

/** Fixed bands inside the margins. Both are always reserved (even when empty)
 *  so every page has exactly the same content height as the paginator budgets. */
const HEADER_H = 28;
const FOOTER_H = 28;
/** Breathing room kept below the last line so nothing ever kisses the footer. */
const CONTENT_BOTTOM_CLEAR = 14;

const SPACING_FACTORS: Record<PaperSpacing, number> = {
  compact: 0.9,
  normal: 1,
  relaxed: 1.14,
};

/** Works for any CSS color (hex of any length, rgb(), hsl(), names). */
const withAlpha = (color: string, alphaPct: number) =>
  `color-mix(in srgb, ${color} ${alphaPct}%, transparent)`;

/* --------------------------------------------------------------------- *
 * Cover palettes
 * --------------------------------------------------------------------- */

interface CoverTone {
  start: string;
  middle: string;
  deep: string;
  glow: string;
}

/**
 * Cover gradient for the title sheet (and the in-flow hero when the title page
 * is off). `"module"` keeps the module's own accent; any other id is one of
 * the built-in Knowly palettes. Light palettes get deepened so the white cover
 * ink keeps its contrast instead of printing pale-on-pale.
 */
function coverTone(moduleColor: string, themeId: string): CoverTone {
  const accent = moduleColor || DEFAULT_ACCENT;
  const theme = themeId === "module" ? undefined : getColorTheme(themeId);
  if (!theme) {
    return {
      start: accent,
      middle: `color-mix(in oklab, ${accent} 52%, #0d131b)`,
      deep: "#0d131b",
      glow: `color-mix(in oklab, ${accent} 78%, #ffffff 24%)`,
    };
  }
  const { primary, accent: themeAccent, background } = theme.colors;
  if (theme.mode === "dark") {
    return {
      start: primary,
      middle: `color-mix(in oklab, ${primary} 52%, ${background})`,
      deep: background,
      glow: `color-mix(in oklab, ${themeAccent} 74%, #ffffff 26%)`,
    };
  }
  return {
    start: `color-mix(in oklab, ${primary} 78%, #10161f 22%)`,
    middle: `color-mix(in oklab, ${primary} 34%, #0d131b 66%)`,
    deep: `color-mix(in oklab, ${primary} 30%, #0d131b 70%)`,
    glow: `color-mix(in oklab, ${themeAccent} 62%, #ffffff 38%)`,
  };
}

const coverGradient = (tone: CoverTone) =>
  [
    // a whisper of shade at the top keeps the small header ink legible even
    // when the palette's glow is pale
    "linear-gradient(180deg, rgba(8, 12, 20, 0.26) 0%, rgba(8, 12, 20, 0) 26%)",
    `radial-gradient(130% 120% at 88% -15%, ${tone.glow} 0%, transparent 55%)`,
    `linear-gradient(158deg, ${tone.start} 0%, ${tone.middle} 62%, ${tone.deep} 100%)`,
  ].join(", ");

/* --------------------------------------------------------------------- *
 * Markdown splitting
 * --------------------------------------------------------------------- */

interface Piece {
  text: string;
  blurb: boolean;
  kind: PieceKind;
}

type PieceKind = "para" | "list" | "quote" | "table" | "block";

function splitPieces(
  lines: string[],
  allowFence: boolean,
  allowMath: boolean,
): { pieces: Piece[]; fenceOpen: boolean; mathOpen: boolean } {
  const pieces: Piece[] = [];
  let current: string[] = [];
  let kind: PieceKind | null = null;
  let fence = false;
  let math = false;
  let orderCounter: number | null = null;

  const flush = () => {
    if (current.length) {
      const text = current.join("\n").trim();
      if (text) {
        const first = current[0].trim();
        pieces.push({
          text,
          blurb: first.startsWith("|") || first.startsWith("```") || first.startsWith("$$"),
          kind: kind ?? "para",
        });
      }
    }
    current = [];
    kind = null;
  };
  const start = (k: PieceKind, line: string) => {
    flush();
    kind = k;
    current.push(line);
  };

  for (const line of lines) {
    const t = line.trim();

    // fenced code: blank lines inside stay inside
    if (allowFence && t.startsWith("```")) {
      if (fence) {
        current.push(line);
        flush();
        fence = false;
      } else {
        start("block", line);
        fence = true;
      }
      orderCounter = null;
      continue;
    }
    if (fence) {
      current.push(line);
      continue;
    }

    // display math
    if (allowMath) {
      if (math) {
        current.push(line);
        if (t.endsWith("$$")) {
          flush();
          math = false;
        }
        continue;
      }
      if (t.startsWith("$$")) {
        orderCounter = null;
        if (t.endsWith("$$") && t.length > 4) {
          flush();
          pieces.push({ text: t, blurb: true, kind: "block" });
        } else {
          start("block", line);
          math = true;
        }
        continue;
      }
    }

    if (!t) {
      flush();
      continue;
    }

    // tables: consecutive rows stay one unbreakable blurb
    if (t.startsWith("|")) {
      if (kind !== "table") start("table", line);
      else current.push(line);
      orderCounter = null;
      continue;
    }

    // headings are their own piece
    if (/^#{1,6}\s/.test(line)) {
      flush();
      pieces.push({ text: t, blurb: false, kind: "para" });
      orderCounter = null;
      continue;
    }

    // list items (column zero) — each is its own breakable piece
    const ordered = /^(\d+)[.)]\s/.exec(line);
    if (ordered || /^[-*+]\s/.test(line)) {
      let out = line;
      if (ordered) {
        // keep numbering continuous even though items are split into units
        orderCounter = orderCounter === null ? Number(ordered[1]) : orderCounter + 1;
        out = line.replace(/^\d+/, String(orderCounter));
      } else {
        orderCounter = null;
      }
      start("list", out);
      continue;
    }

    // blockquote: consecutive "> " lines are one piece
    if (t.startsWith(">")) {
      if (kind !== "quote") start("quote", line);
      else current.push(line);
      orderCounter = null;
      continue;
    }

    // indented line: continuation of whatever is open
    if (!/^\S/.test(line)) {
      if (kind) current.push(line);
      else start("para", line);
      continue;
    }

    // plain column-zero text: hard-wrapped continuation of a paragraph,
    // list item or quote; otherwise a fresh paragraph
    if (kind === "para" || kind === "list" || kind === "quote") {
      current.push(line);
    } else {
      start("para", line);
      orderCounter = null;
    }
  }
  flush();
  return { pieces, fenceOpen: fence, mathOpen: math };
}

/**
 * Split markdown into page-breakable pieces so regular text fills pages to the
 * last line. Tables, code fences and display math stay glued and are tagged
 * `blurb` so the paginator gives them clearance. Unclosed ``` or $$ markers
 * are treated as plain text instead of swallowing the rest of the block.
 */
function chunkPieces(source: string): Piece[] {
  const lines = source.split(/\r?\n/);
  let result = splitPieces(lines, true, true);
  if (result.fenceOpen || result.mathOpen) {
    result = splitPieces(lines, !result.fenceOpen, !result.mathOpen);
  }
  const pieces = result.pieces.length
    ? result.pieces
    : [{ text: source.trim(), blurb: false, kind: "para" as PieceKind }];
  // a single table or code block taller than the page would otherwise be
  // clipped (and, before the content row clipped, paint over the footer):
  // chop the long ones into page-sized chunks
  return pieces.flatMap(expandOversizedPiece);
}

/** Long tables keep their header on every chunk; long code fences re-open. */
function expandOversizedPiece(piece: Piece): Piece[] {
  if (piece.text.startsWith("|")) return splitTablePiece(piece);
  if (piece.text.startsWith("```")) return splitCodePiece(piece);
  return [piece];
}

const TABLE_ROWS_PER_CHUNK = 10;
const CODE_LINES_PER_CHUNK = 38;
/** Rows a table needs before it is worth chunking (header plus a full run). */
const TABLE_SPLIT_THRESHOLD = 16;

function splitTablePiece(piece: Piece): Piece[] {
  const rows = piece.text.split("\n");
  const separator = rows[1] ?? "";
  const isTable = rows.length > 2 && /^\s*\|?[\s:|-]*-{2,}[\s:|-]*\|?\s*$/.test(separator);
  if (!isTable || rows.length - 2 <= TABLE_SPLIT_THRESHOLD) return [piece];

  const header = rows.slice(0, 2);
  const body = rows.slice(2);
  const chunks: Piece[] = [];
  for (let start = 0; start < body.length; start += TABLE_ROWS_PER_CHUNK) {
    chunks.push({
      text: [...header, ...body.slice(start, start + TABLE_ROWS_PER_CHUNK)].join("\n"),
      blurb: true,
      kind: "table",
    });
  }
  return chunks;
}

function splitCodePiece(piece: Piece): Piece[] {
  const lines = piece.text.split("\n");
  const opening = lines[0];
  const hasCloser = lines.length > 2 && lines[lines.length - 1].trim().startsWith("```");
  const body = lines.slice(1, hasCloser ? -1 : undefined);
  if (body.length <= CODE_LINES_PER_CHUNK) return [piece];

  const chunks: Piece[] = [];
  for (let start = 0; start < body.length; start += CODE_LINES_PER_CHUNK) {
    chunks.push({
      text: [opening, ...body.slice(start, start + CODE_LINES_PER_CHUNK), "```"].join("\n"),
      blurb: true,
      kind: "block",
    });
  }
  return chunks;
}

/* --------------------------------------------------------------------- *
 * Content units
 * --------------------------------------------------------------------- */

type ModuleUnitData =
  | { kind: "hero" }
  | { kind: "objectives"; items: string[] }
  | {
      kind: "markdown";
      text: string;
      blurb?: boolean;
      list?: boolean;
      listStart?: boolean;
      pageBreak?: boolean;
    }
  | { kind: "callout"; block: CourseBlock; text?: string; first?: boolean }
  | { kind: "example"; block: CourseBlock; text?: string; first?: boolean }
  | { kind: "image"; block: CourseBlock }
  | { kind: "divider" }
  | { kind: "checkpoint"; questionId: string; number: number }
  | { kind: "activity"; block: CourseBlock; index: number }
  | { kind: "notes"; text: string; first?: boolean }
  | { kind: "answer-header" }
  | { kind: "answer-item"; number: number; questionId: string };

interface ModuleUnit {
  id: string;
  data: ModuleUnitData;
}

/**
 * Spacing above each unit between page content; the first unit on a page
 * drops it (see UnitSpace's `flush`).
 */
const UNIT_SPACE: Partial<Record<ModuleUnitData["kind"], number>> = {
  hero: 0,
  objectives: 14,
  markdown: 8,
  callout: 10,
  example: 10,
  image: 8,
  divider: 12,
  checkpoint: 14,
  activity: 10,
  notes: 16,
  "answer-header": 22,
  "answer-item": 6,
};

const unitSpacePad = (unit: ModuleUnit) => {
  const data = unit.data;
  // list items are one unit each: inside a list the gap is the line rhythm,
  // while the first item keeps the normal paragraph gap from the prose above
  if (data.kind === "markdown" && data.list) return data.listStart ? 8 : 2;
  // a split callout/example/notes continues on the same rhythm
  if (data.kind === "callout" || data.kind === "example") {
    return data.first === false ? 3 : 10;
  }
  if (data.kind === "notes") return data.first === false ? 4 : 16;
  return UNIT_SPACE[data.kind] ?? 8;
};

const DIFFICULTY_LABEL = ["", "Intro", "Core", "Advanced"] as const;

const TONE_BG: Record<string, { border: string; bg: string; text: string; label: string }> = {
  info: {
    border: "oklch(0.55 0.17 265 / 0.35)",
    bg: "oklch(0.55 0.17 265 / 0.08)",
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

function buildUnits(
  module: Module,
  options: ModulePrintOptions,
  extraPages: string[],
): ModuleUnit[] {
  const units: ModuleUnit[] = [];
  let uid = 0;
  const push = (data: ModuleUnitData) => {
    units.push({ id: `munit-${++uid}`, data });
  };

  if (!options.includeTitlePage) {
    push({ kind: "hero" });
  }
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
      case "markdown": {
        let previousKind: PieceKind | null = null;
        for (const piece of chunkPieces(block.markdown ?? "")) {
          push({
            kind: "markdown",
            text: piece.text,
            blurb: piece.blurb,
            list: piece.kind === "list",
            listStart: piece.kind === "list" && previousKind !== "list",
          });
          previousKind = piece.kind;
        }
        break;
      }
      case "callout": {
        chunkPieces(block.markdown ?? "").forEach((piece, index) => {
          push({ kind: "callout", block, text: piece.text, first: index === 0 });
        });
        break;
      }
      case "example": {
        chunkPieces(block.markdown ?? "").forEach((piece, index) => {
          push({ kind: "example", block, text: piece.text, first: index === 0 });
        });
        break;
      }
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
    chunkPieces(module.notes).forEach((piece, index) => {
      push({ kind: "notes", text: piece.text, first: index === 0 });
    });
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

  // user-typed pages: each starts on a fresh sheet and is paginated like
  // everything else, so long text never gets clipped
  for (const text of extraPages) {
    if (!text.trim()) continue;
    push({ kind: "markdown", text: "", blurb: false, pageBreak: true });
    let previousKind: PieceKind | null = null;
    for (const piece of chunkPieces(text)) {
      push({
        kind: "markdown",
        text: piece.text,
        blurb: piece.blurb,
        list: piece.kind === "list",
        listStart: piece.kind === "list" && previousKind !== "list",
      });
      previousKind = piece.kind;
    }
  }

  return units;
}

const samePages = (a: ModuleUnit[][], b: ModuleUnit[][]) =>
  a.length === b.length &&
  a.every((page, i) => page.length === b[i].length && page.every((u, j) => u === b[i][j]));

function loadExtraPages(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((p) => typeof p === "string") && parsed.length) {
        return parsed as string[];
      }
    }
  } catch {
    /* storage unavailable or corrupt — start empty */
  }
  return [""];
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
  const margin = Math.round(MARGIN_IN[options.margins] * PX_PER_IN);
  const padX = margin;
  const padTop = margin;
  const padBottom = margin;
  const contentWidth = Math.max(200, dims.width - padX * 2);
  // header/footer can be nudged either way from their margin; the content area
  // gives up exactly that much room so the bands never overlap the flow. The
  // clamp keeps both bands on the sheet at extreme values or small papers.
  const headerInset = Math.max(
    4 - padTop,
    Math.round((options.headerInset ?? 0) * dims.height * 0.01),
  );
  const footerInset = Math.max(
    4 - padBottom,
    Math.round((options.footerInset ?? 0) * dims.height * 0.01),
  );
  // header and footer are fixed bands inside the padding, always reserved, so
  // this is exactly the height of the flex-1 content area on every page
  const contentHeight = Math.max(
    200,
    dims.height -
      padTop -
      padBottom -
      HEADER_H -
      FOOTER_H -
      headerInset -
      footerInset -
      CONTENT_BOTTOM_CLEAR,
  );
  const fontPx = options.fontScale === "small" ? 11.5 : options.fontScale === "large" ? 13.5 : 12.5;
  const lineHeight = 1.55 * SPACING_FACTORS[options.spacing];
  const fontFamily = TYPEFACE_OPTIONS.find((t) => t.id === options.typeface)?.stack;

  const pagesKey = `${STORAGE_KEY_MODULE_PAGES}.${module.id}`;
  const [editPages, setEditPages] = useState<string[]>(() => loadExtraPages(pagesKey));
  const [activeTextareaIndex, setActiveTextareaIndex] = useState<number>(0);
  const deferredEditPages = useDeferredValue(editPages);

  // reload when switching modules
  const loadedKey = useRef(pagesKey);
  useEffect(() => {
    if (loadedKey.current !== pagesKey) {
      loadedKey.current = pagesKey;
      setEditPages(loadExtraPages(pagesKey));
      setActiveTextareaIndex(0);
    }
  }, [pagesKey]);

  // persist typed pages so a remount or option change never loses them
  useEffect(() => {
    if (loadedKey.current !== pagesKey) return;
    try {
      if (editPages.every((p) => !p.trim())) window.localStorage.removeItem(pagesKey);
      else window.localStorage.setItem(pagesKey, JSON.stringify(editPages));
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [editPages, pagesKey]);

  const units = useMemo(
    () => buildUnits(module, options, deferredEditPages),
    [module, options, deferredEditPages],
  );

  const measureRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<ModuleUnit[][] | null>(null);
  const [stageWidth, setStageWidth] = useState<number | null>(null);

  /* paginate by measuring the hidden flow (reads the DOM, writes only `pages`) */
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      const host = measureRef.current;
      if (!host || cancelled) return;
      const slots = Array.from(host.children) as HTMLElement[];
      if (!slots.length) {
        setPages((prev) => (prev && prev.length === 0 ? prev : []));
        return;
      }
      const heights = slots.map((slot) => slot.getBoundingClientRect().height);
      const built: ModuleUnit[][] = [];
      // when a blurb would sit tighter than this above the page floor, it
      // moves to the next page instead of being forced to fit
      const clearance = Math.round(contentHeight * 0.075);
      const blurbish = (unit: ModuleUnit) => {
        const data = unit.data;
        if (data.kind === "markdown") return data.blurb === true;
        // split bodies flow like regular text; only the opening card keeps the
        // whole-blurb bottom clearance
        if (data.kind === "callout" || data.kind === "example" || data.kind === "notes") {
          return data.first !== false;
        }
        return ["image", "objectives", "checkpoint", "activity"].includes(data.kind);
      };
      const isHeading = (unit: ModuleUnit) =>
        unit.data.kind === "markdown" && /^#{1,6}\s/.test(unit.data.text);
      let current: ModuleUnit[] = [];
      let cursor = 0;
      for (const [index, unit] of units.entries()) {
        const boxHeight = heights[index] ?? 0;
        const pad = unitSpacePad(unit);
        const contentOnly = Math.max(0, boxHeight - pad);
        const reserve = blurbish(unit) ? clearance : 0;
        const forced =
          unit.data.kind === "answer-header" ||
          (unit.data.kind === "markdown" && unit.data.pageBreak === true);
        // exactly what this unit adds to the page it lands on: the first unit
        // on a page drops its leading gap, every later one keeps it.
        const take = current.length === 0 ? contentOnly : boxHeight;
        // never leave a heading stranded at the page floor: if what follows
        // would not fit beside it, the heading moves to the next page too
        const next = units[index + 1];
        const orphan =
          current.length > 0 &&
          isHeading(unit) &&
          next !== undefined &&
          cursor + take + (heights[index + 1] ?? 0) + (blurbish(next) ? clearance : 0) >
            contentHeight;
        if (current.length > 0 && (forced || orphan || cursor + take + reserve > contentHeight)) {
          built.push(current);
          current = [];
          cursor = 0;
        }
        current.push(unit);
        cursor += current.length === 1 ? contentOnly : boxHeight;
      }
      if (current.length > 0) built.push(current);
      // skip no-op updates so observer callbacks don't re-render every page
      setPages((prev) => (prev && samePages(prev, built) ? prev : built));
    };

    run();
    // fonts: a failure in run() itself must not be swallowed
    document.fonts?.ready.then(run, () => undefined);
    // images: wait for them so the first measurement is the real one
    const urls = units.flatMap((u) =>
      u.data.kind === "image" && u.data.block.url ? [u.data.block.url] : [],
    );
    if (urls.length) {
      Promise.all(
        urls.map(
          (src) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => resolve();
              img.src = src;
            }),
        ),
      ).then(run);
    }
    // late typesetting (KaTeX, fonts) resizes the hidden flow after the first
    // pass; re-paginate whenever it changes
    const flow = measureRef.current;
    let observer: ResizeObserver | null = null;
    if (flow && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => run());
      observer.observe(flow);
    }
    return () => {
      cancelled = true;
      observer?.disconnect();
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
  const titlePage = options.includeTitlePage;
  // the title page counts as page 1; typed pages are part of `pages`, so the
  // total is identical with edit mode on or off
  const totalPages = (pages?.length ?? 0) + (titlePage ? 1 : 0);
  const footerPageText = (page: number) => {
    if (options.footerStyle === "of") return `Page ${page} of ${totalPages}`;
    if (options.footerStyle === "plain") return String(page);
    return `${page} / ${totalPages}`;
  };

  const padding = { padX, padTop, padBottom };
  const accent = module.color || DEFAULT_ACCENT;

  const focusTextarea = (index: number) =>
    requestAnimationFrame(() => document.getElementById(`edit-textarea-${index}`)?.focus());

  return (
    <div className="max-w-full">
      <style>{modulePrintStylesheet(dims, contentHeight)}</style>
      {/* hidden measuring flow */}{" "}
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
          <UnitSpace
            key={unit.id}
            unit={unit}
            module={module}
            decks={decks}
            coverTheme={options.coverTheme}
          />
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
              padding={padding}
              fontSize={fontPx}
              fontFamily={fontFamily}
              lineHeight={lineHeight}
              headerInset={headerInset}
              footerInset={footerInset}
            >
              <div className="grid h-full place-items-center rounded-lg text-muted-foreground">
                Preparing print preview…
              </div>
            </ModuleSheet>
          ))}

        {titlePage && (
          <ModuleSheet key="title-page" dims={dims} scale={scale} padding={padding} fullBleed>
            <TitlePageBody
              module={module}
              padX={padX}
              accent={accent}
              coverTheme={options.coverTheme}
            />
          </ModuleSheet>
        )}

        {pages?.map((pageUnits, pageIndex) => (
          <ModuleSheet
            key={`page-${pageIndex}`}
            dims={dims}
            scale={scale}
            padding={padding}
            fontSize={fontPx}
            fontFamily={fontFamily}
            lineHeight={lineHeight}
            headerInset={headerInset}
            footerInset={footerInset}
            // no running header over the in-flow hero when there is no title page
            headerText={options.runningHeader && (titlePage || pageIndex > 0) ? module.title : null}
            footer={{
              left: module.title,
              text:
                options.footerStyle === "none"
                  ? null
                  : footerPageText(pageIndex + (titlePage ? 2 : 1)),
            }}
          >
            {pageUnits.map((unit, unitIndex) => (
              <UnitSpace
                key={unit.id}
                unit={unit}
                module={module}
                decks={decks}
                coverTheme={options.coverTheme}
                flush={unitIndex === 0}
              />
            ))}
          </ModuleSheet>
        ))}

        {options.editMode && (
          <div className="edit-panel w-full space-y-3">
            <div className="flex flex-wrap items-center gap-2 pb-2">
              <span className="text-[0.72em] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Your pages
              </span>
              <span className="text-[11px] text-muted-foreground">
                Each box starts a new sheet; more text continues on additional sheets. Enter starts
                a new page at the cursor; Shift+Enter inserts a line break.
              </span>
              <button
                type="button"
                className="ml-auto rounded-md border border-border bg-surface-2/60 px-3 py-1 text-xs text-foreground/70 hover:border-primary/40"
                onClick={() => {
                  const target = editPages.length;
                  setEditPages((prev) => [...prev, ""]);
                  setActiveTextareaIndex(target);
                  focusTextarea(target);
                }}
              >
                + Add page
              </button>
            </div>
            {editPages.map((text, i) => (
              <div key={i} className="edit-page-group flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`edit-textarea-${i}`}
                    className="text-[0.68em] font-medium text-muted-foreground"
                  >
                    Your page {i + 1}
                  </label>
                  {editPages.length > 1 && (
                    <button
                      type="button"
                      className="text-[11px] text-muted-foreground hover:text-foreground/80"
                      onClick={() => {
                        const target = Math.max(0, Math.min(i, editPages.length - 2));
                        setEditPages((prev) => prev.filter((_, idx) => idx !== i));
                        setActiveTextareaIndex(target);
                        focusTextarea(target);
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <textarea
                  id={`edit-textarea-${i}`}
                  aria-label={`Your page ${i + 1} (markdown)`}
                  className={cn(
                    "edit-textarea w-full resize-y rounded-md border bg-surface-2/70 px-3 py-2 text-sm leading-relaxed text-foreground outline-none transition-colors",
                    i === activeTextareaIndex
                      ? "border-primary/60 bg-surface-2 focus:border-primary/60"
                      : "border-border hover:border-border/80",
                  )}
                  style={{ fontFamily, fontSize: 13, lineHeight: 1.6 }}
                  value={text}
                  onFocus={() => setActiveTextareaIndex(i)}
                  onChange={(e) =>
                    setEditPages((prev) => {
                      const next = [...prev];
                      next[i] = e.target.value;
                      return next;
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      const val = e.currentTarget.value;
                      const caret = e.currentTarget.selectionStart;
                      const before = val.slice(0, caret);
                      const after = val.slice(e.currentTarget.selectionEnd);
                      setEditPages((prev) => {
                        const next = [...prev];
                        next[i] = before;
                        next.splice(i + 1, 0, after);
                        return next;
                      });
                      setActiveTextareaIndex(i + 1);
                      focusTextarea(i + 1);
                    }
                  }}
                  placeholder={"Type your markdown here — LaTeX: $E=mc^2$ or $$...$$"}
                  rows={3}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UnitSpace({
  unit,
  module,
  decks,
  coverTheme,
  flush,
}: {
  unit: ModuleUnit;
  module: Module;
  decks: Deck[];
  coverTheme?: string;
  /** first unit on a page: the inter-unit spacing above is dropped */
  flush?: boolean;
}) {
  // flow-root contains children's margins so the measured height is the real one
  return (
    <div style={{ paddingTop: flush ? 0 : unitSpacePad(unit), display: "flow-root" }}>
      <UnitView unit={unit} module={module} decks={decks} coverTheme={coverTheme} />
    </div>
  );
}

/* --------------------------------------------------------------------- *
 * Unit renderers — the colorful part
 * --------------------------------------------------------------------- */

function UnitView({
  unit,
  module,
  decks,
  coverTheme,
}: {
  unit: ModuleUnit;
  module: Module;
  decks: Deck[];
  coverTheme?: string;
}) {
  const data = unit.data;
  const accent = module.color || DEFAULT_ACCENT;
  const accentInk = `color-mix(in oklab, ${accent} 78%, #171c26 22%)`;

  switch (data.kind) {
    case "hero":
      return (
        <div
          className="module-hero relative overflow-hidden rounded-2xl px-6 pb-5 pt-6 text-white"
          style={{ background: coverGradient(coverTone(accent, coverTheme ?? "module")) }}
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
          style={{ borderLeft: `3px solid ${accent}`, background: withAlpha(accent, 5) }}
        >
          <p
            className="text-[0.74em] font-bold uppercase tracking-[0.2em]"
            style={{ color: accentInk }}
          >
            What you'll learn
          </p>
          <ul className="mt-2.5 space-y-[0.45em] pl-[1.1em]">
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
      return (
        <ModuleMarkdownText
          variant="paper"
          accent={accent}
          markdown={data.text}
          className={
            data.list
              ? "[&_ul]:my-0 [&_ol]:my-0 [&_li]:my-[0.12em] [&_li>ul]:mt-[0.15em] [&_li>ol]:mt-[0.15em]"
              : undefined
          }
        />
      );
    case "callout": {
      const tone = TONE_BG[data.block.tone ?? "info"] ?? TONE_BG.info;
      const body = data.text ?? data.block.markdown ?? "";
      if (data.first === false) {
        // continuation of a callout split across pages: keep the colored rule,
        // drop the card chrome and the repeated label
        return (
          <div className="pl-3.5" style={{ borderLeft: `3px solid ${tone.border}` }}>
            <ModuleMarkdownText variant="paper" accent={accent} markdown={body} />
          </div>
        );
      }
      return (
        <div
          className="rounded-xl px-4 py-3.5"
          style={{ borderLeft: `3px solid ${tone.border}`, background: tone.bg }}
        >
          <p
            className="text-[0.74em] font-bold uppercase tracking-[0.18em]"
            style={{ color: tone.text }}
          >
            {data.block.title || tone.label}
          </p>
          <div className="mt-1">
            <ModuleMarkdownText variant="paper" accent={accent} markdown={body} />
          </div>
        </div>
      );
    }
    case "example": {
      const tone = TONE_BG.example;
      const body = data.text ?? data.block.markdown ?? "";
      if (data.first === false) {
        return (
          <div className="pl-3.5" style={{ borderLeft: `3px solid ${tone.border}` }}>
            <ModuleMarkdownText variant="paper" accent={accent} markdown={body} />
          </div>
        );
      }
      return (
        <div
          className="rounded-xl px-4 py-3.5"
          style={{ borderLeft: `3px solid ${tone.border}`, background: tone.bg }}
        >
          <p
            className="text-[0.74em] font-bold uppercase tracking-[0.18em]"
            style={{ color: tone.text }}
          >
            {data.block.title || "Worked example"}
          </p>
          <div className="mt-1">
            <ModuleMarkdownText variant="paper" accent={accent} markdown={body} />
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
              loading="eager"
              decoding="sync"
              className="mx-auto max-h-64 rounded-xl object-contain"
              style={{ border: `1px solid ${withAlpha(accent, 27)}` }}
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
          style={{ borderLeft: `3px solid ${accent}`, background: withAlpha(accent, 6) }}
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
                background: `repeating-linear-gradient(90deg, ${withAlpha(accent, 40)} 0 3px, transparent 3px 6px)`,
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
          style={{ borderColor: withAlpha(accent, 53), background: withAlpha(accent, 3) }}
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
        <div className="pl-3.5" style={{ borderLeft: `3px solid ${withAlpha(accent, 33)}` }}>
          {data.first !== false && (
            <p
              className="text-[0.72em] font-bold uppercase tracking-[0.2em]"
              style={{ color: accentInk }}
            >
              My notes
            </p>
          )}
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
        <ol className="mt-2 space-y-1 pl-[1.1em]">
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
 * Title page — the hero takes all of sheet 1
 * --------------------------------------------------------------------- */

function TitlePageBody({
  module,
  padX,
  accent,
  coverTheme,
}: {
  module: Module;
  padX: number;
  accent: string;
  coverTheme: string;
}) {
  const objectives = module.objectives.slice(0, 4);
  return (
    <div
      className="module-hero relative flex size-full flex-col overflow-hidden px-[13%] py-[9%] text-white"
      style={{ background: coverGradient(coverTone(accent, coverTheme)) }}
    >
      {/* thin frame ornament */}
      <div
        aria-hidden
        className="pointer-events-none absolute border border-white/20"
        style={{ inset: Math.round(padX * 0.55) }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute border border-white/10"
        style={{ inset: Math.round(padX * 0.55) + 7 }}
      />

      {/* ghost emoji ornament */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 top-8 select-none text-[9em] leading-none opacity-[0.12]"
      >
        {module.emoji || "📘"}
      </span>

      {/* head */}
      <div className="relative flex items-center justify-between text-[0.72em] font-semibold uppercase tracking-[0.3em] text-white/80">
        <span>KNOWLY</span>
        <span className="text-white/70">Module · {module.subject}</span>
      </div>

      {/* centered title block */}
      <div className="relative my-auto py-8 text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-[1.1em] border border-white/25 bg-white/12 text-3xl">
          {module.emoji || "📘"}
        </span>
        <h1 className="mx-auto mt-7 max-w-[92%] text-[2.5em] font-bold leading-[1.14] tracking-tight text-white">
          {module.title}
        </h1>
        <div aria-hidden className="mt-7 flex items-center justify-center gap-2.5">
          <span className="h-px w-12 bg-white/50" />
          <span className="size-1.5 rotate-45 rounded-[0.1em] bg-white/70" />
          <span className="h-px w-6 bg-white/40" />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {[
            `${module.estimatedMinutes} min`,
            DIFFICULTY_LABEL[module.difficulty],
            module.questions.length ? `${module.questions.length} checkpoints` : null,
          ]
            .filter(Boolean)
            .map((chip, index) => (
              <span
                key={index}
                className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[0.75em] font-semibold uppercase tracking-[0.14em] text-white/90"
              >
                {chip}
              </span>
            ))}
        </div>
        {objectives.length > 0 && (
          <ul className="mx-auto mt-8 max-w-[80%] space-y-[0.55em] pl-[1em] text-left">
            {objectives.map((objective) => (
              <li key={objective} className="flex gap-2.5 text-[0.9em] text-white/85">
                <span
                  aria-hidden
                  className="mt-[0.55em] size-1.5 shrink-0 rotate-45 rounded-[0.08em] bg-white/60"
                />
                <span className="min-w-0 text-pretty">{objective}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- *
 * Sheet shell
 *
 * Layout inside the margins is three fixed/flex rows:
 *   header band (HEADER_H) · content (flex-1) · footer band (FOOTER_H)
 * Both bands are always rendered, so content height never depends on which
 * header/footer options are on.
 * --------------------------------------------------------------------- */

function ModuleSheet({
  dims,
  scale,
  padding,
  fontSize,
  fontFamily,
  lineHeight,
  headerInset = 0,
  footerInset = 0,
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
  /** px between the top margin and the header band */
  headerInset?: number;
  /** px between the footer band and the bottom margin */
  footerInset?: number;
  headerText?: string | null;
  footer?: { left: string; text: string | null };
  fullBleed?: boolean;
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
          className="print-page module-paper relative flex flex-col overflow-hidden bg-card"
          style={{
            width: dims.width,
            height: dims.height,
            boxSizing: "border-box",
            // ring + shadow instead of a border: the content box is the same
            // size on screen and in print
            boxShadow:
              "0 0 0 1px color-mix(in oklab, var(--foreground) 12%, transparent), 0 24px 60px -34px color-mix(in oklab, var(--foreground) 42%, transparent)",
          }}
        >
          {fullBleed ? (
            <div className="h-full">{children}</div>
          ) : (
            <div
              className="flex h-full flex-col"
              style={{
                boxSizing: "border-box",
                paddingLeft: padding.padX,
                paddingRight: padding.padX,
                paddingTop: padding.padTop,
                paddingBottom: padding.padBottom,
                fontSize,
                fontFamily,
                lineHeight,
                color: "var(--foreground)",
              }}
            >
              <div
                aria-hidden
                className="flex shrink-0 items-center justify-center text-[9px] font-semibold uppercase tracking-[0.28em] text-muted-foreground"
                style={{ height: HEADER_H, marginTop: headerInset }}
              >
                {headerText}
              </div>
              <div className="paper-content min-h-0 flex-1 overflow-hidden">{children}</div>
              <footer
                className="flex shrink-0 items-center justify-between gap-5 text-muted-foreground"
                style={{ height: FOOTER_H, marginTop: "auto", marginBottom: footerInset }}
              >
                {footer?.text && (
                  <>
                    <span className="min-w-0 truncate text-[10px]">{footer.left}</span>
                    <span className="shrink-0 text-[10px] font-medium tabular-nums">
                      {footer.text}
                    </span>
                  </>
                )}
              </footer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- *
 * Print stylesheet
 *
 * Instead of forcing every element gray, pin the theme variables to a light
 * palette so theme-colored text/borders print dark on white, while inline
 * accent colors (labels, callout borders, badges) and white-on-color text
 * keep their colors.
 * --------------------------------------------------------------------- */

function modulePrintStylesheet(dims: { width: number; height: number }, contentHeight: number) {
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
    --foreground: #1f2937;
    --muted: #eef1f5;
    --muted-foreground: #6b7280;
    --border: #9ca3af;
    --card: #ffffff;
  }
  .print-page:last-of-type { break-after: auto; page-break-after: auto; }
  .module-paper { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  /* hard ceiling: content can never spill into the footer band, even if a
     single unit is taller than a page (it is clipped, never overprinted) */
  .print-page .paper-content {
    max-height: ${contentHeight}px !important;
    overflow: hidden !important;
  }
  .paper-flow .print-page { background-color: #ffffff !important; color: #1f2937 !important; }
  .paper-flow .print-page .text-foreground { color: #1f2937 !important; }
  .paper-flow .print-page .text-muted-foreground { color: #6b7280 !important; }
  .paper-flow .print-page .border-border { border-color: #9ca3af !important; }
  .paper-flow .print-page .border-foreground { border-color: #1f2937 !important; }
  .paper-flow .print-page img { filter: none !important; }
  .edit-panel { display: none !important; }
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
