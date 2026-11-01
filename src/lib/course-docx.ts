import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  PageBreak,
  PageNumber,
  PageOrientation,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { LETTERS, printableAnswer } from "@/lib/exam-print";
import { TYPE_LABELS } from "@/lib/answers";
import {
  PRINT_MARGIN_PX,
  getPaperDims,
  type CoursePrintOptions,
  type PaperFontScale,
  type PaperFooterStyle,
  type PaperOrientation,
  type PaperSizeId,
  type PaperSpacing,
  type PaperTypeface,
} from "@/components/print/course-paper";
import {
  type Course,
  type CourseBlock,
  type CourseProgress,
  type Deck,
  type Module,
  type Question,
} from "@/lib/types";

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

const GRAY = "6B7280";
const GRAY_LIGHT = "94A3B8";
const RULE = "CBD5E1";

const px = (value: number) => Math.round(value * 15); // px @96dpi → twips

/** `rgb(12, 34, 56)` and `color(srgb 0.1 0.2 0.3)` → `0C2238`. */
function computedColorToHex(value: string): string | null {
  const toHex = (channel: number) =>
    Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0");
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(value);
  if (rgb) {
    const [r, g, b] = rgb[1]!.split(/[,\s/]+/).filter(Boolean).map(Number);
    if ([r, g, b].some((channel) => !Number.isFinite(channel))) return null;
    return `${toHex(r!)}${toHex(g!)}${toHex(b!)}`.toUpperCase();
  }
  const srgb = /^color\(\s*srgb\s+([^)]+)\)$/i.exec(value);
  if (srgb) {
    const parts = srgb[1]!.trim().split(/\s+/).map(Number);
    if (parts.length < 3 || parts.some((channel) => !Number.isFinite(channel))) return null;
    return `${toHex(parts[0]! * 255)}${toHex(parts[1]! * 255)}${toHex(parts[2]! * 255)}`.toUpperCase();
  }
  return null;
}

/**
 * docx rejects anything but a six-digit hex colour, and every identity colour in
 * this app is a CSS token (`var(--deck-3)`) or a `color-mix()`. Resolve those to
 * real channels through the browser before they reach a shading or a text run.
 */
function resolveHex(color: string | undefined, fallback = "3B5BDB"): string {
  const raw = (color ?? "").trim();
  if (!raw) return fallback;
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(raw);
  if (short) return `${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toUpperCase();
  const full = /^#([0-9a-f]{6})$/i.exec(raw);
  if (full) return full[1]!.toUpperCase();
  const bare = /^([0-9a-f]{6})$/i.exec(raw);
  if (bare) return bare[1]!.toUpperCase();
  if (typeof document === "undefined") return fallback;
  const probe = document.createElement("span");
  probe.style.color = raw;
  // An unparseable value leaves the property empty, so nothing is guessed.
  if (!probe.style.color) return fallback;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  return computedColorToHex(computed) ?? fallback;
}

const hex = (color: string) => resolveHex(color);

/** Blend a hex color toward white — used for callout fills. */
function tint(color: string, amount: number): string {
  const value = hex(color);
  const mixed = (index: number) => {
    const channel = parseInt(value.slice(index, index + 2), 16);
    return Math.round(channel + (255 - channel) * amount)
      .toString(16)
      .padStart(2, "0");
  };
  return `${mixed(0)}${mixed(2)}${mixed(4)}`;
}

interface CalloutTone {
  from: string;
  label: string;
  border: string;
}

const CALLOUT_TONES: Record<string, CalloutTone> = {
  info: { from: "334155", label: "0F172A", border: GRAY_LIGHT },
  tip: { from: "334155", label: "0F172A", border: GRAY_LIGHT },
  warning: { from: "B45309", label: "92400E", border: "F59E0B" },
  definition: { from: "2563EB", label: "1E3A8A", border: "3B82F6" },
  example: { from: "059669", label: "065F46", border: "10B981" },
};

interface FlowStyle {
  /** shading fill applied to plain paragraphs (callout bodies) */
  fill?: string;
  borderColor?: string;
  italics?: boolean;
}

interface Shading {
  type: typeof ShadingType.CLEAR;
  fill: string;
}

interface BorderLeft {
  left: { style: typeof BorderStyle.SINGLE; size: number; color: string; space: number };
}

/* ------------------------------------------------------------------ *
 * Markdown → DOCX
 * ------------------------------------------------------------------ */

function inlineRuns(text: string, style: FlowStyle = {}): TextRun[] {
  const runs: TextRun[] = [];
  const pattern =
    /\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|!\[[^\]]*\]\([^)]*\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) runs.push(new TextRun(text.slice(last, match.index)));
    if (match[1] != null || match[2] != null) {
      runs.push(
        new TextRun({ text: match[1] ?? match[2] ?? "", bold: true, italics: style.italics }),
      );
    } else if (match[3] != null || match[4] != null) {
      runs.push(new TextRun({ text: match[3] ?? match[4] ?? "", italics: true }));
    } else if (match[5] != null) {
      runs.push(new TextRun({ text: match[5], font: "Consolas", size: 20 }));
    } else if (match[6] != null) {
      runs.push(new TextRun({ text: `${match[6]} (${match[7]})`, style: "Hyperlink" }));
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) runs.push(new TextRun(text.slice(last)));
  return runs.length > 0 ? runs : [new TextRun("")];
}

function mdTable(header: string[], rows: string[][], accent: string): Table {
  const borders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: RULE },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE },
    left: { style: BorderStyle.SINGLE, size: 4, color: RULE },
    right: { style: BorderStyle.SINGLE, size: 4, color: RULE },
  };
  const rowOf = (cells: string[], isHeader: boolean) =>
    new TableRow({
      tableHeader: isHeader,
      children: cells.map(
        (cell) =>
          new TableCell({
            borders,
            shading: isHeader ? { type: ShadingType.CLEAR, fill: tint(accent, 0.8) } : undefined,
            children: [new Paragraph({ children: inlineRuns(cell) })],
          }),
      ),
    });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [rowOf(header, true), ...rows.map((row) => rowOf(row, false))],
  });
}

function markdownToDocx(md: string, accent: string, style: FlowStyle = {}): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  const shading: Shading | undefined = style.fill
    ? { type: ShadingType.CLEAR, fill: style.fill }
    : undefined;
  const border: BorderLeft | undefined = style.borderColor
    ? {
        left: { style: BorderStyle.SINGLE, size: 18, color: style.borderColor, space: 6 },
      }
    : undefined;

  const lines = md.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.trim().startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      for (const codeLine of buf) {
        out.push(
          new Paragraph({
            shading: { type: ShadingType.CLEAR, fill: "F1F5F9" },
            spacing: { after: 0 },
            children: [
              new TextRun({ text: codeLine.length ? codeLine : " ", font: "Consolas", size: 20 }),
            ],
          }),
        );
      }
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(
        new Paragraph({
          heading:
            level === 1
              ? HeadingLevel.HEADING_1
              : level === 2
                ? HeadingLevel.HEADING_2
                : level === 3
                  ? HeadingLevel.HEADING_3
                  : HeadingLevel.HEADING_4,
          children: inlineRuns(heading[2]),
          spacing: { before: level <= 2 ? 200 : 140, after: 80 },
        }),
      );
      i++;
      continue;
    }
    const separator = lines[i + 1] ?? "";
    if (line.trim().startsWith("|") && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(separator)) {
      const parse = (l: string) =>
        l
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());
      const header = parse(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(parse(lines[i]));
        i++;
      }
      out.push(mdTable(header, rows, accent));
      out.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
      continue;
    }
    if (line.trim().startsWith(">")) {
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        out.push(
          new Paragraph({
            indent: { left: 360 },
            border: { left: { style: BorderStyle.SINGLE, size: 12, color: GRAY_LIGHT, space: 8 } },
            children: inlineRuns(lines[i].replace(/^\s*>\s?/, ""), { italics: true }),
            spacing: { after: 60 },
          }),
        );
        i++;
      }
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        out.push(
          new Paragraph({
            bullet: { level: 0 },
            children: inlineRuns(lines[i].replace(/^\s*[-*+]\s+/, ""), style),
            shading,
            border,
            indent: style.fill ? { left: 40 } : undefined,
            spacing: { after: 40 },
          }),
        );
        i++;
      }
      continue;
    }
    const ordered = /^\s*(\d+)[.)]\s+/;
    if (ordered.test(line)) {
      while (i < lines.length && ordered.test(lines[i])) {
        const marker = lines[i].match(ordered)![1];
        out.push(
          new Paragraph({
            indent: { left: 360 },
            children: [
              new TextRun({ text: `${marker}. `, bold: true }),
              ...inlineRuns(lines[i].replace(ordered, ""), style),
            ],
            shading,
            border,
            spacing: { after: 40 },
          }),
        );
        i++;
      }
      continue;
    }
    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
      out.push(
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 1 } },
          spacing: { before: 120, after: 120 },
          children: [],
        }),
      );
      i++;
      continue;
    }
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*([-*+]\s+|>|#{1,4}\s|\||```|\d+[.)]\s)/.test(lines[i]) &&
      !/^\s*(---+|\*\*\*+|___+)\s*$/.test(lines[i])
    ) {
      buf.push(lines[i].trim());
      i++;
    }
    // tables inside callouts lose their fill; paragraphs carry the shaded style
    out.push(
      new Paragraph({
        children: inlineRuns(buf.join(" "), style),
        shading,
        border,
        indent: style.fill ? { left: 40 } : undefined,
        spacing: { after: style.fill ? 40 : 120 },
      }),
    );
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Questions
 * ------------------------------------------------------------------ */

function metaRun(q: Question): TextRun {
  const bits = [TYPE_LABELS[q.type], q.difficulty, q.concept].filter(Boolean).join(" · ");
  return new TextRun({ text: `   (${bits})`, color: GRAY, size: 16 });
}

function questionChildren(q: Question, number: number): Paragraph[] {
  const out: Paragraph[] = [];
  out.push(
    new Paragraph({
      spacing: { before: 160, after: 60 },
      children: [
        new TextRun({ text: `${number}. `, bold: true }),
        ...inlineRuns(q.question),
        metaRun(q),
      ],
    }),
  );
  switch (q.type) {
    case "multiple-choice":
      (q.options ?? []).forEach((option, index) =>
        out.push(
          new Paragraph({
            indent: { left: 360 },
            children: [
              new TextRun({ text: `${LETTERS[index] ?? index + 1}. `, bold: true }),
              ...inlineRuns(option),
            ],
          }),
        ),
      );
      break;
    case "true-false":
      out.push(
        new Paragraph({ indent: { left: 360 }, children: [new TextRun("☐ True        ☐ False")] }),
      );
      break;
    case "ordering":
      (q.items ?? []).forEach((item) =>
        out.push(
          new Paragraph({
            indent: { left: 360 },
            children: [new TextRun("________  "), ...inlineRuns(item)],
          }),
        ),
      );
      break;
    case "matching": {
      (q.pairs ?? []).forEach((pair) =>
        out.push(
          new Paragraph({
            indent: { left: 360 },
            children: [new TextRun("________  "), new TextRun(pair.left)],
          }),
        ),
      );
      (q.pairs ?? []).forEach((pair, index) =>
        out.push(
          new Paragraph({
            indent: { left: 360 },
            children: [
              new TextRun({ text: `${LETTERS[index] ?? index + 1}. `, bold: true }),
              new TextRun(pair.right),
            ],
          }),
        ),
      );
      break;
    }
    case "word-bank": {
      if (q.wordBank?.length) {
        out.push(
          new Paragraph({
            indent: { left: 360 },
            children: [
              new TextRun({ text: "Word bank: ", bold: true }),
              new TextRun(q.wordBank.join(" · ")),
            ],
          }),
        );
      }
      const blanks = Math.max(1, q.blanks?.length ?? 1);
      for (let blank = 0; blank < blanks; blank++) {
        out.push(new Paragraph({ indent: { left: 360 }, children: [new TextRun("____________")] }));
      }
      break;
    }
    default:
      for (let line = 0; line < 3; line++) {
        out.push(
          new Paragraph({ indent: { left: 360 }, children: [new TextRun("____________________")] }),
        );
      }
      break;
  }
  return out;
}

function questionSet(label: string, questions: Question[]): Paragraph[] {
  if (questions.length === 0) return [];
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_4,
      spacing: { before: 200, after: 60 },
      children: [new TextRun(label)],
    }),
    ...questions.flatMap((q, index) => questionChildren(q, index + 1)),
  ];
}

function answerLines(questions: Question[]): Paragraph[] {
  return questions.map(
    (question, index) =>
      new Paragraph({
        spacing: { after: 50 },
        children: [
          new TextRun({ text: `${index + 1}. `, bold: true }),
          new TextRun(printableAnswer(question)),
          ...(question.explanation
            ? [new TextRun({ text: ` — ${question.explanation}`, italics: true, color: GRAY })]
            : []),
        ],
      }),
  );
}

async function imageChildren(block: CourseBlock): Promise<Paragraph[]> {
  if (block.url?.startsWith("data:image/")) {
    try {
      const comma = block.url.indexOf(",");
      const mime = block.url.slice(5, block.url.indexOf(";"));
      const bytes = Uint8Array.from(atob(block.url.slice(comma + 1)), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(
        new Blob([bytes.buffer as ArrayBuffer], { type: mime }),
      );
      const scale = Math.min(1, 460 / bitmap.width);
      return [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 80 },
          children: [
            new ImageRun({
              type: mime === "image/jpeg" ? "jpg" : "png",
              data: bytes,
              transformation: {
                width: Math.round(bitmap.width * scale),
                height: Math.round(bitmap.height * scale),
              },
            }),
          ],
        }),
      ];
    } catch {
      // fall through to the placeholder
    }
  }
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: block.caption ? `[Image: ${block.caption}]` : "[Image]",
          italics: true,
          color: GRAY,
        }),
      ],
    }),
  ];
}

/**
 * Course blocks rendered into Word runs. Lessons and the module sheet share
 * these, so a callout looks the same wherever it is printed.
 */
async function blockChildren(
  blocks: CourseBlock[],
  accent: string,
  onStatus?: (message: string) => void,
): Promise<(Paragraph | Table)[]> {
  const out: (Paragraph | Table)[] = [];
  for (const block of blocks) {
    if (block.type === "checkpoint") continue;
    if (block.type === "markdown") {
      out.push(...markdownToDocx(block.markdown ?? "", accent));
    } else if (block.type === "callout" || block.type === "example") {
      const tone =
        (block.type === "example" ? CALLOUT_TONES.example : CALLOUT_TONES[block.tone ?? "info"]) ??
        CALLOUT_TONES.info!;
      const fill = tint(tone.from, 0.88);
      out.push(
        new Paragraph({
          shading: { type: ShadingType.CLEAR, fill },
          border: {
            left: { style: BorderStyle.SINGLE, size: 18, color: tone.border, space: 6 },
          },
          indent: { left: 40 },
          spacing: { before: 140, after: 40 },
          children: [
            new TextRun({
              text: block.title || (block.type === "example" ? "Example" : "Note"),
              bold: true,
              color: tone.label,
            }),
          ],
        }),
      );
      out.push(...markdownToDocx(block.markdown ?? "", accent, { fill, borderColor: tone.border }));
    } else if (block.type === "image") {
      onStatus?.("Embedding image…");
      out.push(...(await imageChildren(block)));
    } else if (block.type === "divider") {
      out.push(
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 1 } },
          spacing: { before: 120, after: 120 },
          children: [],
        }),
      );
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Main builder
 * ------------------------------------------------------------------ */

export async function courseDocxBlob(
  course: Course,
  progress: CourseProgress | undefined,
  decks: Deck[],
  options: CoursePrintOptions,
  onStatus?: (message: string) => void,
): Promise<Blob> {
  const accent = hex(course.color);
  const docFontSizes = { small: 20, normal: 22, large: 25 } as const;

  onStatus?.("Gathering course content…");

  const children: (Paragraph | Table | TableOfContents)[] = [];
  const pushAll = (parts: (Paragraph | Table)[]) => {
    for (const part of parts) children.push(part);
  };
  const newPage = () => children.push(new Paragraph({ children: [new PageBreak()] }));

  /* cover */
  if (options.includeCover) {
    if (options.coverStyle === "book") {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  shading: { type: ShadingType.CLEAR, fill: accent },
                  margins: { top: 800, bottom: 800, left: 360, right: 360 },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      spacing: { after: 200 },
                      children: [
                        new TextRun({
                          text: `${course.subject}${course.level ? ` · ${course.level}` : ""} — Knowly study pack`,
                          color: "D8E4F0",
                          size: docFontSizes.small,
                          allCaps: true,
                        }),
                      ],
                    }),
                    new Paragraph({
                      spacing: { after: 260 },
                      children: [
                        new TextRun({
                          text: course.title,
                          bold: true,
                          color: "FFFFFF",
                          size: docFontSizes.large * 2,
                        }),
                      ],
                    }),
                    ...(course.description
                      ? [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: course.description,
                                italics: true,
                                color: "E2E8F0",
                                size: docFontSizes.normal,
                              }),
                            ],
                          }),
                        ]
                      : []),
                  ],
                }),
              ],
            }),
          ],
        }),
      );
    } else {
      children.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: `${course.subject}${course.level ? ` · ${course.level}` : ""} — Knowly study pack`,
              color: GRAY,
              allCaps: true,
              size: docFontSizes.small,
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 240, after: 200 },
          children: [new TextRun({ text: course.title, bold: true, size: docFontSizes.large * 2 })],
        }),
        ...(course.description
          ? [new Paragraph({ children: [new TextRun({ text: course.description, color: GRAY })] })]
          : []),
      );
    }
    newPage();
  }

  /* contents */
  if (options.includeToc) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 160 },
        children: [new TextRun("Contents")],
      }),
      new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-3" }),
      new Paragraph({
        spacing: { before: 160 },
        children: [
          new TextRun({
            text: "In Word: right-click the table and choose “Update Field” to refresh the page numbers.",
            italics: true,
            color: GRAY,
            size: 18,
          }),
        ],
      }),
    );
    if (options.breaks !== "lessons") newPage();
  }

  /* modules */
  const deckById = new Map(decks.map((deck) => [deck.id, deck]));
  const printedDecks = new Set<string>();
  const answeredDecks = new Set<string>();

  const pushDeck = (ids: string[], breakBeforeLessons: boolean) => {
    for (const id of ids) {
      const deck = deckById.get(id);
      if (!deck || deck.questions.length === 0 || printedDecks.has(id)) continue;
      printedDecks.add(id);
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          pageBreakBefore: breakBeforeLessons,
          spacing: { before: 200, after: 40 },
          children: [new TextRun(`Practice deck · ${deck.title}`)],
        }),
      );
      if (deck.description) {
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: deck.description, color: GRAY })],
          }),
        );
      }
      deck.questions.forEach((question, index) =>
        children.push(...questionChildren(question, index + 1)),
      );
    }
  };

  for (const [moduleIndex, module] of course.modules.entries()) {
    onStatus?.(`Writing module ${moduleIndex + 1} of ${course.modules.length} · ${module.title}`);
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        spacing: { after: 80 },
        children: [new TextRun(`Module ${moduleIndex + 1} · ${module.title}`)],
      }),
    );
    if (module.summary) {
      pushAll(markdownToDocx(module.summary, accent));
    }
    for (const objective of module.objectives) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 30 },
          children: inlineRuns(objective),
        }),
      );
    }

    for (const [lessonIndex, lesson] of module.lessons.entries()) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          pageBreakBefore: options.breaks === "lessons",
          spacing: { before: 240, after: 60 },
          children: [new TextRun(`Lesson ${lessonIndex + 1} · ${lesson.title}`)],
        }),
      );
      const meta = [
        `Lesson ${lessonIndex + 1}`,
        lesson.estimatedMinutes ? `${lesson.estimatedMinutes} min` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: meta, color: GRAY, size: 16, allCaps: true })],
        }),
      );
      if (lesson.summary) {
        pushAll(markdownToDocx(lesson.summary, accent));
      }
      for (const objective of lesson.objectives) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 30 },
            children: inlineRuns(objective),
          }),
        );
      }

      pushAll(await blockChildren(lesson.blocks, accent, onStatus));

      const lessonState = progress?.lessons[lesson.id];
      if (lessonState?.notes && options.includeNotes) {
        children.push(
          new Paragraph({
            border: { left: { style: BorderStyle.SINGLE, size: 18, color: GRAY_LIGHT, space: 6 } },
            indent: { left: 40 },
            spacing: { before: 140, after: 60 },
            children: [new TextRun({ text: "Lesson notes", bold: true, color: GRAY })],
          }),
        );
        pushAll(
          markdownToDocx(lessonState.notes, accent, { borderColor: GRAY_LIGHT, italics: true }),
        );
      }

      pushAll(questionSet("Check your understanding", lesson.questions));
    }

    if (module.quiz?.questions.length) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 40 },
          pageBreakBefore: options.breaks === "lessons",
          children: [new TextRun(`Module quiz · ${module.quiz.title}`)],
        }),
      );
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: `${module.quiz.questions.length} questions · pass at ${module.quiz.passingScore}%${module.quiz.timeLimitMinutes ? ` · ${module.quiz.timeLimitMinutes} min` : ""}`,
              color: GRAY,
              size: 16,
              allCaps: true,
            }),
          ],
        }),
      );
      module.quiz.questions.forEach((question, index) =>
        children.push(...questionChildren(question, index + 1)),
      );
    }

    pushDeck(module.linkedDeckIds, options.breaks === "lessons");
  }

  /* final exam */
  if (course.finalExam?.questions.length) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        spacing: { after: 40 },
        children: [new TextRun(`Final exam · ${course.finalExam.title}`)],
      }),
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: `${course.finalExam.questions.length} questions · pass at ${course.finalExam.passingScore}%${course.finalExam.timeLimitMinutes ? ` · ${course.finalExam.timeLimitMinutes} min` : ""}`,
            color: GRAY,
            size: 16,
            allCaps: true,
          }),
        ],
      }),
    );
    course.finalExam.questions.forEach((question, index) =>
      children.push(...questionChildren(question, index + 1)),
    );
  }

  /* course practice decks */
  pushDeck(course.linkedDeckIds, options.breaks === "lessons");

  /* answer key */
  if (options.includeAnswerKey) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        spacing: { after: 120 },
        children: [new TextRun("Answer key")],
      }),
    );
    course.modules.forEach((module, moduleIndex) => {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 40 },
          children: [new TextRun(`Module ${moduleIndex + 1} · ${module.title}`)],
        }),
      );
      module.lessons.forEach((lesson) => {
        if (!lesson.questions.length) return;
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 140, after: 40 },
            children: [new TextRun(`Lesson · ${lesson.title}`)],
          }),
        );
        children.push(...answerLines(lesson.questions));
      });
      if (module.quiz?.questions.length) {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 140, after: 40 },
            children: [new TextRun(`Module quiz · ${module.quiz.title}`)],
          }),
        );
        children.push(...answerLines(module.quiz.questions));
      }
      module.linkedDeckIds.forEach((id) => {
        const deck = deckById.get(id);
        if (!deck || !deck.questions.length || answeredDecks.has(id)) return;
        answeredDecks.add(id);
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 140, after: 40 },
            children: [new TextRun(`Practice deck · ${deck.title}`)],
          }),
        );
        children.push(...answerLines(deck.questions));
      });
    });
    if (course.finalExam?.questions.length) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 40 },
          children: [new TextRun(`Final exam · ${course.finalExam.title}`)],
        }),
      );
      children.push(...answerLines(course.finalExam.questions));
    }
    course.linkedDeckIds.forEach((id) => {
      const deck = deckById.get(id);
      if (!deck || !deck.questions.length || answeredDecks.has(id)) return;
      answeredDecks.add(id);
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 40 },
          children: [new TextRun(`Practice deck · ${deck.title}`)],
        }),
      );
      children.push(...answerLines(deck.questions));
    });
  }

  onStatus?.("Assembling the Word document…");
  return assembleDocx({
    title: course.title,
    description: course.description,
    children,
    options,
    onStatus,
  });
}

/* ------------------------------------------------------------------ *
 * Module sheet → DOCX
 * ------------------------------------------------------------------ */

export interface ModuleDocxOptions {
  paper: PaperSizeId;
  orientation: PaperOrientation;
  fontScale: PaperFontScale;
  typeface: PaperTypeface;
  spacing: PaperSpacing;
  footerStyle: PaperFooterStyle;
  includeTitlePage: boolean;
  includeAnswerKey: boolean;
  includeNotes: boolean;
}

/**
 * The module print studio's Word export: the same one-flow sheet, without a
 * cover, contents or course-level assessments.
 */
export async function moduleDocxBlob(
  module: Module,
  decks: Deck[],
  progressNotes: string | undefined,
  options: ModuleDocxOptions,
  onStatus?: (message: string) => void,
): Promise<Blob> {
  const accent = hex(module.color);
  onStatus?.("Gathering module content…");
  const children: (Paragraph | Table)[] = [];
  const pushAll = (parts: (Paragraph | Table)[]) => {
    for (const part of parts) children.push(part);
  };

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 60 },
      children: [new TextRun({ text: module.title, bold: true })],
    }),
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: `${module.subject} · ${module.questions.length} questions · ${module.estimatedMinutes} min`,
          color: GRAY,
          size: 16,
          allCaps: true,
        }),
      ],
    }),
  );

  if (module.objectives.length) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 160, after: 60 },
        children: [new TextRun("What you'll learn")],
      }),
    );
    for (const objective of module.objectives) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 30 },
          children: inlineRuns(objective),
        }),
      );
    }
  }

  // The sheet opens with a full-page title; the lesson flow starts on page two.
  if (options.includeTitlePage) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  if (module.notes) {
    pushAll(markdownToDocx(module.notes, accent));
  }

  pushAll(await blockChildren(module.blocks, accent, onStatus));

  if (options.includeNotes && progressNotes) {
    children.push(
      new Paragraph({
        border: { left: { style: BorderStyle.SINGLE, size: 18, color: GRAY_LIGHT, space: 6 } },
        indent: { left: 40 },
        spacing: { before: 140, after: 60 },
        children: [new TextRun({ text: "Your notes", bold: true, color: GRAY })],
      }),
    );
    pushAll(markdownToDocx(progressNotes, accent, { borderColor: GRAY_LIGHT, italics: true }));
  }

  pushAll(questionSet("Practice questions", module.questions));

  const deckById = new Map(decks.map((deck) => [deck.id, deck]));
  const practiceDecks = module.linkedDeckIds
    .map((id) => deckById.get(id))
    .filter((deck): deck is Deck => !!deck && deck.questions.length > 0);
  for (const deck of practiceDecks) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 40 },
        children: [new TextRun(`Practice deck · ${deck.title}`)],
      }),
    );
    deck.questions.forEach((question, index) =>
      children.push(...questionChildren(question, index + 1)),
    );
  }

  if (options.includeAnswerKey && (module.questions.length || practiceDecks.length)) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        spacing: { after: 120 },
        children: [new TextRun("Answer key")],
      }),
    );
    if (module.questions.length) {
      children.push(...answerLines(module.questions));
    }
    for (const deck of practiceDecks) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 140, after: 40 },
          children: [new TextRun(`Practice deck · ${deck.title}`)],
        }),
        ...answerLines(deck.questions),
      );
    }
  }

  onStatus?.("Assembling the Word document…");
  return assembleDocx({
    title: module.title,
    children,
    options,
    onStatus,
  });
}

/* ------------------------------------------------------------------ *
 * Shared document assembly
 * ------------------------------------------------------------------ */

/** Real Word page numbers, or no footer at all. */
function pageFooter(style: PaperFooterStyle): Footer | undefined {
  if (style === "none") return undefined;
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            children:
              style === "of"
                ? ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES]
                : style === "plain"
                  ? [PageNumber.CURRENT]
                  : [PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES],
            size: 18,
            color: GRAY,
          }),
        ],
      }),
    ],
  });
}

/** Page size, the fixed 0.5in margin, typography and footer — shared by both exports. */
async function assembleDocx({
  title,
  description,
  children,
  options,
  onStatus,
}: {
  title: string;
  description?: string;
  children: (Paragraph | Table | TableOfContents)[];
  options: {
    paper: PaperSizeId;
    orientation: PaperOrientation;
    fontScale: PaperFontScale;
    typeface: PaperTypeface;
    spacing: PaperSpacing;
    footerStyle: PaperFooterStyle;
  };
  onStatus?: (message: string) => void;
}): Promise<Blob> {
  const dims = getPaperDims(options.paper, options.orientation);
  const fontFamily = options.typeface === "serif" ? "Georgia" : "Calibri";
  const fontSizes = { small: 20, normal: 22, large: 25 } as const;
  const lineSpacing = { compact: 240, normal: 276, relaxed: 312 } as const;
  const footer = pageFooter(options.footerStyle);
  const docxDocument = new Document({
    creator: "Knowly",
    title,
    description,
    features: { updateFields: true },
    styles: {
      default: {
        document: {
          run: { font: fontFamily, size: fontSizes[options.fontScale] },
          paragraph: { spacing: { line: lineSpacing[options.spacing] } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: px(dims.width),
              height: px(dims.height),
              orientation:
                options.orientation === "landscape"
                  ? PageOrientation.LANDSCAPE
                  : PageOrientation.PORTRAIT,
            },
            // Matches the printed sheet's fixed 0.5in content margin.
            margin: {
              top: px(PRINT_MARGIN_PX),
              bottom: px(PRINT_MARGIN_PX),
              left: px(PRINT_MARGIN_PX),
              right: px(PRINT_MARGIN_PX),
            },
          },
        },
        ...(footer ? { footers: { default: footer } } : {}),
        children,
      },
    ],
  });

  onStatus?.("Saving the .docx…");
  return Packer.toBlob(docxDocument);
}

