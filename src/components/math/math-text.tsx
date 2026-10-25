import { Fragment, useMemo, useRef } from "react";
import "katex/dist/katex.min.css";
import { latexHtml, MATH_SYMBOLS, splitMath } from "@/lib/math";
import { cn } from "@/lib/utils";

/**
 * Renders text with inline LaTeX equations typeset by KaTeX (rendered
 * locally, no network). Plain text stays safe — it is never injected as HTML.
 */
export function MathText({ text, className }: { text?: string; className?: string }) {
  const segments = useMemo(() => splitMath(text ?? ""), [text]);
  const hasMath = segments.some((s) => s.kind === "math");
  if (!hasMath) return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.kind === "text" ? (
          <Fragment key={i}>{seg.source}</Fragment>
        ) : (
          <span
            key={i}
            className={cn("katex-chip", seg.display && "katex-chip-display")}
            dangerouslySetInnerHTML={{ __html: latexHtml(seg.source, seg.display) }}
          />
        ),
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Symbol keypad for typed math answers
 * ------------------------------------------------------------------ */

/** Insert a symbol into a text field at the caret, touch and mouse friendly. */
export function insertAtCaret(
  input: HTMLInputElement | HTMLTextAreaElement | null,
  symbol: string,
  after: (value: string) => void,
) {
  if (!input) return after(symbol);
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const next = input.value.slice(0, start) + symbol + input.value.slice(end);
  after(next);
  // restore the caret after React re-renders the controlled input
  const caret = start + symbol.length;
  requestAnimationFrame(() => {
    input.focus();
    input.setSelectionRange(caret, caret);
  });
}

export function MathKeypad({
  target,
  onValue,
  className,
}: {
  /** the input to insert into (a ref's current element) */
  target: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  onValue: (value: string) => void;
  className?: string;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={gridRef} className={cn("space-y-1.5", className)}>
      <p className="text-[11px] text-muted-foreground">Tap to add a symbol to your answer:</p>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Math symbols">
        {MATH_SYMBOLS.map((symbol) => (
          <button
            key={symbol.name}
            type="button"
            tabIndex={-1}
            aria-label={symbol.name}
            onClick={(e) => {
              e.preventDefault();
              insertAtCaret(target.current, symbol.insert, onValue);
            }}
            className="min-h-8 min-w-8 rounded-md border border-border bg-surface-2/60 px-2 text-sm text-foreground/80 transition-colors hover:border-primary/60 hover:text-primary"
          >
            {symbol.label}
          </button>
        ))}
      </div>
    </div>
  );
}
