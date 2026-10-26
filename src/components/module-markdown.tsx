import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { ReactNode } from "react";
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
  // lists — real indent, spaced items, accent markers
  "[&_ul]:my-[0.55em] [&_ol]:my-[0.55em]",
  "[&_ul>li]:list-disc [&_ul>li]:pl-[0.35em] [&_ul>li]:marker:text-[color:var(--md-accent)] [&_ul>li]:marker:text-[0.75em]",
  "[&_ol>li]:list-decimal [&_ol>li]:pl-[0.35em] [&_ol>li]:marker:font-semibold [&_ol>li]:marker:text-[color:var(--md-accent)]",
  "[&_li]:my-[0.3em] [&_li]:text-pretty [&_li>p]:my-[0.2em]",
  "[&_li>ul]:mt-[0.25em] [&_li>ul]:ml-[1em] [&_li>ol]:mt-[0.25em] [&_li>ol]:ml-[1em]",
  // task lists (GFM)
  "[&_li.task-list-item]:list-none [&_li.task-list-item]:pl-0 [&_input[type=checkbox]]:mr-1.5 [&_input[type=checkbox]]:translate-y-[0.15em]",
  // blockquote — accent bar, slightly smaller, calm color
  "[&_blockquote]:my-[0.7em] [&_blockquote]:border-l-[3px] [&_blockquote]:border-[color:var(--md-accent)] [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-[0.95em]",
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

export function ModuleMarkdownText({
  markdown,
  accent,
  variant = "screen",
  className,
}: {
  markdown: string;
  /** accent color — module color on screen, kept as tint on paper */
  accent?: string;
  variant?: "screen" | "paper";
  className?: string;
}) {
  const safeAccent = accent || "var(--primary)";

  const components: Components = {
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

  return (
    // the CSS custom property feeds every accent-colored utility above
    <div
      className={cn(sharedClass, variant === "paper" ? paperClass : screenClass, className)}
      style={{ ["--md-accent" as string]: safeAccent }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
