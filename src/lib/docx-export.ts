/**
 * Consolidated DOCX export pipeline for courses, modules, and exams.
 *
 * This file contains all export functions and helper utilities previously
 * distributed across course-docx.ts and exam-docx.ts. It imports utilities
 * from docx-utils.ts and docx-paper-design.ts, organizing content in clear sections:
 *
 * 1. Imports and types
 * 2. Markdown-to-DOCX conversion (inline runs, tables, block parsing)
 * 3. Question rendering (formatting, layouts)
 * 4. Course and module section
 * 5. Exam section
 * 6. Document assembly (headers, footers, styling)
 * 7. Main export functions
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  ImageRun,
  PageBreak,
  PageNumber,
  PageOrientation,
  Packer,
  Paragraph,
  type ParagraphChild,
  ShadingType,
  TabStopType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  TextWrappingType,
  VerticalAlign,
  VerticalPositionRelativeFrom,
  WidthType,
} from "docx";
import { LETTERS, examOptionLabel, examQuestionLabel, printableAnswer } from "@/lib/exam-print";
import { TYPE_LABELS } from "@/lib/answers";
import { courseStats, decksForCourse } from "@/lib/courses";
import {
  buildDocxPaperArt,
  DOCX_FONT_SIZE_HALF_POINTS,
  resolveDocxExamAppearance,
  resolveDocxDesign,
  type DocxPaperDesign,
  type PaperDims,
} from "@/lib/docx-paper-design";
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
import {
  computedColorToHex,
  resolveHex,
  tint,
  px,
  CALLOUT_TONES,
  type CalloutTone,
  type FlowStyle,
  type Shading,
  type BorderLeft,
} from "@/lib/docx-utils";
import { type ExamOptions } from "@/lib/exam-print";
import { splitMath } from "@/lib/math";
import { latexToDocxMath } from "@/lib/docx-math";

/* ================================================================== *
 * MARKDOWN-TO-DOCX CONVERSION
 * ================================================================== */

/**
 * Cached regex pattern for markdown inline parsing.
 * Moved to module scope to avoid recompilation on every call.
 */
const MARKDOWN_INLINE_PATTERN =
  /\*\*\*([^*]+)\*\*\*|___([^_]+)___|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\*([^*]+)\*|_([^_]+)_/g;

type InlineRunStyle = FlowStyle & {
  allCaps?: boolean;
  bold?: boolean;
  characterSpacing?: number;
  color?: string;
  font?: string;
  size?: number;
};

/**
 * Parse inline Markdown formatting from a plain-text segment supporting:
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Code: `text`
 * - Links: [text](url)
 * - Strikethrough: ~~...~~
 */
function markdownTextRuns(text: string, style: InlineRunStyle = {}): TextRun[] {
  const runs: TextRun[] = [];
  const inheritedStyle = {
    ...(style.bold === undefined ? {} : { bold: style.bold }),
    ...(style.italics === undefined ? {} : { italics: style.italics }),
    ...(style.color ? { color: style.color } : {}),
    ...(style.characterSpacing === undefined ? {} : { characterSpacing: style.characterSpacing }),
    ...(style.font ? { font: style.font } : {}),
    ...(style.size === undefined ? {} : { size: style.size }),
    ...(style.allCaps === undefined ? {} : { allCaps: style.allCaps }),
  };

  // Pattern that matches (in priority order to avoid conflicts):
  // - Bold: **...** or __...__
  // - Italic: *...* or _..._
  // - Strikethrough: ~~...~~
  // - Code: `...`
  // - Links: [...](...)
  const pattern = MARKDOWN_INLINE_PATTERN;

  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    // Add plain text before this match
    if (match.index > last) {
      runs.push(new TextRun({ text: text.slice(last, match.index), ...inheritedStyle }));
    }

    // Bold-italic: ***...***
    if (match[1] != null) {
      runs.push(new TextRun({ ...inheritedStyle, text: match[1], bold: true, italics: true }));
    }
    // Bold-italic: ___...___
    else if (match[2] != null) {
      runs.push(new TextRun({ ...inheritedStyle, text: match[2], bold: true, italics: true }));
    }
    // Bold: **text**
    else if (match[3] != null) {
      runs.push(
        new TextRun({
          ...inheritedStyle,
          text: match[3],
          bold: true,
        }),
      );
    }
    // Bold: __...__ (group 6)
    else if (match[4] != null) {
      runs.push(
        new TextRun({
          ...inheritedStyle,
          text: match[4],
          bold: true,
        }),
      );
    }
    // Strikethrough: ~~...~~ (group 7)
    else if (match[5] != null) {
      runs.push(
        new TextRun({
          ...inheritedStyle,
          text: match[5],
          strike: true,
        }),
      );
    }
    // Code: `...` (group 8)
    else if (match[6] != null) {
      runs.push(
        new TextRun({ ...inheritedStyle, text: match[6], font: "Consolas", color: "1E293B" }),
      );
    }
    // Link: [text](url) (groups 9-10)
    else if (match[7] != null && match[8] != null) {
      runs.push(
        new TextRun({
          ...inheritedStyle,
          text: `${match[7]} (${match[8]})`,
          style: "Hyperlink",
          color: "0563C1",
          underline: { type: "single" },
        }),
      );
    }
    // Italic: *...* (group 11)
    else if (match[9] != null) {
      runs.push(new TextRun({ ...inheritedStyle, text: match[9], italics: true }));
    }
    // Italic: _..._ (group 12)
    else if (match[10] != null) {
      runs.push(new TextRun({ ...inheritedStyle, text: match[10], italics: true }));
    }

    last = pattern.lastIndex;
  }

  // Add remaining text
  if (last < text.length) {
    runs.push(new TextRun({ text: text.slice(last), ...inheritedStyle }));
  }

  return runs.length > 0 ? runs : [new TextRun("")];
}

function inlineRuns(text: string, style: InlineRunStyle = {}): ParagraphChild[] {
  const runs: ParagraphChild[] = [];
  const segments = splitMath(text);

  segments.forEach((segment, index) => {
    if (segment.kind === "math") {
      if (segment.display && runs.length > 0) runs.push(new TextRun({ break: 1 }));
      runs.push(latexToDocxMath(segment.source));
      if (segment.display && index < segments.length - 1) runs.push(new TextRun({ break: 1 }));
    } else {
      runs.push(...markdownTextRuns(segment.source, style));
    }
  });

  return runs.length > 0 ? runs : [new TextRun("")];
}

/**
 * Parse markdown tables into Word table objects.
 */
function mdTable(header: string[], rows: string[][], design: DocxPaperDesign): Table {
  const borderStyle =
    design.tableStyle === "editorial"
      ? BorderStyle.DOUBLE
      : design.tableStyle === "ruled"
        ? BorderStyle.DOTTED
        : design.tableStyle === "grid"
          ? BorderStyle.SINGLE
          : BorderStyle.SINGLE;
  const borderSize = design.tableStyle === "minimal" ? 3 : design.tableStyle === "boxed" ? 10 : 6;
  const borders = {
    top: { style: borderStyle, size: borderSize, color: design.border },
    bottom: { style: borderStyle, size: borderSize, color: design.border },
    left: { style: borderStyle, size: borderSize, color: design.border },
    right: { style: borderStyle, size: borderSize, color: design.border },
  };
  const headerFill = design.style === "friendly" ? "F1F5F9" : tint(design.accent, 0.84);
  const rowOf = (cells: string[], isHeader: boolean) =>
    new TableRow({
      tableHeader: isHeader,
      children: cells.map(
        (cell) =>
          new TableCell({
            borders,
            shading: isHeader ? { type: ShadingType.CLEAR, fill: headerFill } : undefined,
            margins: { top: 40, bottom: 40, left: 50, right: 50 },
            children: [
              new Paragraph({
                children: inlineRuns(cell, isHeader ? { bold: true, color: design.ink } : {}),
                spacing: { line: 300, lineRule: "auto" },
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
      ),
    });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [rowOf(header, true), ...rows.map((row) => rowOf(row, false))],
  });
}

/**
 * Parse and render markdown blocks into Paragraph and Table objects.
 * Supports headings, lists, code blocks, blockquotes, tables, etc.
 */
function markdownToDocx(
  md: string,
  design: DocxPaperDesign,
  style: FlowStyle = {},
): (Paragraph | Table)[] {
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
            shading: { type: ShadingType.CLEAR, fill: design.soft },
            spacing: { after: 0 },
            children: [
              new TextRun({
                text: codeLine.length ? codeLine : " ",
                font: "Consolas",
                size: 20,
                color: design.ink,
              }),
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
      out.push(mdTable(header, rows, design));
      out.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
      continue;
    }
    if (line.trim().startsWith(">")) {
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        out.push(
          new Paragraph({
            indent: { left: 360 },
            border: {
              left: { style: BorderStyle.SINGLE, size: 18, color: design.accent, space: 10 },
            },
            children: inlineRuns(lines[i].replace(/^\s*>\s?/, ""), { italics: true }),
            shading: { type: ShadingType.CLEAR, fill: design.soft },
            spacing: {
              before: 60,
              after: 60,
              line: design.lineSpacing,
              lineRule: "auto",
            },
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
            spacing: { after: 60, line: design.lineSpacing, lineRule: "auto" },
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
            indent: { left: 360, hanging: 360 },
            children: [
              new TextRun({ text: `${marker}. `, bold: true }),
              ...inlineRuns(lines[i].replace(ordered, ""), style),
            ],
            shading,
            border,
            spacing: { after: 60, line: design.lineSpacing, lineRule: "auto" },
          }),
        );
        i++;
      }
      continue;
    }
    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
      out.push(
        new Paragraph({
          border: {
            bottom: {
              style:
                design.headingRule === "double"
                  ? BorderStyle.DOUBLE
                  : design.headingRule === "dotted"
                    ? BorderStyle.DOTTED
                    : design.headingRule === "dashed"
                      ? BorderStyle.DASHED
                      : BorderStyle.SINGLE,
              size: 12,
              color: design.accent,
              space: 4,
            },
          },
          spacing: { before: 160, after: 160 },
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
        spacing: {
          before: style.fill ? 40 : 80,
          after: style.fill ? 60 : design.paragraphAfter,
          line: design.lineSpacing,
          lineRule: "auto",
        },
      }),
    );
  }
  return out;
}

/* ================================================================== *
 * QUESTION RENDERING
 * ================================================================== */

/**
 * Create a metadata run for a question (type, difficulty, concept).
 */
function metaRun(q: Question, design: DocxPaperDesign): TextRun {
  const bits = [TYPE_LABELS[q.type], q.difficulty, q.concept].filter(Boolean).join(" · ");
  return new TextRun({ text: `   (${bits})`, color: design.muted, size: 16 });
}

/**
 * Render a complete question with its options, blanks, or other interactive elements.
 */
function questionChildren(q: Question, number: number, design: DocxPaperDesign): Paragraph[] {
  const out: Paragraph[] = [];

  // Styled question number with background
  out.push(
    new Paragraph({
      spacing: { before: 200, after: 80, line: 300, lineRule: "auto" },
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: design.border, space: 2 },
      },
      children: [
        new TextRun({
          text: `${number}. `,
          bold: true,
          size: 24 * 2,
          color: design.accent,
        }),
        ...inlineRuns(q.question),
        metaRun(q, design),
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
            children: [new TextRun("________  "), ...inlineRuns(pair.left)],
          }),
        ),
      );
      (q.pairs ?? []).forEach((pair, index) =>
        out.push(
          new Paragraph({
            indent: { left: 360 },
            children: [
              new TextRun({ text: `${LETTERS[index] ?? index + 1}. `, bold: true }),
              ...inlineRuns(pair.right),
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
              ...inlineRuns(q.wordBank.join(" · ")),
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

/**
 * Render a set of questions with a section heading.
 */
function questionSet(label: string, questions: Question[], design: DocxPaperDesign): Paragraph[] {
  if (questions.length === 0) return [];
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_4,
      spacing: { before: 200, after: 60 },
      children: [new TextRun(label)],
    }),
    ...questions.flatMap((q, index) => questionChildren(q, index + 1, design)),
  ];
}

/**
 * Render answer lines with explanations for the answer key.
 */
function answerLines(questions: Question[], design: DocxPaperDesign): Paragraph[] {
  return questions.map(
    (question, index) =>
      new Paragraph({
        spacing: { after: 50 },
        children: [
          new TextRun({ text: `${index + 1}. `, bold: true }),
          ...inlineRuns(printableAnswer(question), { bold: true }),
          ...(question.explanation
            ? inlineRuns(` — ${question.explanation}`, {
                italics: true,
                color: design.muted,
              })
            : []),
        ],
      }),
  );
}

/**
 * Render block images embedded in the DOCX or as placeholders.
 */
async function imageChildren(block: CourseBlock, design: DocxPaperDesign): Promise<Paragraph[]> {
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
          color: design.muted,
        }),
      ],
    }),
  ];
}

/**
 * Render course blocks (markdown, callouts, images, dividers) into DOCX elements.
 */
async function blockChildren(
  blocks: CourseBlock[],
  design: DocxPaperDesign,
  onStatus?: (message: string) => void,
): Promise<(Paragraph | Table)[]> {
  const out: (Paragraph | Table)[] = [];
  for (const block of blocks) {
    if (block.type === "checkpoint") continue;
    if (block.type === "markdown") {
      out.push(...markdownToDocx(block.markdown ?? "", design));
    } else if (block.type === "callout" || block.type === "example") {
      const toneName = block.type === "example" ? "example" : (block.tone ?? "info");
      const onAccent = toneName === "info" || toneName === "tip" || toneName === "definition";
      const tone = CALLOUT_TONES[toneName] ?? CALLOUT_TONES.info!;
      // Info and definition notes take the paper's identity colour, exactly
      // like the preview's `border-primary` / `bg-primary` treatment.
      const border = onAccent ? design.accent : tone.border;
      const fill = onAccent
        ? tint(design.accent, toneName === "info" ? 0.94 : 0.9)
        : tint(tone.from, 0.88);
      const label = onAccent ? design.accent : tone.label;
      // Better padding and styling for callouts
      out.push(
        new Paragraph({
          shading: { type: ShadingType.CLEAR, fill },
          border: {
            left: { style: BorderStyle.SINGLE, size: 24, color: border, space: 8 },
          },
          indent: { left: 60, firstLine: 0 },
          spacing: { before: 160, after: 80, line: 300, lineRule: "auto" },
          children: [
            new TextRun({
              text: block.title || (block.type === "example" ? "Example" : "Note"),
              bold: true,
              size: 22 * 2, // Slightly larger title
              color: label,
            }),
          ],
        }),
      );
      out.push(...markdownToDocx(block.markdown ?? "", design, { fill, borderColor: border }));
    } else if (block.type === "image") {
      onStatus?.("Embedding image…");
      out.push(...(await imageChildren(block, design)));
    } else if (block.type === "divider") {
      // Better styled divider with more breathing room
      out.push(
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 12, color: design.accent, space: 4 },
          },
          spacing: { before: 160, after: 160 },
          children: [],
        }),
      );
    }
  }
  return out;
}

/* ================================================================== *
 * COURSE AND MODULE EXPORTS
 * ================================================================== */

/**
 * Render the cover page content for a course.
 */
function coverChildren(
  course: Course,
  progress: CourseProgress | undefined,
  design: DocxPaperDesign,
  options: CoursePrintOptions,
  dims: PaperDims,
): (Paragraph | Table)[] {
  const stats = courseStats(course, progress);
  const themed = options.coverStyle === "book";
  const ink = themed ? design.cover.ink : design.ink;
  const muted = themed ? design.cover.muted : design.muted;
  const line = themed ? design.cover.line : design.border;
  const subject = `${course.subject}${course.level ? ` · ${course.level}` : ""}`;
  const out: (Paragraph | Table)[] = [];

  out.push(
    new Paragraph({
      spacing: { after: 240 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 28, color: design.accent, space: 8 },
      },
      children: [],
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: `${course.emoji || "📘"}  `, size: 44 * 2 }),
        ...inlineRuns(subject, { bold: true, color: ink, size: 22 * 2, allCaps: true }),
      ],
    }),
    new Paragraph({
      spacing: { after: 0 },
      children: [
        new TextRun({ text: "Knowly study pack", color: muted, size: 18 * 2, allCaps: true }),
      ],
    }),
    // breathing room, so the title block sits where the cover centres it
    new Paragraph({ spacing: { before: Math.round(dims.height * 0.2 * 15) }, children: [] }),
    new Paragraph({
      spacing: { after: 240, line: 320, lineRule: "auto" },
      children: inlineRuns(course.title, { bold: true, color: ink, size: 64 * 2 }),
    }),
  );

  if (course.description) {
    out.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [...inlineRuns(course.description, { italics: true, color: muted, size: 24 })],
      }),
    );
  }

  // The plain cover lists the outcomes, like its paper counterpart.
  if (!themed) {
    for (const objective of course.objectives.slice(0, 5)) {
      out.push(
        new Paragraph({
          spacing: { after: 40 },
          indent: { left: 240, hanging: 240 },
          children: [
            new TextRun({ text: "•  ", color: design.accent, bold: true }),
            ...inlineRuns(objective, { color: design.ink, size: 21 }),
          ],
        }),
      );
    }
  }

  out.push(
    new Paragraph({
      spacing: { before: Math.round(dims.height * 0.08 * 15), after: 160 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: line, space: 6 } },
      children: [],
    }),
  );

  const statPairs: [string, string | number][] = [
    ["Modules", course.modules.length],
    ["Lessons", stats.lessons],
    ["Questions", stats.questions],
    ["Assessments", stats.assessments],
    ["Minutes", course.estimatedMinutes ?? "—"],
    ["Progress", `${stats.percent}%`],
  ];
  const statRuns: TextRun[] = [];
  statPairs.forEach(([label, value], index) => {
    if (index > 0) statRuns.push(new TextRun({ text: "    ", size: 18 * 2 }));
    statRuns.push(new TextRun({ text: String(value), bold: true, color: ink, size: 24 * 2 }));
    statRuns.push(new TextRun({ text: ` ${label}`, color: muted, size: 18 * 2, allCaps: true }));
  });
  out.push(
    new Paragraph({ spacing: { after: 100, line: 300, lineRule: "auto" }, children: statRuns }),
  );

  if (course.tags.length > 0) {
    out.push(
      new Paragraph({
        spacing: { after: 80 },
        children: course.tags.flatMap((tag, index) => [
          ...(index > 0 ? [new TextRun({ text: "  ·  ", color: muted, size: 18 })] : []),
          ...inlineRuns(tag, { color: ink, size: 18 }),
        ]),
      }),
    );
  }

  out.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Printed study pack · generated with Knowly",
          color: muted,
          size: 16,
          allCaps: true,
        }),
      ],
    }),
  );

  return out;
}

/**
 * Export a complete course to DOCX format, including modules, lessons,
 * assessments, answer key, and optional cover/contents.
 */
export async function courseDocxBlob(
  course: Course,
  progress: CourseProgress | undefined,
  decks: Deck[],
  options: CoursePrintOptions,
  onStatus?: (message: string) => void,
): Promise<Blob> {
  const design = resolveDocxDesign({
    theme: options.theme,
    palette: options.palette,
    fallbackAccent: resolveHex(course.color),
    style: options.printStyle,
  });
  const dims = getPaperDims(options.paper, options.orientation);

  onStatus?.("Gathering course content…");

  const children: (Paragraph | Table | TableOfContents)[] = [];
  const pushAll = (parts: (Paragraph | Table)[]) => {
    for (const part of parts) children.push(part);
  };
  const newPage = () => children.push(new Paragraph({ children: [new PageBreak()] }));

  /* cover */
  if (options.includeCover) {
    onStatus?.("Creating cover page…");
    pushAll(coverChildren(course, progress, design, options, dims));
    // a compact hero shares page 1 with the contents that follow
    if (options.heroLayout !== "compact") newPage();
  }

  /* contents */
  if (options.includeToc) {
    onStatus?.("Generating table of contents…");
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
            text: 'In Word: right-click the table and choose "Update Field" to refresh the page numbers.',
            italics: true,
            color: design.muted,
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
          children: inlineRuns(`Practice deck · ${deck.title}`),
        }),
      );
      if (deck.description) {
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: inlineRuns(deck.description, { color: design.muted }),
          }),
        );
      }
      deck.questions.forEach((question, index) =>
        children.push(...questionChildren(question, index + 1, design)),
      );
    }
  };

  for (const [moduleIndex, module] of course.modules.entries()) {
    const progressPercent = Math.round((moduleIndex / course.modules.length) * 40 + 10); // 10-50%
    onStatus?.(
      `Processing content: ${progressPercent}% (Module ${moduleIndex + 1}/${course.modules.length})`,
    );
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        spacing: { after: 80 },
        children: inlineRuns(`Module ${moduleIndex + 1} · ${module.title}`),
      }),
    );
    if (module.summary) {
      pushAll(markdownToDocx(module.summary, design));
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
          children: inlineRuns(`Lesson ${lessonIndex + 1} · ${lesson.title}`),
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
          children: [new TextRun({ text: meta, color: design.muted, size: 16, allCaps: true })],
        }),
      );
      if (lesson.summary) {
        pushAll(markdownToDocx(lesson.summary, design));
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

      pushAll(await blockChildren(lesson.blocks, design, onStatus));

      const lessonState = progress?.lessons[lesson.id];
      if (lessonState?.notes && options.includeNotes) {
        children.push(
          new Paragraph({
            border: { left: { style: BorderStyle.SINGLE, size: 18, color: design.rule, space: 6 } },
            indent: { left: 40 },
            spacing: { before: 140, after: 60 },
            children: [new TextRun({ text: "Lesson notes", bold: true, color: design.muted })],
          }),
        );
        pushAll(
          markdownToDocx(lessonState.notes, design, { borderColor: design.rule, italics: true }),
        );
      }

      pushAll(questionSet("Check your understanding", lesson.questions, design));
    }

    if (module.quiz?.questions.length) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 40 },
          pageBreakBefore: options.breaks === "lessons",
          children: inlineRuns(`Module quiz · ${module.quiz.title}`),
        }),
      );
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: `${module.quiz.questions.length} questions · pass at ${module.quiz.passingScore}%${module.quiz.timeLimitMinutes ? ` · ${module.quiz.timeLimitMinutes} min` : ""}`,
              color: design.muted,
              size: 16,
              allCaps: true,
            }),
          ],
        }),
      );
      module.quiz.questions.forEach((question, index) =>
        children.push(...questionChildren(question, index + 1, design)),
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
        children: inlineRuns(`Final exam · ${course.finalExam.title}`),
      }),
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: `${course.finalExam.questions.length} questions · pass at ${course.finalExam.passingScore}%${course.finalExam.timeLimitMinutes ? ` · ${course.finalExam.timeLimitMinutes} min` : ""}`,
            color: design.muted,
            size: 16,
            allCaps: true,
          }),
        ],
      }),
    );
    course.finalExam.questions.forEach((question, index) =>
      children.push(...questionChildren(question, index + 1, design)),
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
          children: inlineRuns(`Module ${moduleIndex + 1} · ${module.title}`),
        }),
      );
      module.lessons.forEach((lesson) => {
        if (!lesson.questions.length) return;
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 140, after: 40 },
            children: inlineRuns(`Lesson · ${lesson.title}`),
          }),
        );
        children.push(...answerLines(lesson.questions, design));
      });
      if (module.quiz?.questions.length) {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 140, after: 40 },
            children: inlineRuns(`Module quiz · ${module.quiz.title}`),
          }),
        );
        children.push(...answerLines(module.quiz.questions, design));
      }
      module.linkedDeckIds.forEach((id) => {
        const deck = deckById.get(id);
        if (!deck || !deck.questions.length || answeredDecks.has(id)) return;
        answeredDecks.add(id);
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 140, after: 40 },
            children: inlineRuns(`Practice deck · ${deck.title}`),
          }),
        );
        children.push(...answerLines(deck.questions, design));
      });
    });
    if (course.finalExam?.questions.length) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 40 },
          children: inlineRuns(`Final exam · ${course.finalExam.title}`),
        }),
      );
      children.push(...answerLines(course.finalExam.questions, design));
    }
    course.linkedDeckIds.forEach((id) => {
      const deck = deckById.get(id);
      if (!deck || !deck.questions.length || answeredDecks.has(id)) return;
      answeredDecks.add(id);
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 40 },
          children: inlineRuns(`Practice deck · ${deck.title}`),
        }),
      );
      children.push(...answerLines(deck.questions, design));
    });
  }

  onStatus?.("Rendering the paper design (60%)…");
  const art = await buildDocxPaperArt(design, dims, {
    cover: options.includeCover && options.coverStyle === "book",
    wash: true,
  });

  onStatus?.("Assembling the Word document…");
  return assembleDocx({
    title: course.title,
    description: course.description,
    children,
    options,
    design,
    art,
    footerLeft: course.title,
    runningHeader: options.runningHeader ? course.title : null,
    coverDark: Boolean(options.includeCover && options.coverStyle === "book" && art.cover),
    onStatus,
  });
}

/**
 * Export module options type.
 */
export interface ModuleDocxOptions {
  paper: PaperSizeId;
  orientation: PaperOrientation;
  fontScale: PaperFontScale;
  typeface: PaperTypeface;
  spacing: PaperSpacing;
  footerStyle: PaperFooterStyle;
  includeTitlePage: boolean;
  /** "page" gives the hero its own sheet, "compact" keeps it on page 1 */
  heroLayout?: CoursePrintOptions["heroLayout"];
  includeAnswerKey: boolean;
  includeNotes: boolean;
  /** paper theme / palette / style, shared with the exam and course studios */
  theme?: CoursePrintOptions["theme"];
  palette?: CoursePrintOptions["palette"];
  printStyle?: CoursePrintOptions["printStyle"];
}

/**
 * Export a module to DOCX format — similar to course export but without
 * cover, contents, or course-level assessments.
 */
export async function moduleDocxBlob(
  module: Module,
  decks: Deck[],
  progressNotes: string | undefined,
  options: ModuleDocxOptions,
  onStatus?: (message: string) => void,
): Promise<Blob> {
  const design = resolveDocxDesign({
    theme: options.theme,
    palette: options.palette,
    fallbackAccent: resolveHex(module.color),
    style: options.printStyle,
  });
  const dims = getPaperDims(options.paper, options.orientation);
  const themedTitle = Boolean(options.includeTitlePage && design.style === "design");
  const titleInk = themedTitle ? design.cover.ink : design.ink;
  const titleMuted = themedTitle ? design.cover.muted : design.muted;
  const titleLine = themedTitle ? design.cover.line : design.border;

  onStatus?.("Gathering module content…");
  const children: (Paragraph | Table)[] = [];
  const pushAll = (parts: (Paragraph | Table)[]) => {
    for (const part of parts) children.push(part);
  };

  children.push(
    new Paragraph({
      spacing: { after: 60 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 24, color: design.accent, space: 1 } },
      children: [],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 120, after: 60 },
      children: inlineRuns(module.title, { bold: true, color: titleInk }),
    }),
    new Paragraph({
      spacing: { after: 160 },
      children: inlineRuns(
        `${module.subject} · ${module.questions.length} questions · ${module.estimatedMinutes} min`,
        { color: titleMuted, size: 16, allCaps: true },
      ),
    }),
  );

  if (module.objectives.length) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 160, after: 60 },
        children: [new TextRun({ text: "What you'll learn", color: titleInk })],
      }),
    );
    for (const objective of module.objectives) {
      children.push(
        new Paragraph({
          indent: { left: 240, hanging: 240 },
          spacing: { after: 40 },
          children: [
            new TextRun({ text: "•  ", color: design.accent, bold: true }),
            ...inlineRuns(objective, { color: titleInk, size: 21 }),
          ],
        }),
      );
    }
  }

  if (options.includeTitlePage && !themedTitle) {
    children.push(
      new Paragraph({
        spacing: { before: Math.round(dims.height * 0.2 * 15), after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: titleLine, space: 1 } },
        children: [],
      }),
    );
  }

  // The sheet opens with a full-page title; the lesson flow starts on page two.
  // A compact hero stays in flow, so the lesson follows it on the same page.
  if (options.includeTitlePage && options.heroLayout !== "compact") {
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  if (module.notes) {
    pushAll(markdownToDocx(module.notes, design));
  }

  pushAll(await blockChildren(module.blocks, design, onStatus));

  if (options.includeNotes && progressNotes) {
    children.push(
      new Paragraph({
        border: { left: { style: BorderStyle.SINGLE, size: 18, color: design.rule, space: 6 } },
        indent: { left: 40 },
        spacing: { before: 140, after: 60 },
        children: [new TextRun({ text: "Your notes", bold: true, color: design.muted })],
      }),
    );
    pushAll(markdownToDocx(progressNotes, design, { borderColor: design.rule, italics: true }));
  }

  pushAll(questionSet("Practice questions", module.questions, design));

  const deckById = new Map(decks.map((deck) => [deck.id, deck]));
  const practiceDecks = module.linkedDeckIds
    .map((id) => deckById.get(id))
    .filter((deck): deck is Deck => !!deck && deck.questions.length > 0);
  for (const deck of practiceDecks) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 40 },
        children: inlineRuns(`Practice deck · ${deck.title}`),
      }),
    );
    deck.questions.forEach((question, index) =>
      children.push(...questionChildren(question, index + 1, design)),
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
      children.push(...answerLines(module.questions, design));
    }
    for (const deck of practiceDecks) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 140, after: 40 },
          children: inlineRuns(`Practice deck · ${deck.title}`),
        }),
        ...answerLines(deck.questions, design),
      );
    }
  }

  onStatus?.("Rendering the paper design (60%)…");
  const art = await buildDocxPaperArt(design, dims, {
    cover: themedTitle,
    wash: true,
  });

  onStatus?.("Assembling the Word document…");
  return assembleDocx({
    title: module.title,
    children,
    options,
    design,
    art,
    footerLeft: module.title,
    runningHeader: null,
    coverDark: themedTitle && Boolean(art.cover),
    onStatus,
  });
}

/* ================================================================== *
 * EXAM EXPORTS
 * ================================================================== */

/**
 * Render question children for exam format (with optional points per question).
 */
function examQuestionChildren(
  question: Question,
  index: number,
  design: DocxPaperDesign,
  options: ExamOptions,
): Paragraph[] {
  const children: Paragraph[] = [];
  const compact = options.spacing === "compact";
  const before = compact ? 60 : 160;
  const after = compact ? 30 : 100;
  const optionAfter = compact ? 20 : 60;
  const answerLineCount = Math.max(0, Math.trunc(options.answerLines));
  const hasFollowup =
    question.type === "multiple-choice"
      ? (question.options?.length ?? 0) > 0
      : question.type === "true-false" ||
        question.type === "ordering" ||
        question.type === "matching" ||
        question.type === "word-bank" ||
        answerLineCount > 0;

  children.push(
    new Paragraph({
      spacing: { before, after: hasFollowup ? optionAfter : after },
      children: [
        new TextRun({
          text: `${examQuestionLabel(index - 1, options.numberStyle)} `,
          bold: true,
          color: design.accent,
        }),
        ...inlineRuns(question.question),
        ...(options.showPoints
          ? [
              new TextRun({
                text: ` [${options.pointsPerQuestion} ${options.pointsPerQuestion === 1 ? "pt" : "pts"}]`,
                color: design.muted,
                italics: true,
              }),
            ]
          : []),
      ],
    }),
  );

  const appendLine = (runs: ParagraphChild[], indent = 360, spacingAfter = optionAfter) => {
    children.push(
      new Paragraph({
        indent: { left: indent },
        spacing: { after: spacingAfter },
        children: runs,
      }),
    );
  };

  switch (question.type) {
    case "multiple-choice":
      (question.options ?? []).forEach((option, optionIndex, allOptions) =>
        appendLine(
          [
            new TextRun({
              text: `${examOptionLabel(optionIndex, options.optionCase)}. `,
              bold: true,
              color: design.accent,
            }),
            ...inlineRuns(option),
          ],
          360,
          optionIndex === allOptions.length - 1 ? after : optionAfter,
        ),
      );
      break;
    case "true-false":
      appendLine([new TextRun("◯ True        ◯ False")], 360, after);
      break;
    case "ordering":
      {
        const items = question.items ?? [];
        appendLine(
          [new TextRun({ text: "Arrange in order:", italics: true, color: design.muted })],
          0,
          items.length > 0 ? optionAfter : after,
        );
        items.forEach((item, itemIndex) =>
          appendLine(
            [new TextRun("________  "), ...inlineRuns(item)],
            360,
            itemIndex === items.length - 1 ? after : optionAfter,
          ),
        );
      }
      break;
    case "matching": {
      const pairs = question.pairs ?? [];
      appendLine(
        [new TextRun({ text: "Match each item:", italics: true, color: design.muted })],
        0,
        pairs.length > 0 ? optionAfter : after,
      );
      pairs.forEach((pair, pairIndex) =>
        appendLine(
          [new TextRun(`${pairIndex + 1}. ________  `), ...inlineRuns(pair.left)],
          360,
          optionAfter,
        ),
      );
      pairs.forEach((pair, pairIndex) =>
        appendLine(
          [
            new TextRun({
              text: `${examOptionLabel(pairIndex, options.optionCase)}. `,
              bold: true,
              color: design.accent,
            }),
            ...inlineRuns(pair.right),
          ],
          360,
          pairIndex === pairs.length - 1 ? after : optionAfter,
        ),
      );
      break;
    }
    case "word-bank": {
      if (question.wordBank?.length) {
        appendLine(
          [
            new TextRun({ text: "Word bank: ", bold: true }),
            ...inlineRuns(question.wordBank.join(", ")),
          ],
          360,
          optionAfter,
        );
      }
      const blankCount = Math.max(1, question.blanks?.length ?? 1);
      for (let blank = 0; blank < blankCount; blank++) {
        appendLine(
          [new TextRun("____________________")],
          360,
          blank === blankCount - 1 ? after : optionAfter,
        );
      }
      break;
    }
    default:
      for (let line = 0; line < answerLineCount; line++) {
        appendLine(
          [new TextRun("______________________________")],
          360,
          line === answerLineCount - 1 ? after : optionAfter,
        );
      }
      break;
  }

  return children;
}

/** Lay out question blocks in two columns when requested by the exam settings. */
function examQuestionsTable(questionBlocks: Paragraph[][]): Table {
  const rows: TableRow[] = [];
  for (let i = 0; i < questionBlocks.length; i += 2) {
    const cells = [questionBlocks[i], questionBlocks[i + 1]].map(
      (block) =>
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.TOP,
          margins: { top: 0, bottom: 0, left: 100, right: 100 },
          children: block ?? [new Paragraph({ children: [] })],
        }),
    );
    rows.push(new TableRow({ children: cells }));
  }

  const noBorder = { style: BorderStyle.NIL, size: 0, color: "FFFFFF", space: 0 };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: noBorder,
      bottom: noBorder,
      left: noBorder,
      right: noBorder,
      insideHorizontal: noBorder,
      insideVertical: noBorder,
    },
    rows,
  });
}

/**
 * Build answer lines with the same numbering and typography as the paper.
 */
function examAnswerLines(
  questions: Question[],
  design: DocxPaperDesign,
  options: ExamOptions,
): Paragraph[] {
  const lines: Paragraph[] = [];

  questions.forEach((question, index) => {
    const answer = printableAnswer(question);
    const typeLabel = TYPE_LABELS[question.type] || question.type;

    lines.push(
      new Paragraph({
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({
            text: `${examQuestionLabel(index, options.numberStyle)} `,
            bold: true,
            color: design.accent,
          }),
          ...inlineRuns(answer, { bold: true }),
          new TextRun({
            text: ` — ${typeLabel}`,
            color: design.muted,
            italics: true,
          }),
        ],
      }),
    );

    if (question.explanation) {
      lines.push(
        new Paragraph({
          spacing: { after: 80 },
          indent: { left: 360 },
          children: inlineRuns(question.explanation, {
            italics: true,
            color: design.muted,
          }),
        }),
      );
    }
  });

  return lines;
}

/**
 * Export an exam paper to DOCX format.
 */
export async function examDocxBlob(
  title: string,
  questions: Question[],
  options: ExamOptions,
  coursePrintOptions: CoursePrintOptions,
  courseColor?: string,
  onStatus?: (message: string) => void,
): Promise<Blob> {
  const appearance = resolveDocxExamAppearance(
    options,
    coursePrintOptions,
    courseColor ? resolveHex(courseColor) : undefined,
  );
  const design = appearance.design;
  const dims = getPaperDims(coursePrintOptions.paper, coursePrintOptions.orientation);
  const baseFontSizeHalfPoints = appearance.fontSizeHalfPoints;
  const scaledFontSize = (factor: number) => Math.round(baseFontSizeHalfPoints * factor);

  onStatus?.("Building the exam…");

  const children: (Paragraph | Table)[] = [];
  const titleAlignment =
    options.headerAlign === "center" ? AlignmentType.CENTER : AlignmentType.LEFT;

  children.push(
    new Paragraph({
      alignment: titleAlignment,
      spacing: { after: 40 },
      children: [
        ...inlineRuns(options.title || title, {
          bold: true,
          size: scaledFontSize(1.6),
          color: design.ink,
        }),
      ],
    }),
  );

  if (options.subject) {
    children.push(
      new Paragraph({
        alignment: titleAlignment,
        spacing: { after: 120 },
        children: inlineRuns(options.subject, {
          italics: true,
          size: scaledFontSize(0.9),
          color: design.muted,
        }),
      }),
    );
  }

  if (options.showNameLines) {
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [
          ...inlineRuns(`Name: ${options.studentName || "________________"}    `),
          ...inlineRuns(`Class: ${options.studentClass || "________________"}    `),
          ...inlineRuns(`Date: ${options.date || "________________"}    `),
          new TextRun("Score: ______"),
        ],
      }),
    );
  } else if (options.date) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 120 },
        children: inlineRuns(`Date: ${options.date}`, { italics: true }),
      }),
    );
  }

  if (options.showInstructions && options.instructions) {
    onStatus?.("Adding instructions…");
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 80, before: 80 },
        children: [new TextRun("Instructions")],
      }),
    );
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: inlineRuns(options.instructions),
      }),
    );
  }

  const totalPoints = options.pointsPerQuestion * questions.length;
  const headerMeta = [
    `${questions.length} question${questions.length === 1 ? "" : "s"}`,
    options.showPoints ? `${totalPoints} point${totalPoints === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 80, before: 80 },
      children: [new TextRun("Questions")],
    }),
  );

  if (headerMeta) {
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: headerMeta,
            color: design.muted,
            italics: true,
          }),
        ],
      }),
    );
  }

  const questionBlocks: Paragraph[][] = [];
  onStatus?.(`Formatting ${questions.length} questions…`);
  questions.forEach((question, index) => {
    if (index > 0 && index % 25 === 0) {
      onStatus?.(`Formatting questions: ${index} of ${questions.length}`);
    }
    questionBlocks.push(examQuestionChildren(question, index + 1, design, options));
  });
  if (options.columns === 2) {
    if (questionBlocks.length) children.push(examQuestionsTable(questionBlocks));
  } else {
    children.push(...questionBlocks.flat());
  }

  if (options.includeAnswerKey) {
    onStatus?.("Generating answer key…");
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 120 },
        children: [new TextRun("Answer key")],
      }),
    );
    children.push(...examAnswerLines(questions, design, options));
  }

  onStatus?.("Rendering the paper design (20%)…");
  const art = await buildDocxPaperArt(design, dims, {
    cover: false,
    wash: true,
  });

  onStatus?.("Assembling the Word document (80%)…");
  return assembleDocx({
    title,
    children,
    options: { ...coursePrintOptions, fontScale: options.fontSize },
    design,
    art,
    footerLeft: options.footerText?.trim() || title,
    runningHeader: options.headerText?.trim() || null,
    fontFamilyOverride: appearance.fontFamily,
    headerAlignment: titleAlignment,
    coverDark: false,
    onStatus,
  });
}

/* ================================================================== *
 * DOCUMENT ASSEMBLY
 * ================================================================== */

/**
 * Real Word page numbers on the right, the pack title on the left.
 */
function pageFooter(
  style: PaperFooterStyle,
  left: string,
  color: string,
  contentWidth: number,
  fontSizeHalfPoints: number,
  fontFamily: string,
): Footer | undefined {
  if (style === "none") return undefined;
  const numbers: string[] =
    style === "of"
      ? ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES]
      : style === "plain"
        ? [PageNumber.CURRENT]
        : [PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES];
  return new Footer({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: contentWidth }],
        children: [
          ...(left
            ? [
                ...inlineRuns(left, {
                  size: Math.round(fontSizeHalfPoints * 0.8),
                  font: fontFamily,
                  color,
                }),
              ]
            : []),
          new TextRun({
            children: ["\t", ...numbers],
            size: Math.round(fontSizeHalfPoints * 0.8),
            font: fontFamily,
            color,
          }),
        ],
      }),
    ],
  });
}

/**
 * A page-sized image anchored behind the text, so the theme's wash (or the
 * cover art) reaches the sheet edge exactly like it does on the printed page.
 * The bytes live in the .docx package — nothing is linked or downloaded.
 */
function pageHeader(
  data: Uint8Array | undefined,
  dims: PaperDims,
  runningHeader: string | null,
  color: string,
  fontSizeHalfPoints: number,
  fontFamily: string,
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType],
): Header | undefined {
  if (!data && !runningHeader) return undefined;
  const children: ParagraphChild[] = [];
  if (data) {
    children.push(
      new ImageRun({
        type: "png",
        data,
        transformation: { width: dims.width, height: dims.height },
        floating: {
          behindDocument: true,
          allowOverlap: true,
          zIndex: 0,
          horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
          verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
          wrap: { type: TextWrappingType.NONE },
        },
      }),
    );
  }
  if (runningHeader) {
    children.push(
      ...inlineRuns(runningHeader, {
        size: Math.round(fontSizeHalfPoints * 0.8),
        font: fontFamily,
        bold: true,
        allCaps: true,
        characterSpacing: 60,
        color,
      }),
    );
  }
  return new Header({
    children: [
      new Paragraph({
        alignment,
        spacing: { before: 0, after: 0 },
        children,
      }),
    ],
  });
}

/**
 * Assemble the final Word document from content, design, and paper settings.
 * Page size, 0.5in margin, themed typography and furniture.
 */
async function assembleDocx({
  title,
  description,
  children,
  options,
  design,
  art,
  footerLeft,
  runningHeader,
  fontFamilyOverride,
  headerAlignment = AlignmentType.CENTER,
  coverDark,
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
  design: DocxPaperDesign;
  art: { cover?: Uint8Array; wash?: Uint8Array };
  footerLeft: string;
  runningHeader: string | null;
  fontFamilyOverride?: string;
  headerAlignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  /** true when page one carries the dark/light themed cover art */
  coverDark: boolean;
  onStatus?: (message: string) => void;
}): Promise<Blob> {
  const dims = getPaperDims(options.paper, options.orientation);
  const contentWidth = px(dims.width - PRINT_MARGIN_PX * 2);
  const bodyFontSizeHalfPoints = DOCX_FONT_SIZE_HALF_POINTS[options.fontScale];
  const fontFamily =
    fontFamilyOverride ??
    (options.typeface === "serif"
      ? "Georgia"
      : options.typeface === "theme"
        ? design.bodyFont
        : "Calibri");
  const lineSpacing = {
    compact: Math.min(280, design.lineSpacing),
    normal: design.lineSpacing,
    relaxed: Math.max(360, design.lineSpacing),
  } as const;
  const headingSizes = {
    1: Math.round(bodyFontSizeHalfPoints * 1.8),
    2: Math.round(bodyFontSizeHalfPoints * 1.4),
    3: Math.round(bodyFontSizeHalfPoints * 1.2),
    4: bodyFontSizeHalfPoints,
  };

  const headingStyle = (level: 1 | 2 | 3 | 4) => ({
    id: `Heading${level}`,
    name: `Heading ${level}`,
    basedOn: "Normal",
    next: "Normal",
    quickFormat: true,
    run: {
      font: design.headingFont,
      size: headingSizes[level],
      bold: true,
      color: design.accent,
    },
    paragraph: {
      spacing: {
        before:
          level === 1
            ? design.paragraphAfter * 3
            : level === 2
              ? design.paragraphAfter * 2
              : level === 3
                ? design.paragraphAfter
                : Math.round(design.paragraphAfter * 0.75),
        after: Math.round(design.paragraphAfter * 0.8),
      },
      keepNext: true,
      outlineLevel: level - 1,
      ...(level === 1
        ? {
            border: {
              bottom: {
                style:
                  design.headingRule === "double"
                    ? BorderStyle.DOUBLE
                    : design.headingRule === "dotted"
                      ? BorderStyle.DOTTED
                      : design.headingRule === "dashed"
                        ? BorderStyle.DASHED
                        : BorderStyle.SINGLE,
                size: 12,
                color: design.accent,
                space: 6,
              },
            },
            pageBreakBefore: true,
          }
        : {}),
    },
  });

  const bodyHeader = pageHeader(
    art.wash,
    dims,
    runningHeader,
    design.muted,
    bodyFontSizeHalfPoints,
    design.headingFont,
    headerAlignment,
  );
  const bodyFooter = pageFooter(
    options.footerStyle,
    footerLeft,
    design.muted,
    contentWidth,
    bodyFontSizeHalfPoints,
    design.headingFont,
  );
  const coverHeader = coverDark
    ? pageHeader(
        art.cover,
        dims,
        null,
        design.cover.muted,
        bodyFontSizeHalfPoints,
        design.headingFont,
        headerAlignment,
      )
    : undefined;
  const coverFooter = coverDark
    ? pageFooter(
        options.footerStyle,
        footerLeft,
        design.cover.muted,
        contentWidth,
        bodyFontSizeHalfPoints,
        design.headingFont,
      )
    : undefined;

  const docxDocument = new Document({
    creator: "Knowly",
    title,
    description,
    features: { updateFields: true },
    styles: {
      default: {
        document: {
          run: { font: fontFamily, size: bodyFontSizeHalfPoints, color: design.ink },
          paragraph: {
            spacing: {
              line: lineSpacing[options.spacing],
              lineRule: "auto",
            },
          },
        },
      },
      paragraphStyles: [headingStyle(1), headingStyle(2), headingStyle(3), headingStyle(4)],
    },
    sections: [
      {
        properties: {
          ...(coverHeader ? { titlePage: true } : {}),
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
        ...(bodyHeader || coverHeader
          ? {
              headers: {
                ...(bodyHeader ? { default: bodyHeader } : {}),
                ...(coverHeader ? { first: coverHeader } : {}),
              },
            }
          : {}),
        ...(bodyFooter || coverFooter
          ? {
              footers: {
                ...(bodyFooter ? { default: bodyFooter } : {}),
                ...(coverFooter ? { first: coverFooter } : {}),
              },
            }
          : {}),
        children,
      },
    ],
  });

  onStatus?.("Compressing the Word document (90%)…");
  const blob = await Packer.toBlob(docxDocument);
  onStatus?.("Done! Download ready (100%)");
  return blob;
}
