import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import type { ExamTheme } from "@/lib/exam-print";
import {
  createReadingHighlightAnchor,
  locateReadingHighlight,
  normalizeReadingText,
  type ReadingHighlightAnchor,
} from "@/lib/reading-highlights";
import type { ReadingHighlight } from "@/lib/types";
import { documentThemeStyle, getDocumentThemeDesign } from "@/lib/document-themes";
import { cn } from "@/lib/utils";

/**
 * ModuleMarkdownText — shared typesetting for module bodies.
 *
 * variant "screen": themed rendering for editors and viewers.
 * variant "paper":  measured print flow; ink colors get neutralised by the
 *                   module print stylesheet, while tinted backgrounds and the
 *                   accent (as background/border color) stay colorful.
 */

const sharedClass = cn(
  "text-[0.98em] leading-[1.72]",
  // paragraphs — comfortable measure, no orphaned first/last margins
  "[&_p]:my-[0.55em] [&_p]:text-pretty [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
  // headings — tight leading, restrained tracking, generous air above
  "[&_h1]:mt-7 [&_h1]:mb-3 [&_h1]:pb-1.5 [&_h1]:text-[1.32em] [&_h1]:font-bold [&_h1]:leading-[1.25] [&_h1]:tracking-tight [&_h1]:border-b-2 [&_h1]:border-[color:var(--md-accent)]",
  "[&_h2]:relative [&_h2]:mt-6 [&_h2]:mb-2.5 [&_h2]:pl-[1.05em] [&_h2]:text-[1.16em] [&_h2]:font-bold [&_h2]:leading-snug [&_h2]:tracking-tight",
  "[&_h2]:before:absolute [&_h2]:before:left-0 [&_h2]:before:top-[0.3em] [&_h2]:before:size-[0.4em] [&_h2]:before:rotate-45 [&_h2]:before:rounded-[0.1em] [&_h2]:before:content-[''] [&_h2]:before:bg-[color:var(--md-accent)]",
  "[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-[1.03em] [&_h3]:font-semibold [&_h3]:tracking-[0.01em]",
  "[&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:text-[0.95em] [&_h4]:font-semibold [&_h4]:uppercase [&_h4]:tracking-[0.06em] [&_h4]:text-foreground/85",
  "[&_h5]:mt-3 [&_h5]:mb-1 [&_h5]:font-semibold",
  // links & emphasis
  "[&_a]:font-medium [&_a]:underline [&_a]:underline-offset-[0.2em] [&_a]:decoration-dotted [&_a]:decoration-[color:var(--md-accent)]",
  "[&_strong]:font-semibold [&_em]:italic",
  // lists — real indent (lists only), spaced items, accent markers
  "[&_ul]:my-[0.55em] [&_ol]:my-[0.55em] [&_ul]:pl-[1.9em] [&_ol]:pl-[1.9em]",
  "[&_ul>li]:list-disc [&_ul>li]:marker:text-[color:var(--md-accent)] [&_ul>li]:marker:text-[0.75em]",
  "[&_ol>li]:list-decimal [&_ol>li]:marker:font-semibold [&_ol>li]:marker:text-[color:var(--md-accent)]",
  "[&_li]:my-[0.3em] [&_li]:text-pretty [&_li>p]:my-[0.2em]",
  // nested lists double the indent via the root padding + their own hanging markers
  "[&_li>ul]:mt-[0.25em] [&_li>ol]:mt-[0.25em]",
  // task lists (GFM)
  "[&_li.task-list-item]:list-none [&_li.task-list-item]:pl-0 [&_input[type=checkbox]]:mr-1.5 [&_input[type=checkbox]]:translate-y-[0.15em]",
  // blockquote — accent bar, slightly smaller, calm color
  "[&_blockquote]:my-[0.7em] [&_blockquote]:border-l-[3px] [&_blockquote]:border-[color:var(--md-accent)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[0.95em]",
  "[&_blockquote>*:first-child]:mt-0 [&_blockquote>*:last-child]:mb-0",
  // inline code
  "[&_code:not(pre code)]:rounded-[0.3em] [&_code:not(pre code)]:bg-muted [&_code:not(pre code)]:px-[0.35em] [&_code:not(pre code)]:py-[0.12em] [&_code:not(pre code)]:text-[0.87em] [&_code:not(pre code)]:font-mono",
  "[&_pre]:my-[0.8em] [&_pre]:overflow-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-words",
  "[&_img]:mx-auto [&_img]:block [&_img]:max-w-full [&_hr]:my-0 [&_hr]:border-0",
  // tables — measured cells, generous padding
  "[&_th]:px-[0.65em] [&_th]:py-[0.45em] [&_th]:text-left [&_th]:text-[0.72em] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-[0.09em]",
  "[&_td]:px-[0.65em] [&_td]:py-[0.5em] [&_td]:align-top [&_td]:text-[0.95em] [&_td]:border-t",
);

const screenClass = cn(
  "[&_td]:border-border [&_pre]:my-[0.8em] [&_pre]:rounded-2xl [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted/50 [&_pre]:p-3.5 [&_pre]:text-[0.86em] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[1em] [&_pre_code]:text-foreground [&_img]:my-3 [&_img]:rounded-2xl [&_img]:border [&_img]:border-border [&_img]:shadow-sm",
);

const paperClass = cn(
  "[&_td]:border-foreground/20 [&_pre]:my-[0.8em] [&_pre]:rounded-[0.5em] [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-[0.88em] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_img]:my-2 [&_img]:rounded-[0.5em]",
);

interface MarkdownNode {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: MarkdownNode[];
}

interface TextPosition {
  node: MarkdownNode | null;
  start: number;
  end: number;
}

interface TextMark {
  node: MarkdownNode;
  start: number;
  end: number;
  id: string;
}

const BLOCK_TAGS = new Set([
  "blockquote",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "ol",
  "p",
  "pre",
  "table",
  "td",
  "th",
  "tr",
  "ul",
]);

function isKatex(node: MarkdownNode): boolean {
  const classes = node.properties?.className;
  return (
    node.tagName === "span" &&
    (classes === "katex" || (Array.isArray(classes) && classes.includes("katex")))
  );
}

export function createReadingHighlightPlugin(highlights: ReadingHighlight[]) {
  return () => (tree: MarkdownNode) => {
    let text = "";
    const positions: TextPosition[] = [];

    const appendSpace = () => {
      if (!text || text.endsWith(" ")) return;
      text += " ";
      positions.push({ node: null, start: 0, end: 0 });
    };

    const visit = (node: MarkdownNode) => {
      if (node.type === "text" && typeof node.value === "string") {
        let index = 0;
        while (index < node.value.length) {
          if (/\s/.test(node.value[index]!)) {
            const start = index;
            while (index < node.value.length && /\s/.test(node.value[index]!)) index += 1;
            if (text && !text.endsWith(" ")) {
              text += " ";
              positions.push({ node, start, end: index });
            }
            continue;
          }
          text += node.value[index]!;
          positions.push({ node, start: index, end: index + 1 });
          index += 1;
        }
        return;
      }

      if (isKatex(node)) return;
      const isBlock =
        node.type === "element" && Boolean(node.tagName && BLOCK_TAGS.has(node.tagName));
      if (isBlock) appendSpace();
      node.children?.forEach(visit);
      if (isBlock) appendSpace();
    };

    visit(tree);
    const normalized = normalizeReadingText(text);
    const trimStart = text.length - text.trimStart().length;
    const textPositions = positions.slice(trimStart, trimStart + normalized.length);
    const marksByNode = new Map<MarkdownNode, TextMark[]>();

    for (const highlight of highlights) {
      const located = locateReadingHighlight(normalized, highlight);
      if (!located) continue;
      let group: TextMark | null = null;
      const flush = () => {
        if (!group) return;
        const current = marksByNode.get(group.node) ?? [];
        current.push(group);
        marksByNode.set(group.node, current);
        group = null;
      };

      for (const position of textPositions.slice(located.start, located.end)) {
        if (!position.node) {
          flush();
          continue;
        }
        if (group && group.node === position.node && position.start <= group.end) {
          group.end = Math.max(group.end, position.end);
        } else {
          flush();
          group = {
            node: position.node,
            start: position.start,
            end: position.end,
            id: highlight.id,
          };
        }
      }
      flush();
    }

    const applyMarks = (parent: MarkdownNode) => {
      if (!parent.children) return;
      parent.children = parent.children.flatMap((child) => {
        if (child.type === "text" && marksByNode.has(child)) {
          const value = child.value ?? "";
          const marks = [...(marksByNode.get(child) ?? [])].sort((a, b) => a.start - b.start);
          const output: MarkdownNode[] = [];
          let cursor = 0;
          for (const mark of marks) {
            if (mark.start < cursor) continue;
            if (mark.start > cursor) {
              output.push({ type: "text", value: value.slice(cursor, mark.start) });
            }
            output.push({
              type: "element",
              tagName: "mark",
              properties: {
                className: ["reading-highlight"],
                dataReadingHighlightId: mark.id,
                title: "Click to remove this highlight",
              },
              children: [{ type: "text", value: value.slice(mark.start, mark.end) }],
            });
            cursor = mark.end;
          }
          if (cursor < value.length) output.push({ type: "text", value: value.slice(cursor) });
          return output;
        }
        applyMarks(child);
        return [child];
      });
    };

    applyMarks(tree);
  };
}

export function ModuleMarkdownText({
  markdown,
  accent,
  variant = "screen",
  headingPrefix,
  className,
  theme = "classic",
  highlights = [],
  onAddHighlight,
  onRemoveHighlight,
}: {
  markdown: string;
  /** accent color — module color on screen, kept as tint on paper */
  accent?: string;
  variant?: "screen" | "paper";
  headingPrefix?: string;
  className?: string;
  theme?: ExamTheme;
  highlights?: ReadingHighlight[];
  onAddHighlight?: (anchor: ReadingHighlightAnchor) => void;
  onRemoveHighlight?: (id: string) => void;
}) {
  const safeAccent = accent || "var(--primary)";
  const rootRef = useRef<HTMLDivElement>(null);
  const [selectionAction, setSelectionAction] = useState<{
    anchor: ReadingHighlightAnchor;
    top: number;
    left: number;
  } | null>(null);
  const rehypePlugins = useMemo(
    () => [rehypeKatex, createReadingHighlightPlugin(highlights)],
    [highlights],
  );
  let headingIndex = 0;
  const nextHeadingId = () =>
    headingPrefix ? `${headingPrefix}-heading-${headingIndex++}` : undefined;

  const components: Components = {
    h1: ({ children }) => (
      <h1 id={nextHeadingId()} className="scroll-mt-24">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 id={nextHeadingId()} className="scroll-mt-24">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 id={nextHeadingId()} className="scroll-mt-24">
        {children}
      </h3>
    ),
    hr: () => (
      <div aria-hidden className="my-[1.1em] flex items-center justify-center gap-2">
        <span
          className={cn("h-px flex-1", variant === "paper" ? "bg-foreground/25" : "bg-border")}
        />
        <span
          className="size-[0.45em] rotate-45 rounded-[0.1em]"
          style={{ background: safeAccent }}
        />
        <span
          className={cn("h-px flex-1", variant === "paper" ? "bg-foreground/25" : "bg-border")}
        />
      </div>
    ),
    table: ({ children }: { children?: ReactNode }) => (
      <div
        className={cn(
          "my-[0.85em] overflow-x-auto rounded-[0.6em] border",
          variant === "paper" ? "border-foreground/25" : "border-border",
        )}
      >
        <table className="w-full border-collapse">{children}</table>
      </div>
    ),
    th: ({ children }: { children?: ReactNode }) => (
      <th
        className=""
        style={{
          background: `color-mix(in oklab, ${safeAccent} 14%, transparent)`,
        }}
      >
        {children}
      </th>
    ),
  };

  const handleSelection = () => {
    if (!onAddHighlight || variant !== "screen") return;
    const root = rootRef.current;
    const selection = window.getSelection();
    if (!root || !selection || selection.isCollapsed || !selection.toString().trim()) {
      setSelectionAction(null);
      return;
    }
    const range = selection.getRangeAt(0);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
      setSelectionAction(null);
      return;
    }
    const before = document.createRange();
    before.selectNodeContents(root);
    before.setEnd(range.startContainer, range.startOffset);
    const after = document.createRange();
    after.selectNodeContents(root);
    after.setStart(range.endContainer, range.endOffset);
    const textWithoutMath = (part: Range) => {
      const contents = part.cloneContents();
      contents.querySelectorAll(".katex").forEach((node) => node.remove());
      return contents.textContent ?? "";
    };
    const anchor = createReadingHighlightAnchor(
      textWithoutMath(before),
      textWithoutMath(range),
      textWithoutMath(after),
    );
    if (!anchor) {
      setSelectionAction(null);
      return;
    }
    const bounds = range.getBoundingClientRect();
    setSelectionAction({
      anchor,
      top: Math.max(10, bounds.top - 44),
      left: Math.max(72, Math.min(window.innerWidth - 72, bounds.left + bounds.width / 2)),
    });
  };

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const marker = target.closest<HTMLElement>("[data-reading-highlight-id]");
    const id = marker?.dataset.readingHighlightId;
    if (id) {
      onRemoveHighlight?.(id);
      setSelectionAction(null);
    }
  };

  const themeStyle = documentThemeStyle(
    theme,
    variant === "paper" ? "paper" : "screen",
    safeAccent,
  );

  return (
    <div
      ref={rootRef}
      data-document-theme={theme}
      data-document-table-style={getDocumentThemeDesign(theme).tableStyle}
      data-document-heading-style={getDocumentThemeDesign(theme).titleRule}
      className={cn(
        "document-markdown",
        sharedClass,
        variant === "paper" ? paperClass : screenClass,
        onAddHighlight && variant === "screen" && "relative",
        className,
      )}
      style={{ ...themeStyle, ["--md-accent" as string]: safeAccent }}
      onMouseUp={handleSelection}
      onKeyUp={handleSelection}
      onClick={handleClick}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={rehypePlugins}>
        {markdown}
      </ReactMarkdown>
      {selectionAction && onAddHighlight && (
        <button
          type="button"
          className="reading-highlight-action"
          style={{ top: selectionAction.top, left: selectionAction.left }}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onAddHighlight(selectionAction.anchor);
            setSelectionAction(null);
            window.getSelection()?.removeAllRanges();
          }}
        >
          Highlight
        </button>
      )}
    </div>
  );
}
