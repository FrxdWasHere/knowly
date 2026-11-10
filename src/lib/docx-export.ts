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
import { LETTERS, printableAnswer } from "@/lib/exam-print";
import { TYPE_LABELS } from "@/lib/answers";
import { courseStats, decksForCourse } from "@/lib/courses";
import {
  buildDocxPaperArt,
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

/* ================================================================== *
 * MARKDOWN-TO-DOCX CONVERSION
 * ================================================================== */

/**
 * Enhanced inline markdown parser supporting:
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Code: `text`
 * - Links: [text](url)
 * - LaTeX inline: $...$
 * - LaTeX display: $$...$$
 * - Strikethrough: ~~...~~
 */
function inlineRuns(text: string, style: FlowStyle = {}): TextRun[] {
  const runs: TextRun[] = [];

  // Pattern that matches (in priority order to avoid conflicts):
  // - LaTeX display: $$...$$
  // - LaTeX inline: $...$
  // - Bold: **...** or __...__
  // - Italic: *...* or _..._
  // - Strikethrough: ~~...~~
  // - Code: `...`
  // - Links: [...](...) 
  const pattern =
    /\$\$([^\$]+)\$\$|\$([^\$\n]+)\$|\*\*\*([^*]+)\*\*\*|___([^_]+)___|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\*([^*]+)\*|_([^_]+)_/g;

  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    // Add plain text before this match
    if (match.index > last) {
      runs.push(new TextRun({ text: text.slice(last, match.index), size: 22 }));
    }

    // LaTeX display: $$...$$ (group 1)
    if (match[1] != null) {
      runs.push(
        new TextRun({
          text: `\n[LaTeX: ${match[1]}]\n`,
          font: "Consolas",
          size: 18,
          color: "7C3AED",
          italics: true,
        }),
      );
    }
    // LaTeX inline: $...$ (group 2)
    else if (match[2] != null) {
      runs.push(
        new TextRun({
          text: `[${match[2]}]`,
          font: "Consolas",
          size: 18,
          color: "7C3AED",
          italics: true,
        }),
      );
    }
    // Bold-italic: ***...*** (group 3)
    else if (match[3] != null) {
      runs.push(new TextRun({ text: match[3], bold: true, italics: true }));
    }
    // Bold-italic: ___....___ (group 4)
    else if (match[4] != null) {
      runs.push(new TextRun({ text: match[4], bold: true, italics: true }));
    }
    // Bold: **...** (group 5)
    else if (match[5] != null) {
      runs.push(
        new TextRun({ text: match[5], bold: true, italics: style.italics }),
      );
    }
    // Bold: __...__ (group 6)
    else if (match[6] != null) {
      runs.push(
        new TextRun({ text: match[6], bold: true, italics: style.italics }),
      );
    }
    // Strikethrough: ~~...~~ (group 7)
    else if (match[7] != null) {
      runs.push(new TextRun({ text: match[7], strike: true }));
    }
    // Code: `...` (group 8)
    else if (match[8] != null) {
      runs.push(
        new TextRun({ text: match[8], font: "Consolas", size: 20, color: "1E293B" }),
      );
    }
    // Link: [text](url) (groups 9-10)
    else if (match[9] != null && match[10] != null) {
      runs.push(
        new TextRun({
          text: `${match[9]} (${match[10]})`,
          style: "Hyperlink",
          color: "0563C1",
          underline: { type: "single" },
        }),
      );
    }
    // Italic: *...* (group 11)
    else if (match[11] != null) {
      runs.push(new TextRun({ text: match[11], italics: true }));
    }
    // Italic: _..._ (group 12)
    else if (match[12] != null) {
      runs.push(new TextRun({ text: match[12], italics: true }));
    }

    last = pattern.lastIndex;
  }

  // Add remaining text
  if (last < text.length) {
    runs.push(new TextRun({ text: text.slice(last), size: 22 }));
  }

  return runs.length > 0 ? runs : [new TextRun("")];
}

/**
 * Parse markdown tables into Word table objects.
 */
function mdTable(header: string[], rows: string[][], design: DocxPaperDesign): Table {
  const borders = {
    top: { style: BorderStyle.SINGLE, size: 6, color: design.border },
    bottom: { style: BorderStyle.SINGLE, size: 6, color: design.border },
    left: { style: BorderStyle.SINGLE, size: 6, color: design.border },
    right: { style: BorderStyle.SINGLE, size: 6, color: design.border },
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
            children: [new Paragraph({ 
              children: isHeader 
                ? [new TextRun({ text: cell, bold: true, color: design.ink })]
                : inlineRuns(cell),
              spacing: { line: 300, lineRule: "auto" },
            })],
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
      out.push(mdTable(header, rows, design));
      out.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
      continue;
    }
    if (line.trim().startsWith(">")) {
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        out.push(
          new Paragraph({
            indent: { left: 360 },
            border: { left: { style: BorderStyle.SINGLE, size: 18, color: design.accent, space: 10 } },
            children: inlineRuns(lines[i].replace(/^\s*>\s?/, ""), { italics: true }),
            spacing: { before: 60, after: 60, line: 300, lineRule: "auto" },
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
            spacing: { after: 60, line: 300, lineRule: "auto" },
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
            spacing: { after: 60, line: 300, lineRule: "auto" },
          }),
        );
        i++;
      }
      continue;
    }
    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
      out.push(
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: design.accent, space: 4 } },
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
          after: style.fill ? 60 : 120,
          line: 300,
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
          new TextRun(printableAnswer(question)),
          ...(question.explanation
            ? [
                new TextRun({
                  text: ` — ${question.explanation}`,
                  italics: true,
                  color: design.muted,
                }),
              ]
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
          border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: design.accent, space: 4 } },
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
        new TextRun({ text: subject, bold: true, color: ink, size: 22 * 2, allCaps: true }),
      ],
    }),
    new Paragraph({
      spacing: { after: 0 },
      children: [new TextRun({ text: "Knowly study pack", color: muted, size: 18 * 2, allCaps: true })],
    }),
    // breathing room, so the title block sits where the cover centres it
    new Paragraph({ spacing: { before: Math.round(dims.height * 0.2 * 15) }, children: [] }),
    new Paragraph({
      spacing: { after: 240, line: 320, lineRule: "auto" },
      children: [new TextRun({ text: course.title, bold: true, color: ink, size: 64 * 2 })],
    }),
  );

  if (course.description) {
    out.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({ text: course.description, italics: true, color: muted, size: 24 }),
        ],
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
            new TextRun({ text: objective, color: design.ink, size: 21 }),
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
  out.push(new Paragraph({ spacing: { after: 100, line: 300, lineRule: "auto" }, children: statRuns }));

  if (course.tags.length > 0) {
    out.push(
      new Paragraph({
        spacing: { after: 80 },
        children: course.tags.flatMap((tag, index) => [
          ...(index > 0 ? [new TextRun({ text: "  ·  ", color: muted, size: 18 })] : []),
          new TextRun({ text: tag, color: ink, size: 18 }),
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
    pushAll(coverChildren(course, progress, design, options, dims));
    // a compact hero shares page 1 with the contents that follow
    if (options.heroLayout !== "compact") newPage();
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
          children: [new TextRun(`Practice deck · ${deck.title}`)],
        }),
      );
      if (deck.description) {
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: deck.description, color: design.muted })],
          }),
        );
      }
      deck.questions.forEach((question, index) =>
        children.push(...questionChildren(question, index + 1, design)),
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
          children: [new TextRun(`Module quiz · ${module.quiz.title}`)],
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
        children: [new TextRun(`Final exam · ${course.finalExam.title}`)],
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
        children.push(...answerLines(lesson.questions, design));
      });
      if (module.quiz?.questions.length) {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 140, after: 40 },
            children: [new TextRun(`Module quiz · ${module.quiz.title}`)],
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
            children: [new TextRun(`Practice deck · ${deck.title}`)],
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
          children: [new TextRun(`Final exam · ${course.finalExam.title}`)],
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
          children: [new TextRun(`Practice deck · ${deck.title}`)],
        }),
      );
      children.push(...answerLines(deck.questions, design));
    });
  }

  onStatus?.("Embedding the paper design…");
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
      children: [new TextRun({ text: module.title, bold: true, color: titleInk })],
    }),
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: `${module.subject} · ${module.questions.length} questions · ${module.estimatedMinutes} min`,
          color: titleMuted,
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
            new TextRun({ text: objective, color: titleInk, size: 21 }),
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
        children: [new TextRun(`Practice deck · ${deck.title}`)],
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
          children: [new TextRun(`Practice deck · ${deck.title}`)],
        }),
        ...answerLines(deck.questions, design),
      );
    }
  }

  onStatus?.("Embedding the paper design…");
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
  pointsPerQuestion: number,
): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];

  const answer = printableAnswer(question);
  const typeLabel = TYPE_LABELS[question.type] || question.type;
  const meta = [typeLabel, `${pointsPerQuestion} point${pointsPerQuestion === 1 ? "" : "s"}`]
    .filter(Boolean)
    .join(" · ");

  // Question number and meta
  children.push(
    new Paragraph({
      spacing: { before: 120, after: 40 },
      children: [
        new TextRun({
          text: `${index}. `,
          bold: true,
          color: design.accent,
        }),
        new TextRun({
          text: meta,
          size: 16,
          color: design.muted,
        }),
      ],
    }),
  );

  // Question text
  children.push(
    new Paragraph({
      spacing: { after: 100 },
      children: inlineRuns(question.question),
    }),
  );

  // Options for multiple choice or other interactive types
  if (question.options?.length) {
    const cols = question.options.length > 3 ? 2 : 1;
    children.push(examOptionsTable(question.options, cols, design));
  } else if (question.items?.length) {
    // Ordering
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: "Arrange in order:", italics: true })],
      }),
    );
    question.items.forEach((item, i) => {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          children: [new TextRun(item)],
        }),
      );
    });
  } else if (question.pairs?.length) {
    // Matching
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: "Match each item:", italics: true })],
      }),
    );
    question.pairs.forEach((pair) => {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          children: [new TextRun(`${pair.left} ↔ ${pair.right}`)],
        }),
      );
    });
  } else if (question.blanks?.length) {
    // Word bank
    const bank = question.wordBank?.join(", ") || question.blanks.join(", ");
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: `Word bank: ${bank}`,
            italics: true,
            color: design.muted,
            size: 18,
          }),
        ],
      }),
    );
  }

  return children;
}

/**
 * Create a table for multiple choice options in exam format.
 */
function examOptionsTable(options: string[], cols: number, design: DocxPaperDesign): Table {
  const rows: TableRow[] = [];
  for (let i = 0; i < options.length; i += cols) {
    const rowCells: TableCell[] = [];
    for (let j = 0; j < cols; j++) {
      const optionIndex = i + j;
      if (optionIndex < options.length) {
        rowCells.push(
          new TableCell({
            width: { size: 100 / cols, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 40, bottom: 40, left: 40, right: 40 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${LETTERS[optionIndex]}. `,
                    bold: true,
                  }),
                  ...inlineRuns(options[optionIndex]!),
                ],
              }),
            ],
          }),
        );
      } else {
        rowCells.push(
          new TableCell({
            width: { size: 100 / cols, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ text: "" })],
          }),
        );
      }
    }
    rows.push(new TableRow({ height: { value: 400, rule: "atLeast" }, children: rowCells }));
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

/**
 * Build answer lines for exam answer key.
 */
function examAnswerLines(questions: Question[], design: DocxPaperDesign): Paragraph[] {
  const lines: Paragraph[] = [];
  questions.forEach((question, index) => {
    const answer = printableAnswer(question);
    const typeLabel = TYPE_LABELS[question.type] || question.type;
    lines.push(
      new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [
          new TextRun({
            text: `${index + 1}. `,
            bold: true,
            color: design.accent,
          }),
          new TextRun({
            text: answer,
            bold: true,
          }),
          new TextRun({
            text: ` (${typeLabel})`,
            color: design.muted,
            size: 18,
          }),
        ],
      }),
    );
    if (question.explanation) {
      lines.push(
        new Paragraph({
          spacing: { after: 60 },
          indent: { left: 40 },
          children: [
            new TextRun({
              text: question.explanation,
              italics: true,
              color: design.muted,
            }),
          ],
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
  const design = resolveDocxDesign({
    theme: coursePrintOptions.theme,
    palette: coursePrintOptions.palette,
    fallbackAccent: courseColor ? resolveHex(courseColor) : undefined,
    style: coursePrintOptions.printStyle,
  });
  const dims = getPaperDims(coursePrintOptions.paper, coursePrintOptions.orientation);

  onStatus?.("Building the exam…");

  const children: (Paragraph | Table)[] = [];

  // Header
  if (options.showInstructions && options.instructions) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 120 },
        children: [new TextRun("Instructions")],
      }),
    );
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun(options.instructions)],
      }),
    );
  }

  // Questions section
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120, before: 120 },
      children: [new TextRun("Questions")],
    }),
  );

  const totalPoints = options.pointsPerQuestion * questions.length;
  const headerMeta = [
    `${questions.length} question${questions.length === 1 ? "" : "s"}`,
    options.showPoints ? `${totalPoints} point${totalPoints === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  children.push(
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({ text: headerMeta, color: design.muted, size: 16, allCaps: true })],
    }),
  );

  // Questions
  questions.forEach((question, index) => {
    children.push(...examQuestionChildren(question, index + 1, design, options.pointsPerQuestion));
  });

  // Answer key
  if (options.includeAnswerKey) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 120 },
        children: [new TextRun("Answer key")],
      }),
    );
    children.push(...examAnswerLines(questions, design));
  }

  onStatus?.("Embedding the paper design…");
  const art = await buildDocxPaperArt(design, dims, {
    cover: false,
    wash: true,
  });

  onStatus?.("Assembling the Word document…");
  return assembleDocx({
    title,
    children,
    options: coursePrintOptions,
    design,
    art,
    footerLeft: title,
    runningHeader: null,
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
          ...(left ? [new TextRun({ text: left, size: 16, color })] : []),
          new TextRun({ children: ["\t", ...numbers], size: 16, color }),
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
): Header | undefined {
  if (!data && !runningHeader) return undefined;
  const children: (TextRun | ImageRun)[] = [];
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
      new TextRun({
        text: runningHeader,
        size: 14,
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
        alignment: AlignmentType.CENTER,
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
  /** true when page one carries the dark/light themed cover art */
  coverDark: boolean;
  onStatus?: (message: string) => void;
}): Promise<Blob> {
  const dims = getPaperDims(options.paper, options.orientation);
  const contentWidth = px(dims.width - PRINT_MARGIN_PX * 2);
  const fontFamily = options.typeface === "serif" ? "Georgia" : "Calibri";
  const fontSizes = { small: 18, normal: 20, large: 22 } as const;
  const lineSpacing = { compact: 280, normal: 320, relaxed: 360 } as const;
  const headingSizes = { 1: 36, 2: 28, 3: 24, 4: 20 } as const;

  const headingStyle = (level: 1 | 2 | 3 | 4) => ({
    id: `Heading${level}`,
    name: `Heading ${level}`,
    basedOn: "Normal",
    next: "Normal",
    quickFormat: true,
    run: {
      font: fontFamily,
      size: headingSizes[level] * 2, // docx uses half-points
      bold: true,
      color: design.ink,
    },
    paragraph: {
      spacing: {
        before: level === 1 ? 400 : level === 2 ? 300 : level === 3 ? 200 : 120,
        after: level === 1 ? 160 : level === 2 ? 120 : 100,
      },
      keepNext: true,
      outlineLevel: level - 1,
      ...(level === 1
        ? {
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 12, color: design.accent, space: 6 },
            },
            pageBreakBefore: true,
          }
        : {}),
    },
  });

  const bodyHeader = pageHeader(art.wash, dims, runningHeader, design.muted);
  const bodyFooter = pageFooter(options.footerStyle, footerLeft, design.muted, contentWidth);
  const coverHeader = coverDark ? pageHeader(art.cover, dims, null, design.cover.muted) : undefined;
  const coverFooter = coverDark
    ? pageFooter(options.footerStyle, footerLeft, design.cover.muted, contentWidth)
    : undefined;

  const docxDocument = new Document({
    creator: "Knowly",
    title,
    description,
    features: { updateFields: true },
    styles: {
      default: {
        document: {
          run: { font: fontFamily, size: fontSizes[options.fontScale] * 2, color: design.ink },
          paragraph: { 
            spacing: { 
              line: lineSpacing[options.spacing],
              lineRule: "auto",
            } 
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

  onStatus?.("Saving the .docx…");
  return Packer.toBlob(docxDocument);
}
