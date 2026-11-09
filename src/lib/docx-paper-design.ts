import { resolveThemePalette, type ExamPaletteId, type ExamTheme } from "./exam-print";
import { readableAccent } from "./print-colors";
import { normalizeHex } from "./themes";

/**
 * The Word export of a paper studio has to wear the *same* design as the paper
 * preview, for every theme and every palette. Word cannot read the preview's
 * CSS (`color-mix()`, `var(--exam-accent)`, layered gradients), so this module
 * is the bridge:
 *
 * - colours are resolved to plain six-digit hex for docx shading and text runs;
 * - the theme's paper wash, accent edge and cover surface are drawn as SVG and
 *   rasterised to PNG, then embedded in the .docx by `course-docx.ts` (never
 *   linked, so the file stays self-contained);
 * - the palette and the print style both win over the theme, exactly as they
 *   do in `paperThemeVars()`.
 *
 * Everything in the resolution half is pure, so it can be tested without a DOM.
 * The rasteriser half only runs in the browser where the export happens.
 */

export type DocxPrintStyle = "design" | "friendly";

export interface DocxCoverInk {
  /** true when the cover prints light ink on a dark surface */
  dark: boolean;
  /** the surface the ink tokens were flattened over */
  base: string;
  ink: string;
  muted: string;
  line: string;
  fill: string;
}

export interface DocxPaperDesign {
  theme: ExamTheme;
  paletteId?: ExamPaletteId;
  style: DocxPrintStyle;
  /** identity colour, deepened until it is legible on white paper */
  accent: string;
  /** paper wash fill (palette wash, or a tint of the base accent) */
  soft: string;
  /** rule tint over the paper */
  border: string;
  ink: string;
  muted: string;
  rule: string;
  cover: DocxCoverInk;
}

export interface PaperDims {
  width: number;
  height: number;
}

const WHITE = "#ffffff";
const INK = "#1f2937";
const MUTED = "#5b6472";
const FRIENDLY_MUTED = "#555555";
const RULE = "#9ca3af";
const FRIENDLY_INK = "#1f2937";

/** Six-digit hex without the `#`, which is what docx expects. */
const bare = (hex: string) => normalizeHex(hex).slice(1).toUpperCase();

function rgb(hex: string): [number, number, number] {
  const value = normalizeHex(hex);
  return [
    parseInt(value.slice(1, 3), 16),
    parseInt(value.slice(3, 5), 16),
    parseInt(value.slice(5, 7), 16),
  ];
}

function fromRgb(channels: number[]): string {
  return `#${channels
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** Mix `weight` (0..1) of `b` into `a`, the same maths `color-mix()` uses in sRGB. */
export function mixHex(a: string, b: string, weight: number): string {
  const first = rgb(a);
  const second = rgb(b);
  const t = Math.max(0, Math.min(1, weight));
  return fromRgb(first.map((channel, index) => channel + (second[index]! - channel) * t));
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Flatten a translucent colour over an opaque surface — docx has no alpha. */
function over(color: string, surface: string): string {
  const parsed = /^rgba?\(([^)]+)\)$/i.exec(color);
  if (parsed) {
    const parts = parsed[1]!
      .split(/[,\s/]+/)
      .filter(Boolean)
      .map(Number);
    const [r, g, b] = parts;
    const alpha = parts.length > 3 ? (parts[3] ?? 1) : 1;
    const base = rgb(surface);
    return fromRgb([
      r! * alpha + base[0]! * (1 - alpha),
      g! * alpha + base[1]! * (1 - alpha),
      b! * alpha + base[2]! * (1 - alpha),
    ]);
  }
  return normalizeHex(color);
}

/**
 * Cover ink per theme. Mirrors `coverDesign()` in
 * `src/components/print/cover-designs.tsx`: dark themes print light ink, light
 * themes print dark ink, and the translucent tokens are flattened here because
 * Word runs need solid colours.
 */
function coverInk(theme: ExamTheme, accent: string): DocxCoverInk {
  const dark = (
    base: string,
    ink: string,
    muted = "rgba(255, 255, 255, 0.72)",
    line = "rgba(255, 255, 255, 0.26)",
    fill = "rgba(255, 255, 255, 0.14)",
  ): DocxCoverInk => ({
    dark: true,
    base: normalizeHex(base),
    ink: normalizeHex(ink),
    muted: over(muted, base),
    line: over(line, base),
    fill: over(fill, base),
  });
  const light = (
    base: string,
    ink = "#1b2430",
    muted = "rgba(27, 36, 48, 0.62)",
    line = "rgba(27, 36, 48, 0.24)",
    fill = "rgba(27, 36, 48, 0.06)",
  ): DocxCoverInk => ({
    dark: false,
    base: normalizeHex(base),
    ink: normalizeHex(ink),
    muted: over(muted, base),
    line: over(line, base),
    fill: over(fill, base),
  });

  switch (theme) {
    case "module":
      return dark("#0b1119", "#ffffff", "rgba(255, 255, 255, 0.74)");
    case "field-notes":
      return dark(
        mixHex("#14170f", accent, 0.08),
        "#f6f1e2",
        "rgba(246, 241, 226, 0.72)",
        "rgba(246, 241, 226, 0.38)",
        "rgba(246, 241, 226, 0.1)",
      );
    case "blueprint":
      return dark(
        mixHex("#06192a", accent, 0.16),
        "#eaf4ff",
        "rgba(234, 244, 255, 0.7)",
        "rgba(234, 244, 255, 0.34)",
        "rgba(234, 244, 255, 0.12)",
      );
    case "terminal":
      return dark(
        mixHex("#050807", accent, 0.07),
        "#c9ffdf",
        "rgba(201, 255, 223, 0.66)",
        "rgba(201, 255, 223, 0.3)",
        "rgba(201, 255, 223, 0.1)",
      );
    case "lab-report":
      return light(mixHex("#eef4f9", accent, 0.14));
    case "workbook":
      return light("#fffdf6");
    case "manuscript":
      return light(
        mixHex("#f4e8cf", accent, 0.16),
        "#3b2f1c",
        "rgba(107, 88, 54, 0.78)",
        "rgba(107, 88, 54, 0.45)",
        "rgba(107, 88, 54, 0.09)",
      );
    case "newspaper":
      return light(
        mixHex("#f3eee2", accent, 0.09),
        "#141414",
        "rgba(20, 20, 20, 0.72)",
        "rgba(20, 20, 20, 0.34)",
        "rgba(20, 20, 20, 0.05)",
      );
    case "comic":
      return light(
        mixHex("#fff7e4", accent, 0.12),
        "#12100d",
        "rgba(18, 16, 13, 0.72)",
        "rgba(18, 16, 13, 0.5)",
        "rgba(18, 16, 13, 0.06)",
      );
    case "botanical":
      return light(
        mixHex("#e9f2e4", accent, 0.12),
        "#22301f",
        "rgba(58, 74, 52, 0.72)",
        "rgba(58, 74, 52, 0.34)",
        "rgba(58, 74, 52, 0.07)",
      );
    case "classic":
    default:
      return dark("#091120", "#ffffff");
  }
}

/**
 * Resolve the selected theme + palette + print style into colours Word can use.
 * The palette wins over the course/module colour, which wins over the theme —
 * the same precedence as the paper preview.
 */
export function resolveDocxDesign(input: {
  theme?: ExamTheme;
  palette?: ExamPaletteId | "theme";
  /** an already-resolved course or module colour */
  fallbackAccent?: string;
  style?: DocxPrintStyle;
}): DocxPaperDesign {
  const style = input.style ?? "design";
  const friendly = style === "friendly";
  const fallback = input.fallbackAccent ? normalizeHex(input.fallbackAccent) : undefined;
  const safeFallback = fallback && /^#[0-9a-f]{6}$/i.test(fallback) ? fallback : undefined;

  const { theme, palette } = resolveThemePalette(input.theme, input.palette);
  const rawAccent = palette?.accent ?? safeFallback ?? theme.accent;
  const accent = readableAccent(rawAccent, "#3b5bdb");
  const soft = palette?.soft ?? mixHex(rawAccent, WHITE, 0.92);
  const border = palette?.border ?? mixHex(rawAccent, WHITE, 0.74);

  return {
    theme: theme.id,
    paletteId: palette?.id,
    style,
    accent: bare(accent),
    soft: friendly ? bare(WHITE) : bare(soft),
    border: friendly ? bare(RULE) : bare(border),
    ink: bare(friendly ? FRIENDLY_INK : INK),
    muted: bare(friendly ? FRIENDLY_MUTED : MUTED),
    rule: bare(RULE),
    cover: friendly
      ? {
          dark: false,
          base: WHITE,
          ink: bare(FRIENDLY_INK),
          muted: bare("#4b5563"),
          line: bare(mixHex(accent, WHITE, 0.6)),
          fill: bare(WHITE),
        }
      : coverInk(theme.id, accent),
  };
}

/* ------------------------------------------------------------------ *
 * SVG art — the paper wash, the accent edge and the themed cover
 * ------------------------------------------------------------------ */

interface GradientStop {
  color: string;
  /** 0..1 */
  at: number;
  alpha?: number;
}

function stopsMarkup(stops: GradientStop[]): string {
  return stops
    .map(
      (stop) =>
        `<stop offset="${stop.at}" stop-color="${stop.color}"${
          stop.alpha != null ? ` stop-opacity="${stop.alpha}"` : ""
        }/>`,
    )
    .join("");
}

function linearGradient(
  id: string,
  angle: number,
  stops: GradientStop[],
  w: number,
  h: number,
): string {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  const cx = w / 2;
  const cy = h / 2;
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${cx - dx * half}" y1="${
    cy - dy * half
  }" x2="${cx + dx * half}" y2="${cy + dy * half}">${stopsMarkup(stops)}</linearGradient>`;
}

function radialGradient(
  id: string,
  at: [number, number],
  radii: [number, number],
  stops: GradientStop[],
): string {
  return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(${at[0]} ${at[1]}) scale(${radii[0]} ${radii[1]})">${stopsMarkup(
    stops,
  )}</radialGradient>`;
}

function frame(x: number, y: number, w: number, h: number, color: string, width = 1): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
}

const svgShell = (w: number, h: number, defs: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;

/** The paper's 5px (3px on Terminal) accent edge along the top of every sheet. */
function accentEdge(
  accent: string,
  w: number,
  h: number,
  height = 5,
): { defs: string; body: string } {
  const id = "edge";
  return {
    defs: linearGradient(
      id,
      90,
      [
        { color: accent, at: 0 },
        { color: accent, at: 1, alpha: 0.28 },
      ],
      w,
      h,
    ),
    body: `<rect x="0" y="0" width="${w}" height="${height}" fill="url(#${id})"/>`,
  };
}

/** The themed paper wash, mirroring `.paper-skin.paper-theme-*` in styles.css. */
export function pageWashSvg(design: DocxPaperDesign, dims: PaperDims): string {
  const { width: w, height: h } = dims;
  const accent = `#${design.accent}`;
  const soft = `#${design.soft}`;
  const border = `#${design.border}`;
  const defs: string[] = [];
  const layers: string[] = [];

  switch (design.theme) {
    case "classic":
    case "newspaper":
      defs.push(
        linearGradient(
          "wash",
          180,
          [
            { color: soft, at: 0 },
            { color: WHITE, at: (design.theme === "classic" ? 175 : 210) / h },
            { color: WHITE, at: 1 },
          ],
          w,
          h,
        ),
      );
      layers.push(`<rect width="${w}" height="${h}" fill="url(#wash)"/>`);
      break;
    case "module":
      defs.push(
        radialGradient(
          "wash",
          [w, 0],
          [w, h * 0.62],
          [
            { color: accent, at: 0, alpha: 0.09 },
            { color: accent, at: 0.44, alpha: 0 },
            { color: accent, at: 1, alpha: 0 },
          ],
        ),
      );
      layers.push(`<rect width="${w}" height="${h}" fill="url(#wash)"/>`);
      break;
    case "field-notes":
      defs.push(
        `<pattern id="wash" width="1" height="32" patternUnits="userSpaceOnUse"><rect y="31" width="1" height="1" fill="${border}" fill-opacity="0.4"/></pattern>`,
      );
      layers.push(`<rect width="${w}" height="${h}" fill="url(#wash)"/>`);
      break;
    case "lab-report":
      defs.push(
        `<pattern id="wash-grid" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M18 0H0V18" fill="none" stroke="${border}" stroke-opacity="0.26" stroke-width="1"/></pattern>`,
        linearGradient(
          "wash-fade",
          180,
          [
            { color: soft, at: 0 },
            { color: WHITE, at: 230 / h },
            { color: WHITE, at: 1 },
          ],
          w,
          h,
        ),
      );
      layers.push(
        `<rect width="${w}" height="${h}" fill="url(#wash-grid)"/>`,
        `<rect width="${w}" height="${h}" fill="url(#wash-fade)"/>`,
      );
      break;
    case "workbook":
      defs.push(
        linearGradient(
          "wash",
          90,
          [
            { color: soft, at: 0 },
            { color: WHITE, at: 0.22 },
            { color: WHITE, at: 1 },
          ],
          w,
          h,
        ),
      );
      layers.push(`<rect width="${w}" height="${h}" fill="url(#wash)"/>`);
      break;
    case "blueprint":
      defs.push(
        `<pattern id="wash-grid" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 0H0V12" fill="none" stroke="${accent}" stroke-opacity="0.11" stroke-width="1"/></pattern>`,
        linearGradient(
          "wash-fade",
          180,
          [
            { color: soft, at: 0 },
            { color: WHITE, at: 240 / h },
            { color: WHITE, at: 1 },
          ],
          w,
          h,
        ),
      );
      layers.push(
        `<rect width="${w}" height="${h}" fill="url(#wash-grid)"/>`,
        `<rect width="${w}" height="${h}" fill="url(#wash-fade)"/>`,
      );
      break;
    case "manuscript":
      defs.push(
        radialGradient(
          "wash-a",
          [w * 0.06, h * 0.03],
          [w * 0.42, h * 0.28],
          [
            { color: accent, at: 0, alpha: 0.16 },
            { color: accent, at: 1, alpha: 0 },
          ],
        ),
        radialGradient(
          "wash-b",
          [w * 0.96, h * 0.97],
          [w * 0.42, h * 0.3],
          [
            { color: accent, at: 0, alpha: 0.1 },
            { color: accent, at: 1, alpha: 0 },
          ],
        ),
        linearGradient(
          "wash",
          180,
          [
            { color: "#fdf8ec", at: 0 },
            { color: "#f7eeda", at: 1 },
          ],
          w,
          h,
        ),
      );
      layers.push(
        `<rect width="${w}" height="${h}" fill="url(#wash)"/>`,
        `<rect width="${w}" height="${h}" fill="url(#wash-a)"/>`,
        `<rect width="${w}" height="${h}" fill="url(#wash-b)"/>`,
      );
      break;
    case "comic":
      defs.push(
        `<pattern id="wash-grid" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="1.1" fill="${accent}" fill-opacity="0.16"/></pattern>`,
        linearGradient(
          "wash-fade",
          180,
          [
            { color: soft, at: 0 },
            { color: "#fffdf5", at: 230 / h },
            { color: "#fffdf5", at: 1 },
          ],
          w,
          h,
        ),
      );
      layers.push(
        `<rect width="${w}" height="${h}" fill="url(#wash-grid)"/>`,
        `<rect width="${w}" height="${h}" fill="url(#wash-fade)"/>`,
      );
      break;
    case "botanical":
      defs.push(
        radialGradient(
          "wash-a",
          [0, 0],
          [w * 0.58, h * 0.36],
          [
            { color: accent, at: 0, alpha: 0.15 },
            { color: accent, at: 1, alpha: 0 },
          ],
        ),
        radialGradient(
          "wash-b",
          [w, h],
          [w * 0.5, h * 0.34],
          [
            { color: accent, at: 0, alpha: 0.09 },
            { color: accent, at: 1, alpha: 0 },
          ],
        ),
        linearGradient(
          "wash-fade",
          180,
          [
            { color: soft, at: 0 },
            { color: WHITE, at: 230 / h },
            { color: WHITE, at: 1 },
          ],
          w,
          h,
        ),
      );
      layers.push(
        `<rect width="${w}" height="${h}" fill="url(#wash-a)"/>`,
        `<rect width="${w}" height="${h}" fill="url(#wash-b)"/>`,
        `<rect width="${w}" height="${h}" fill="url(#wash-fade)"/>`,
      );
      break;
    case "terminal":
      defs.push(
        `<pattern id="wash" width="1" height="22" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="${accent}" fill-opacity="0.08"/></pattern>`,
      );
      layers.push(`<rect width="${w}" height="${h}" fill="url(#wash)"/>`);
      break;
    default:
      break;
  }

  const edge = accentEdge(accent, w, h, design.theme === "terminal" ? 3 : 5);
  return svgShell(w, h, `${defs.join("")}${edge.defs}`, `${layers.join("")}${edge.body}`);
}

/**
 * The themed cover art, mirroring `coverDesign()` + `CoverOrnament()`. The
 * cover copy stays real Word text on top; only the surface and ornament are
 * baked into the image, so the page keeps editable words and the exact art.
 */
export function coverArtSvg(design: DocxPaperDesign, dims: PaperDims): string {
  const { width: w, height: h } = dims;
  const accent = `#${design.accent}`;
  const line = `#${design.cover.line}`;
  const ink = `#${design.cover.ink}`;
  const inset = Math.round(48 * 0.55);
  const defs: string[] = [];
  const layers: string[] = [];

  const addLinear = (id: string, angle: number, stops: GradientStop[]) =>
    defs.push(linearGradient(id, angle, stops, w, h));
  const addRadial = (
    id: string,
    at: [number, number],
    radii: [number, number],
    stops: GradientStop[],
  ) => defs.push(radialGradient(id, at, radii, stops));

  switch (design.theme) {
    case "module":
      addLinear("bg", 150, [
        { color: accent, at: 0 },
        { color: mixHex(accent, "#0d131b", 0.54), at: 0.58 },
        { color: "#0b1119", at: 1 },
      ]);
      addRadial(
        "glow",
        [w * 0.92, 0],
        [w * 0.62, h * 0.5],
        [
          { color: mixHex(accent, WHITE, 0.3), at: 0, alpha: 0.85 },
          { color: mixHex(accent, WHITE, 0.3), at: 1, alpha: 0 },
        ],
      );
      layers.push(
        `<rect width="${w}" height="${h}" fill="url(#bg)"/>`,
        `<rect width="${w}" height="${h}" fill="url(#glow)"/>`,
      );
      break;
    case "field-notes":
      addLinear("bg", 165, [
        { color: mixHex("#2a2f26", accent, 0.18), at: 0 },
        { color: mixHex("#1d2119", accent, 0.13), at: 0.62 },
        { color: mixHex("#14170f", accent, 0.08), at: 1 },
      ]);
      addRadial(
        "glow",
        [0, 0],
        [w * 0.55, h * 0.36],
        [
          { color: mixHex(accent, "#20261d", 0.6), at: 0, alpha: 0.9 },
          { color: mixHex(accent, "#20261d", 0.6), at: 1, alpha: 0 },
        ],
      );
      layers.push(
        `<rect width="${w}" height="${h}" fill="url(#bg)"/>`,
        `<rect width="${w}" height="${h}" fill="url(#glow)"/>`,
      );
      break;
    case "blueprint":
      defs.push(
        `<pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" fill="none" stroke="rgba(255,255,255,0.09)" stroke-width="1"/></pattern>`,
      );
      addLinear("bg", 160, [
        { color: mixHex("#10405f", accent, 0.32), at: 0 },
        { color: mixHex("#0a2a41", accent, 0.24), at: 0.55 },
        { color: mixHex("#06192a", accent, 0.16), at: 1 },
      ]);
      layers.push(
        `<rect width="${w}" height="${h}" fill="url(#bg)"/>`,
        `<rect width="${w}" height="${h}" fill="url(#grid)"/>`,
      );
      break;
    case "terminal":
      defs.push(
        `<pattern id="scan" width="1" height="4" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="rgba(185,255,211,0.06)"/></pattern>`,
      );
      addLinear("bg", 180, [
        { color: mixHex("#0a1210", accent, 0.1), at: 0 },
        { color: mixHex("#050807", accent, 0.07), at: 1 },
      ]);
      addRadial(
        "glow",
        [w * 0.5, 0],
        [w * 0.7, h * 0.5],
        [
          { color: mixHex(accent, "#050807", 0.66), at: 0, alpha: 0.9 },
          { color: mixHex(accent, "#050807", 0.66), at: 1, alpha: 0 },
        ],
      );
      layers.push(
        `<rect width="${w}" height="${h}" fill="url(#bg)"/>`,
        `<rect width="${w}" height="${h}" fill="url(#glow)"/>`,
        `<rect width="${w}" height="${h}" fill="url(#scan)"/>`,
      );
      break;
    case "lab-report":
      addLinear("bg", 180, [
        { color: WHITE, at: 0 },
        { color: mixHex("#eef4f9", accent, 0.14), at: 1 },
      ]);
      layers.push(
        `<rect width="${w}" height="${h}" fill="url(#bg)"/>`,
        `<rect x="0" y="0" width="${w}" height="1" fill="rgba(27,36,48,0.07)"/>`,
        `<rect x="0" y="0" width="1" height="${h}" fill="rgba(27,36,48,0.07)"/>`,
      );
      break;
    case "workbook":
      addLinear("bg", 96, [
        { color: mixHex(accent, WHITE, 0.88), at: 0 },
        { color: "#fffdf6", at: 0.26 },
        { color: WHITE, at: 1 },
      ]);
      layers.push(`<rect width="${w}" height="${h}" fill="url(#bg)"/>`);
      break;
    case "manuscript":
      addLinear("bg", 160, [
        { color: mixHex("#fdf6e7", accent, 0.1), at: 0 },
        { color: mixHex("#f4e8cf", accent, 0.16), at: 1 },
      ]);
      addRadial(
        "glow",
        [w * 0.08, h * 0.04],
        [w * 0.4, h * 0.32],
        [
          { color: mixHex(accent, "#fdf6e7", 0.9), at: 0, alpha: 0.9 },
          { color: mixHex(accent, "#fdf6e7", 0.9), at: 1, alpha: 0 },
        ],
      );
      layers.push(
        `<rect width="${w}" height="${h}" fill="url(#bg)"/>`,
        `<rect width="${w}" height="${h}" fill="url(#glow)"/>`,
      );
      break;
    case "newspaper":
      addLinear("bg", 180, [
        { color: mixHex("#fbf8f1", accent, 0.06), at: 0 },
        { color: mixHex("#f3eee2", accent, 0.09), at: 1 },
      ]);
      layers.push(`<rect width="${w}" height="${h}" fill="url(#bg)"/>`);
      break;
    case "comic":
      addLinear("bg", 180, [
        { color: mixHex("#fffdf2", accent, 0.08), at: 0 },
        { color: mixHex("#fff7e4", accent, 0.12), at: 1 },
      ]);
      layers.push(`<rect width="${w}" height="${h}" fill="url(#bg)"/>`);
      break;
    case "botanical":
      addLinear("bg", 170, [
        { color: mixHex("#f7fbf4", accent, 0.08), at: 0 },
        { color: mixHex("#e9f2e4", accent, 0.12), at: 1 },
      ]);
      addRadial(
        "glow-a",
        [w, 0],
        [w * 0.36, h * 0.3],
        [
          { color: mixHex(accent, "#f2f8ef", 0.84), at: 0, alpha: 0.9 },
          { color: mixHex(accent, "#f2f8ef", 0.84), at: 1, alpha: 0 },
        ],
      );
      addRadial(
        "glow-b",
        [0, h],
        [w * 0.32, h * 0.28],
        [
          { color: mixHex(accent, "#eef6ea", 0.88), at: 0, alpha: 0.9 },
          { color: mixHex(accent, "#eef6ea", 0.88), at: 1, alpha: 0 },
        ],
      );
      layers.push(
        `<rect width="${w}" height="${h}" fill="url(#bg)"/>`,
        `<rect width="${w}" height="${h}" fill="url(#glow-a)"/>`,
        `<rect width="${w}" height="${h}" fill="url(#glow-b)"/>`,
      );
      break;
    case "classic":
    default:
      addLinear("bg", 158, [
        { color: accent, at: 0 },
        { color: mixHex(accent, "#0a1322", 0.6), at: 0.6 },
        { color: "#091120", at: 1 },
      ]);
      addRadial(
        "glow",
        [w * 0.9, 0],
        [w * 0.74, h * 0.55],
        [
          { color: mixHex(accent, WHITE, 0.55), at: 0, alpha: 0.85 },
          { color: mixHex(accent, WHITE, 0.55), at: 1, alpha: 0 },
        ],
      );
      layers.push(
        `<rect width="${w}" height="${h}" fill="url(#bg)"/>`,
        `<rect width="${w}" height="${h}" fill="url(#glow)"/>`,
      );
      break;
  }

  /* ---- ornament (same geometry as CoverOrnament) ------------------- */
  const ornament: string[] = [];

  switch (design.theme) {
    case "classic":
      ornament.push(
        frame(inset, inset, w - inset * 2, h - inset * 2, line),
        frame(
          inset + 7,
          inset + 7,
          w - (inset + 7) * 2,
          h - (inset + 7) * 2,
          "rgba(255,255,255,0.12)",
        ),
        `<rect x="${w / 2 - w * 0.09}" y="${inset + 34}" width="${w * 0.18}" height="1" fill="${line}"/>`,
      );
      break;
    case "module":
      ornament.push(
        `<rect x="0" y="${h * 0.38}" width="${w}" height="1.5" fill="${ink}" opacity="0.35"/>`,
        `<circle cx="${w + inset * 2 - w * 0.29}" cy="${h + inset * 3 - w * 0.29}" r="${w * 0.29}" fill="none" stroke="${line}" opacity="0.5"/>`,
        `<rect x="0" y="0" width="10" height="${h * 0.34}" fill="${accent}" opacity="0.9"/>`,
      );
      break;
    case "field-notes":
      ornament.push(
        `<rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}" rx="6" fill="none" stroke="${line}" stroke-width="1.5" stroke-dasharray="6 4"/>`,
        `<rect x="${inset - 18}" y="${inset - 6}" width="96" height="26" fill="rgba(246,241,226,0.28)" transform="rotate(-12 ${inset - 18} ${inset - 6})"/>`,
        `<rect x="${w - inset - 78}" y="${h - inset - 20}" width="96" height="26" fill="rgba(246,241,226,0.28)" transform="rotate(-12 ${w - inset - 78} ${h - inset - 20})"/>`,
        `<rect width="${w}" height="${h}" fill="url(#dots)" opacity="0.5"/>`,
      );
      defs.push(
        `<pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="${line}"/></pattern>`,
      );
      break;
    case "lab-report":
      ornament.push(
        frame(inset, inset, w - inset * 2, h - inset * 2, line),
        frame(
          inset + 7,
          inset + 7,
          w - (inset + 7) * 2,
          h - (inset + 7) * 2,
          "rgba(27,36,48,0.12)",
        ),
      );
      for (const corner of ["tl", "tr", "bl", "br"] as const) {
        const x = corner.endsWith("l") ? 16 : w - 16;
        const y = corner.startsWith("t") ? 16 : h - 16;
        const dirX = corner.endsWith("l") ? 1 : -1;
        const dirY = corner.startsWith("t") ? 1 : -1;
        ornament.push(
          `<rect x="${x}" y="${y}" width="${14 * dirX}" height="1" fill="${line}"/>`,
          `<rect x="${x}" y="${y}" width="1" height="${14 * dirY}" fill="${line}"/>`,
        );
      }
      ornament.push(
        `<text x="${inset}" y="${h - inset - 6}" font-family="Arial, Helvetica, sans-serif" font-size="9" letter-spacing="2.5" fill="${design.cover.muted}" text-transform="uppercase">SPECIMEN SHEET</text>`,
      );
      break;
    case "workbook":
      ornament.push(
        `<rect x="0" y="0" width="14" height="${h}" fill="${accent}" opacity="0.85"/>`,
        ...([0.24, 0.56, 0.88] as const).map(
          (top) =>
            `<circle cx="36.5" cy="${h * top + 6.5}" r="6.5" fill="#ffffff" stroke="${line}"/>`,
        ),
        `<rect width="${w}" height="${h}" fill="url(#ruled)" opacity="0.35"/>`,
      );
      defs.push(
        `<pattern id="ruled" width="1" height="34" patternUnits="userSpaceOnUse"><rect y="33" width="1" height="1" fill="${line}"/></pattern>`,
      );
      break;
    case "blueprint":
      ornament.push(
        frame(inset, inset, w - inset * 2, h - inset * 2, line),
        frame(
          inset + 7,
          inset + 7,
          w - (inset + 7) * 2,
          h - (inset + 7) * 2,
          "rgba(255,255,255,0.12)",
        ),
        `<rect x="${inset}" y="${h - inset - 26}" width="${w - inset * 2}" height="1" fill="${line}" stroke-dasharray="4 3"/>`,
        `<rect x="${w / 2}" y="${h - inset - 32}" width="1" height="12" fill="${line}"/>`,
      );
      break;
    case "manuscript":
      ornament.push(
        frame(inset, inset, w - inset * 2, h - inset * 2, line),
        frame(inset + 5, inset + 5, w - (inset + 5) * 2, h - (inset + 5) * 2, line),
      );
      for (const [x, y] of [
        [inset + 16, inset + 16],
        [w - inset - 16, inset + 16],
        [inset + 16, h - inset - 16],
        [w - inset - 16, h - inset - 16],
      ] as const) {
        ornament.push(
          `<rect x="${x - 3.5}" y="${y - 3.5}" width="7" height="7" fill="none" stroke="${line}" transform="rotate(45 ${x} ${y})"/>`,
        );
      }
      ornament.push(
        `<rect x="0" y="${h * 0.31}" width="${w}" height="1" fill="${line}" opacity="0.5"/>`,
      );
      break;
    case "newspaper":
      ornament.push(
        `<rect x="${inset}" y="${inset + 16}" width="${w - inset * 2}" height="3" fill="${line}"/>`,
        `<rect x="${inset}" y="${inset + 23}" width="${w - inset * 2}" height="1" fill="${line}"/>`,
        `<rect x="${w / 2}" y="${h * 0.38}" width="1" height="${h - h * 0.38 - inset}" fill="${line}" opacity="0.45"/>`,
        `<text x="${w - inset}" y="${inset + 44}" text-anchor="end" font-family="Georgia, serif" font-size="8.5" letter-spacing="2.6" fill="${design.cover.muted}">VOL. I</text>`,
      );
      break;
    case "comic":
      ornament.push(
        frame(16, 16, w - 32, h - 32, ink, 3),
        `<rect width="${w}" height="${h}" fill="url(#halftone)" opacity="0.4"/>`,
        `<polygon points="50,0 61,18 82,6 79,30 100,34 84,51 100,68 78,71 82,95 60,82 50,100 40,82 18,95 22,71 0,68 16,51 0,34 21,30 18,6 39,18" fill="${accent}" opacity="0.85" transform="translate(${w - 130} 44) scale(1.5 0.74)"/>`,
      );
      defs.push(
        `<pattern id="halftone" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="${line}"/></pattern>`,
      );
      break;
    case "botanical": {
      const size = w * 0.46;
      ornament.push(
        `<path d="M ${-inset} ${h + inset} L ${-inset} ${h + inset - size} A ${size} ${size} 0 0 1 ${-inset + size} ${h + inset} Z" fill="${mixHex(accent, WHITE, 0.82)}" opacity="0.5"/>`,
      );
      const sprig = w * 0.22;
      ornament.push(
        `<g transform="translate(${w - inset - sprig} ${inset}) scale(${sprig / 120})" fill="none" stroke="${line}" stroke-width="1.6" opacity="0.55">
          <path d="M60 112C60 70 60 40 60 8"/>
          <path d="M60 44c-14-2-24-12-26-26 14 2 24 12 26 26z" fill="${rgba(accent, 0.22)}"/>
          <path d="M60 62c14-2 24-12 26-26-14 2-24 12-26 26z" fill="${rgba(accent, 0.22)}"/>
          <path d="M60 84c-12-2-20-10-22-22 12 2 20 10 22 22z" fill="${rgba(accent, 0.22)}"/>
        </g>`,
      );
      break;
    }
    case "terminal":
      ornament.push(
        `<rect width="${w}" height="${h}" fill="url(#scan-cover)"/>`,
        frame(inset, inset, w - inset * 2, h - inset * 2, line),
        `<text x="${inset + 12}" y="${h - inset - 10}" font-family="Consolas, 'Courier New', monospace" font-size="10" letter-spacing="1.8" fill="${design.cover.muted}">~/knowly $ _</text>`,
      );
      defs.push(
        `<pattern id="scan-cover" width="1" height="3" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="rgba(201,255,223,0.05)"/></pattern>`,
      );
      break;
    default:
      break;
  }

  const edge = accentEdge(accent, w, h, design.theme === "terminal" ? 3 : 5);
  return svgShell(
    w,
    h,
    `${defs.join("")}${edge.defs}`,
    `${layers.join("")}${ornament.join("")}${edge.body}`,
  );
}

/* ------------------------------------------------------------------ *
 * Rasterising (browser only)
 * ------------------------------------------------------------------ */

async function svgToPng(
  svg: string,
  width: number,
  height: number,
  scale: number,
  background?: string,
): Promise<Uint8Array | null> {
  if (typeof document === "undefined" || typeof Image === "undefined") return null;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Paper art could not be rendered"));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) return null;
    if (background) {
      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return null;
    return new Uint8Array(await blob.arrayBuffer());
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Rasterise the selected design into PNG bytes for the .docx package. A missing
 * canvas (older browsers / very large sheets) returns no art rather than
 * failing the export: the document still carries every resolved colour.
 */
export async function buildDocxPaperArt(
  design: DocxPaperDesign,
  dims: PaperDims,
  options: { cover: boolean; wash: boolean },
): Promise<{ cover?: Uint8Array; wash?: Uint8Array }> {
  if (design.style === "friendly") return {};
  const art: { cover?: Uint8Array; wash?: Uint8Array } = {};
  if (options.wash) {
    const wash = await svgToPng(pageWashSvg(design, dims), dims.width, dims.height, 1.5, WHITE);
    if (wash) art.wash = wash;
  }
  if (options.cover) {
    const cover = await svgToPng(coverArtSvg(design, dims), dims.width, dims.height, 2);
    if (cover) art.cover = cover;
  }
  return art;
}
