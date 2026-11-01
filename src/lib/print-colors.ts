import { isValidHex, luminance, normalizeHex } from "./themes";

/**
 * Print colours for the paper studios.
 *
 * Both papers print on a white sheet, but their identity colour arrives as a
 * theme token (`var(--deck-1)` → `--primary`). In a dark theme that token is a
 * *light* colour — sometimes near-white — so it has to be measured against the
 * sheet and deepened before it is used for accent text or a filled badge with
 * white type. WCAG AA for body text is 4.5:1; the same ratio also makes white
 * type on the accent fill legible, because it is the same pair of colours.
 */

/** Deepest step of the darkening ramp. Keeps the hue while lowering lightness. */
const INK = "#10151c";
const MIN_CONTRAST = 4.5;
const WHITE = "#ffffff";

function channelToHex(channel: number) {
  return Math.max(0, Math.min(255, Math.round(channel)))
    .toString(16)
    .padStart(2, "0");
}

function parseRgb(value: string): [number, number, number] | null {
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(value);
  if (rgb) {
    const [r, g, b] = rgb[1]!.split(/[,\s/]+/).filter(Boolean).map(Number);
    if ([r, g, b].some((channel) => !Number.isFinite(channel))) return null;
    return [r!, g!, b!];
  }
  // Chrome reports `color-mix()` as `color(srgb 0.12 0.34 0.56)`.
  const srgb = /^color\(\s*srgb\s+([^)]+)\)$/i.exec(value);
  if (srgb) {
    const parts = srgb[1]!.trim().split(/\s+/).map(Number);
    if (parts.length < 3 || parts.some((part) => !Number.isFinite(part))) return null;
    return [parts[0]! * 255, parts[1]! * 255, parts[2]! * 255];
  }
  return null;
}

/**
 * Last resort for colour functions `parseRgb` does not spell out (`oklch()`,
 * `lab()`, …): paint one pixel and read it back. The canvas stores sRGB, so the
 * result is the colour the reader actually sees on screen.
 */
function canvasRgb(value: string): [number, number, number] | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    // A sentinel makes an unparseable value detectable: an invalid fillStyle
    // assignment leaves the previous colour in place.
    context.fillStyle = "#010203";
    context.fillStyle = value;
    if (context.fillStyle === "#010203") return null;
    context.fillRect(0, 0, 1, 1);
    const pixel = context.getImageData(0, 0, 1, 1).data;
    if (pixel[3] === 0) return null;
    return [pixel[0]!, pixel[1]!, pixel[2]!];
  } catch {
    return null;
  }
}

/**
 * Resolve any CSS colour to a concrete hex by asking the browser to parse it.
 * Returns null without a document, or when the value is not a colour.
 */
export function resolveCssColor(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (isValidHex(raw)) return normalizeHex(raw);
  if (typeof document === "undefined") return null;
  const probe = document.createElement("span");
  probe.style.color = raw;
  // An unparseable value leaves the property empty, so nothing is guessed.
  if (!probe.style.color) return null;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  const rgb = parseRgb(computed) ?? canvasRgb(computed);
  if (!rgb) return null;
  return `#${channelToHex(rgb[0])}${channelToHex(rgb[1])}${channelToHex(rgb[2])}`;
}

/** Mix `amount` (0..1) of ink into a hex colour. */
function towardInk(hex: string, amount: number): string {
  const value = normalizeHex(hex);
  const ink = normalizeHex(INK);
  const mixChannel = (index: number) => {
    const from = parseInt(value.slice(index, index + 2), 16);
    const to = parseInt(ink.slice(index, index + 2), 16);
    return channelToHex(from + (to - from) * amount);
  };
  return `#${mixChannel(1)}${mixChannel(3)}${mixChannel(5)}`;
}

/** WCAG contrast ratio, 1..21. */
export function contrastRatio(a: string, b: string): number {
  const first = luminance(a);
  const second = luminance(b);
  const [high, low] = first > second ? [first, second] : [second, first];
  return (high + 0.05) / (low + 0.05);
}

/**
 * The identity colour, deepened only as far as it must be to stay readable on
 * white paper. A colour that is already legible is returned untouched, so light
 * themes keep their exact accent and dark themes stop printing pale-on-white.
 */
export function readableAccent(color: string | undefined, fallback = "#3b5bdb"): string {
  const hex = resolveCssColor(color) ?? fallback;
  if (contrastRatio(hex, WHITE) >= MIN_CONTRAST) return hex;
  let deepest = hex;
  for (let step = 1; step <= 10; step += 1) {
    deepest = towardInk(hex, step / 10);
    if (contrastRatio(deepest, WHITE) >= MIN_CONTRAST) return deepest;
  }
  return deepest;
}
