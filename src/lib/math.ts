import katex from "katex";

/**
 * Math & LaTeX support.
 *
 * Knowly never calls out to the network — KaTeX renders equations entirely
 * locally, and these helpers just split a piece of text into plain-language
 * and math segments so the UI can show real typeset equations.
 *
 * Supported delimiters (matching what Prompt Forge asks the user's AI for):
 * - display math:  $$…$$  or  \[…]\
 * - inline math:   $…$   or  \(…\)
 */

export interface MathSegment {
  kind: "text" | "math";
  source: string;
  display: boolean;
}

interface MathDelimiter {
  open: string;
  close: string;
  display: boolean;
}

/** longer openers first, so $$ wins over $ */
const DELIMITERS: MathDelimiter[] = [
  { open: "$$", close: "$$", display: true },
  { open: "\\[", close: "\\]", display: true },
  { open: "$", close: "$", display: false },
  { open: "\\(", close: "\\)", display: false },
];

/** True when the text contains at least one math segment. */
export function hasLatex(text: string): boolean {
  return splitMath(text ?? "").some((s) => s.kind === "math");
}

/** Split text into a sequence of plain and math segments. */
export function splitMath(text: string): MathSegment[] {
  if (!text) return [{ kind: "text", source: "", display: false }];
  const segments: MathSegment[] = [];
  let plain = "";
  let i = 0;

  const flush = () => {
    if (plain) segments.push({ kind: "text", source: plain, display: false });
    plain = "";
  };

  while (i < text.length) {
    // escaped dollar: literal "$", never a delimiter
    if (text[i] === "\\" && text[i + 1] === "$") {
      plain += text.slice(i, i + 2);
      i += 2;
      continue;
    }

    const delimiter = DELIMITERS.find((d) => text.startsWith(d.open, i));
    if (!delimiter) {
      plain += text[i];
      i++;
      continue;
    }

    const bodyStart = i + delimiter.open.length;
    let end = -1;
    let j = bodyStart;
    while (j < text.length) {
      if (text[j] === "\\" && text[j + 1] === "$") {
        j += 2;
        continue;
      }
      if (text.startsWith(delimiter.close, j)) {
        end = j;
        break;
      }
      j++;
    }
    if (end === -1) {
      // unterminated: treat the opener as plain text
      plain += delimiter.open;
      i += delimiter.open.length;
      continue;
    }
    const source = text.slice(bodyStart, end);
    if (source.trim()) {
      flush();
      segments.push({ kind: "math", source, display: delimiter.display });
    } else {
      plain += delimiter.open + delimiter.close;
    }
    i = end + delimiter.close.length;
  }
  flush();
  return segments;
}

/** Render a LaTeX snippet to self-contained HTML (KaTeX, no external requests).
 * Results are cached: study screens typeset the same questions over and over
 * during store-driven re-renders. */
const latexCache = new Map<string, string>();

export function latexHtml(source: string, display: boolean): string {
  const key = (display ? "d:" : "i:") + source;
  let html = latexCache.get(key);
  if (html === undefined) {
    try {
      html = katex.renderToString(source, {
        displayMode: display,
        throwOnError: false,
        strict: "ignore",
        trust: false,
        output: "html",
      });
    } catch {
      html = source.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    if (latexCache.size > 4000) latexCache.clear();
    latexCache.set(key, html);
  }
  return html;
}

/* ------------------------------------------------------------------ *
 * Symbol palette for typed math answers
 * ------------------------------------------------------------------ */

export interface MathSymbol {
  /** shown on the button */
  label: string;
  /** inserted into the answer */
  insert: string;
  name: string;
}

export const MATH_SYMBOLS: MathSymbol[] = [
  { label: "×", insert: "×", name: "multiply" },
  { label: "÷", insert: "÷", name: "divide" },
  { label: "±", insert: "±", name: "plus-minus" },
  { label: "≈", insert: "≈", name: "approx" },
  { label: "≠", insert: "≠", name: "not equal" },
  { label: "≤", insert: "≤", name: "less or equal" },
  { label: "≥", insert: "≥", name: "greater or equal" },
  { label: "√", insert: "√", name: "square root" },
  { label: "²", insert: "²", name: "squared" },
  { label: "³", insert: "³", name: "cubed" },
  { label: "°", insert: "°", name: "degrees" },
  { label: "π", insert: "π", name: "pi" },
  { label: "θ", insert: "θ", name: "theta" },
  { label: "α", insert: "α", name: "alpha" },
  { label: "β", insert: "β", name: "beta" },
  { label: "λ", insert: "λ", name: "lambda" },
  { label: "μ", insert: "μ", name: "mu" },
  { label: "Δ", insert: "Δ", name: "delta" },
  { label: "Ω", insert: "Ω", name: "ohm" },
  { label: "∞", insert: "∞", name: "infinity" },
  { label: "∑", insert: "∑", name: "sum" },
  { label: "∫", insert: "∫", name: "integral" },
  { label: "→", insert: "→", name: "arrow" },
  { label: "f′", insert: "f′", name: "f prime" },
];
