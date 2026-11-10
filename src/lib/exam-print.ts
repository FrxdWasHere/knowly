import type { Difficulty, Question, QuestionType } from "./types";
import { shuffleArray } from "./answers";

export interface ExamOptions {
  title: string;
  subject: string;
  headerText?: string;
  footerText?: string;
  date: string;
  studentName: string;
  studentClass: string;
  instructions: string;
  showNameLines: boolean;
  showInstructions: boolean;
  showPoints: boolean;
  pointsPerQuestion: number;
  columns: 1 | 2;
  spacing: "compact" | "roomy";
  answerLines: number;
  includeAnswerKey: boolean;
  /** Visual treatment for the printable document. Missing on older saved papers. */
  theme?: ExamTheme;
  /** Colour palette layered over the theme. "theme" keeps the theme's own colours. */
  palette?: ExamPaletteId | "theme";
  /** "design" prints the full paper art; "friendly" drops ink-heavy fills. */
  printStyle?: "design" | "friendly";
  fontFamily: ExamFont;
  fontSize: "small" | "normal" | "large";
  headerAlign: "left" | "center";
  numberStyle: "dot" | "q" | "paren";
  optionCase: "upper" | "lower";
}

export type ExamFont =
  "default" | "classic" | "serif" | "sans" | "rounded" | "mono" | "handwritten";

export type ExamTheme =
  | "classic"
  | "module"
  | "field-notes"
  | "lab-report"
  | "workbook"
  | "blueprint"
  | "manuscript"
  | "newspaper"
  | "comic"
  | "botanical"
  | "terminal"
  | "minimalist"
  | "retro"
  | "neon"
  | "watercolor"
  | "leather"
  | "chalkboard"
  | "denim"
  | "marble"
  | "vintage-map"
  | "forest-green"
  | "sunset"
  | "ocean"
  | "desert"
  | "arctic"
  | "autumn"
  | "cherry-blossom"
  | "concrete"
  | "gold-leaf"
  | "indigo"
  | "coral"
  | "sage"
  | "charcoal"
  | "mint"
  | "burnt-sienna";

export const EXAM_THEMES: {
  id: ExamTheme;
  label: string;
  description: string;
  accent: string;
  soft: string;
  border: string;
}[] = [
  {
    id: "classic",
    label: "Classic exam",
    description: "Formal, clean black-and-white paper",
    accent: "#1f2937",
    soft: "#f3f4f6",
    border: "#d1d5db",
  },
  {
    id: "module",
    label: "Study sheet",
    description: "Knowly module cards, color accents and clear learning sections",
    accent: "#3b5bdb",
    soft: "#eef2ff",
    border: "#c7d2fe",
  },
  {
    id: "field-notes",
    label: "Field notes",
    description: "Warm natural paper with observation-book details",
    accent: "#35735b",
    soft: "#f1f6ed",
    border: "#c9d8c3",
  },
  {
    id: "lab-report",
    label: "Lab report",
    description: "Technical grid, instrument-style labels and data accents",
    accent: "#087e8b",
    soft: "#e8f5f6",
    border: "#b8dadd",
  },
  {
    id: "workbook",
    label: "Revision workbook",
    description: "Friendly lesson workbook with bold prompts and writing space",
    accent: "#b45309",
    soft: "#fff7ed",
    border: "#fed7aa",
  },
  {
    id: "blueprint",
    label: "Blueprint",
    description: "Drafting-table grid, measured rules and engineering stamps",
    accent: "#1d4e89",
    soft: "#eef4fb",
    border: "#b9d2ea",
  },
  {
    id: "manuscript",
    label: "Illuminated manuscript",
    description: "Parchment, gold rule and a drop-cap opening the exam",
    accent: "#7c4a1e",
    soft: "#f7efdd",
    border: "#e0cfae",
  },
  {
    id: "newspaper",
    label: "Front page",
    description: "Broadsheet headlines, double rules and column-set questions",
    accent: "#141414",
    soft: "#f5f3ec",
    border: "#c9c5b8",
  },
  {
    id: "comic",
    label: "Comic panel",
    description: "Ink outlines, halftone dots and punchy tilted captions",
    accent: "#d81e3f",
    soft: "#fff7d6",
    border: "#1f1f1f",
  },
  {
    id: "botanical",
    label: "Botanical study",
    description: "Soft herbarium wash with pressed-flower corners and dotted numerals",
    accent: "#4d7c5f",
    soft: "#f2f7ef",
    border: "#cbdcc7",
  },
  {
    id: "terminal",
    label: "Terminal",
    description: "Dark screen with a phosphor grid; prints as light ink-saving paper",
    accent: "#2fbf71",
    soft: "#0d1512",
    border: "#1f4a33",
  },
  {
    id: "minimalist",
    label: "Minimalist",
    description: "Clean sans-serif, generous margins, and subtle accents",
    accent: "#2d3748",
    soft: "#f7fafc",
    border: "#e2e8f0",
  },
  {
    id: "retro",
    label: "Retro 70s",
    description: "Warm earth tones with a nostalgic serif aesthetic",
    accent: "#9a6d4a",
    soft: "#fef3e2",
    border: "#e8d7c3",
  },
  {
    id: "neon",
    label: "Neon glow",
    description: "Bold electric colors with high contrast black backgrounds",
    accent: "#ff006e",
    soft: "#0a0e27",
    border: "#3a0a1f",
  },
  {
    id: "watercolor",
    label: "Watercolor",
    description: "Soft, flowing washes with subtle color blending",
    accent: "#6366f1",
    soft: "#f0f4ff",
    border: "#d4d8f5",
  },
  {
    id: "leather",
    label: "Leather bound",
    description: "Rich brown with embossed details and aged paper feel",
    accent: "#75472d",
    soft: "#ede4d3",
    border: "#d4c4ad",
  },
  {
    id: "chalkboard",
    label: "Chalkboard",
    description: "Dark slate with chalk-white text and colorful accents",
    accent: "#a8e6cf",
    soft: "#2d3e50",
    border: "#475569",
  },
  {
    id: "denim",
    label: "Denim",
    description: "Classic blue denim texture with stitched details",
    accent: "#003d7a",
    soft: "#ecf0f9",
    border: "#bfd3ea",
  },
  {
    id: "marble",
    label: "Marble",
    description: "Elegant veined marble with sophisticated monochrome styling",
    accent: "#2c2c2c",
    soft: "#f5f5f5",
    border: "#d9d9d9",
  },
  {
    id: "vintage-map",
    label: "Vintage map",
    description: "Antique cartography style with topographic lines",
    accent: "#8b6914",
    soft: "#f4ead5",
    border: "#d4c5a0",
  },
  {
    id: "forest-green",
    label: "Forest green",
    description: "Deep green with natural wood grain and leaf accents",
    accent: "#1a4d2e",
    soft: "#e8f3f0",
    border: "#b8d7cc",
  },
  {
    id: "sunset",
    label: "Sunset",
    description: "Warm gradient from orange to deep purple",
    accent: "#d97706",
    soft: "#fef2e8",
    border: "#f5d4a8",
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Cool blues with wave patterns and maritime details",
    accent: "#0891b2",
    soft: "#ecf8fa",
    border: "#b8e5eb",
  },
  {
    id: "desert",
    label: "Desert sand",
    description: "Sandy beige with terracotta accents and dry lines",
    accent: "#c67c4e",
    soft: "#fef5f0",
    border: "#f0d9cd",
  },
  {
    id: "arctic",
    label: "Arctic ice",
    description: "Crisp white with cool blue accents and clean geometry",
    accent: "#164e63",
    soft: "#f0f9fc",
    border: "#bae6fd",
  },
  {
    id: "autumn",
    label: "Autumn leaves",
    description: "Rich reds and oranges with organic patterns",
    accent: "#a64b2a",
    soft: "#fff0e6",
    border: "#ead4ba",
  },
  {
    id: "cherry-blossom",
    label: "Cherry blossom",
    description: "Soft pinks with delicate floral motifs",
    accent: "#e11d48",
    soft: "#ffe4e6",
    border: "#f5c6cc",
  },
  {
    id: "concrete",
    label: "Concrete",
    description: "Industrial grey with bold typography and grid lines",
    accent: "#4b5563",
    soft: "#f3f4f6",
    border: "#d1d5db",
  },
  {
    id: "gold-leaf",
    label: "Gold leaf",
    description: "Luxury design with gold accents and rich blacks",
    accent: "#b8860b",
    soft: "#fffef0",
    border: "#e8d7a3",
  },
  {
    id: "indigo",
    label: "Indigo",
    description: "Deep indigo with gold stitching and traditional patterns",
    accent: "#3730a3",
    soft: "#eef2ff",
    border: "#d3cffa",
  },
  {
    id: "coral",
    label: "Coral reef",
    description: "Vibrant coral with ocean blues and sand tones",
    accent: "#fb6f6f",
    soft: "#ffe8e6",
    border: "#f5c8c3",
  },
  {
    id: "sage",
    label: "Sage green",
    description: "Muted green with soft earth tone accents",
    accent: "#6b8e71",
    soft: "#f1f5f3",
    border: "#d4e4da",
  },
  {
    id: "charcoal",
    label: "Charcoal",
    description: "Dark charcoal with metallic silver accents",
    accent: "#1f2937",
    soft: "#f9fafb",
    border: "#e5e7eb",
  },
  {
    id: "mint",
    label: "Mint fresh",
    description: "Bright mint with crisp white and modern sans-serif",
    accent: "#14b8a6",
    soft: "#f0fdfa",
    border: "#99ede0",
  },
  {
    id: "burnt-sienna",
    label: "Burnt sienna",
    description: "Warm reddish-brown with cream and rust accents",
    accent: "#a0522d",
    soft: "#fdf6f1",
    border: "#efd7ca",
  },
];

/**
 * Colour palettes layered over a theme: they swap the accent ink, the paper
 * wash and the rule colour, so the same layout can be printed 15 ways.
 */
export type ExamPaletteId =
  | "oxford"
  | "burgundy"
  | "forest"
  | "graphite"
  | "mustard"
  | "teal"
  | "plum"
  | "terracotta"
  | "rose"
  | "copper"
  | "ink"
  | "jade"
  | "sky"
  | "iris"
  | "olive";

export const EXAM_PALETTES: {
  id: ExamPaletteId;
  label: string;
  accent: string;
  soft: string;
  border: string;
}[] = [
  { id: "oxford", label: "Oxford blue", accent: "#1e3a8a", soft: "#eef3ff", border: "#c3d3f2" },
  { id: "burgundy", label: "Burgundy", accent: "#8c1d2f", soft: "#fdf1f3", border: "#eec4cb" },
  { id: "forest", label: "Forest", accent: "#256b4d", soft: "#eef7f1", border: "#c2e0d1" },
  { id: "graphite", label: "Graphite", accent: "#334155", soft: "#f1f5f9", border: "#cbd5e1" },
  { id: "mustard", label: "Mustard", accent: "#a9760a", soft: "#fffaeb", border: "#efdcaa" },
  { id: "teal", label: "Deep teal", accent: "#0f766e", soft: "#eefaf7", border: "#b6e2d8" },
  { id: "plum", label: "Plum", accent: "#6b21a8", soft: "#f8f2ff", border: "#dcc7f1" },
  { id: "terracotta", label: "Terracotta", accent: "#b8460f", soft: "#fff3ec", border: "#f5cdb8" },
  { id: "rose", label: "Rose", accent: "#be185d", soft: "#fff1f5", border: "#f6c8da" },
  { id: "copper", label: "Copper", accent: "#7c4a22", soft: "#fbf4ec", border: "#e4cbb5" },
  { id: "ink", label: "Printer's ink", accent: "#111827", soft: "#f4f4f5", border: "#cdced3" },
  { id: "jade", label: "Jade", accent: "#047857", soft: "#ecfdf5", border: "#a5eed0" },
  { id: "sky", label: "Coastal sky", accent: "#0369a1", soft: "#eff8ff", border: "#b6e2fb" },
  { id: "iris", label: "Iris", accent: "#4f46e5", soft: "#f2f2ff", border: "#cdcbf7" },
  { id: "olive", label: "Olive grove", accent: "#5f6b21", soft: "#f8f9ec", border: "#d8ddb4" },
];

/**
 * Which palettes each theme can wear without fighting its own ink: a dark
 * screen rejects printer's black, a broadsheet stays ink-and-newsprint, and
 * the herbarium keeps to greens and pressed-flower tones.
 */
export const THEME_PALETTES: Record<ExamTheme, ExamPaletteId[]> = {
  classic: [
    "ink",
    "graphite",
    "oxford",
    "burgundy",
    "forest",
    "teal",
    "copper",
    "plum",
    "rose",
    "mustard",
    "olive",
    "sky",
  ],
  module: [
    "oxford",
    "sky",
    "teal",
    "jade",
    "iris",
    "plum",
    "rose",
    "terracotta",
    "mustard",
    "forest",
    "burgundy",
  ],
  "field-notes": [
    "olive",
    "copper",
    "forest",
    "mustard",
    "terracotta",
    "teal",
    "burgundy",
    "plum",
    "rose",
    "graphite",
  ],
  "lab-report": ["sky", "teal", "graphite", "oxford", "jade", "iris", "forest", "ink", "plum"],
  workbook: [
    "mustard",
    "terracotta",
    "rose",
    "jade",
    "sky",
    "iris",
    "plum",
    "teal",
    "oxford",
    "forest",
  ],
  blueprint: ["sky", "oxford", "teal", "graphite", "jade", "iris", "ink", "forest"],
  manuscript: [
    "copper",
    "burgundy",
    "forest",
    "olive",
    "mustard",
    "plum",
    "terracotta",
    "ink",
    "rose",
  ],
  newspaper: ["ink", "graphite", "oxford", "burgundy", "forest", "copper", "plum", "teal"],
  comic: [
    "terracotta",
    "rose",
    "plum",
    "iris",
    "mustard",
    "sky",
    "jade",
    "oxford",
    "teal",
    "burgundy",
  ],
  botanical: ["forest", "olive", "jade", "teal", "rose", "copper", "plum", "mustard"],
  terminal: [
    "mustard",
    "terracotta",
    "rose",
    "teal",
    "sky",
    "iris",
    "burgundy",
    "plum",
    "forest",
    "copper",
  ],
  minimalist: [
    "graphite",
    "ink",
    "oxford",
    "forest",
    "teal",
    "sky",
    "iris",
    "plum",
    "rose",
  ],
  retro: [
    "copper",
    "terracotta",
    "mustard",
    "olive",
    "burgundy",
    "rose",
    "forest",
    "graphite",
  ],
  neon: [
    "rose",
    "iris",
    "plum",
    "sky",
    "teal",
    "jade",
    "terracotta",
    "mustard",
  ],
  watercolor: [
    "iris",
    "sky",
    "plum",
    "teal",
    "rose",
    "jade",
    "oxford",
    "forest",
  ],
  leather: [
    "copper",
    "burgundy",
    "terracotta",
    "olive",
    "forest",
    "graphite",
    "ink",
    "mustard",
  ],
  chalkboard: [
    "jade",
    "terracotta",
    "rose",
    "sky",
    "iris",
    "mustard",
    "plum",
    "teal",
  ],
  denim: [
    "oxford",
    "sky",
    "iris",
    "teal",
    "graphite",
    "rose",
    "burgundy",
    "forest",
  ],
  marble: [
    "graphite",
    "ink",
    "oxford",
    "burgundy",
    "forest",
    "plum",
    "copper",
    "rose",
  ],
  "vintage-map": [
    "copper",
    "olive",
    "forest",
    "mustard",
    "burgundy",
    "terracotta",
    "graphite",
    "ink",
  ],
  "forest-green": [
    "forest",
    "jade",
    "olive",
    "teal",
    "sky",
    "copper",
    "burgundy",
    "plum",
  ],
  sunset: [
    "terracotta",
    "mustard",
    "rose",
    "plum",
    "iris",
    "copper",
    "burgundy",
  ],
  ocean: [
    "sky",
    "teal",
    "jade",
    "oxford",
    "iris",
    "forest",
    "graphite",
    "plum",
  ],
  desert: [
    "terracotta",
    "copper",
    "mustard",
    "rose",
    "olive",
    "burgundy",
  ],
  arctic: [
    "sky",
    "oxford",
    "iris",
    "teal",
    "jade",
    "graphite",
    "ink",
  ],
  autumn: [
    "terracotta",
    "burgundy",
    "copper",
    "mustard",
    "olive",
    "forest",
    "graphite",
  ],
  "cherry-blossom": [
    "rose",
    "plum",
    "iris",
    "terracotta",
    "jade",
    "sky",
    "teal",
  ],
  concrete: [
    "graphite",
    "ink",
    "oxford",
    "forest",
    "plum",
    "copper",
    "burgundy",
  ],
  "gold-leaf": [
    "mustard",
    "copper",
    "terracotta",
    "burgundy",
    "olive",
    "graphite",
    "ink",
  ],
  indigo: [
    "iris",
    "oxford",
    "plum",
    "sky",
    "teal",
    "jade",
    "copper",
  ],
  coral: [
    "rose",
    "terracotta",
    "sky",
    "teal",
    "mustard",
    "iris",
    "plum",
  ],
  sage: [
    "jade",
    "forest",
    "olive",
    "teal",
    "copper",
    "burgundy",
    "plum",
    "graphite",
  ],
  charcoal: [
    "graphite",
    "ink",
    "oxford",
    "burgundy",
    "forest",
    "plum",
    "rose",
  ],
  mint: [
    "jade",
    "teal",
    "sky",
    "iris",
    "oxford",
    "rose",
    "plum",
  ],
  "burnt-sienna": [
    "terracotta",
    "burgundy",
    "copper",
    "mustard",
    "olive",
    "forest",
    "plum",
  ],
};

/** Fonts that ship with the computer — no downloads, works fully offline. */
/** Resolve a theme + palette pair; older saved options may miss either one. */
export function resolveThemePalette(themeId?: ExamTheme, paletteId?: ExamPaletteId | "theme") {
  const theme = EXAM_THEMES.find((item) => item.id === themeId) ?? EXAM_THEMES[0]!;
  const palette = EXAM_PALETTES.find(
    (item) => item.id === paletteId && THEME_PALETTES[theme.id].includes(item.id),
  );
  return { theme, palette };
}

/**
 * CSS custom properties for a themed paper. Without a palette the document
 * keeps `fallbackAccent` (a course or module colour) so packs stay on-brand.
 */
export function paperThemeVars(
  themeId?: ExamTheme,
  paletteId?: ExamPaletteId | "theme",
  fallbackAccent?: string,
) {
  const { theme, palette } = resolveThemePalette(themeId, paletteId);
  const accent = palette?.accent ?? fallbackAccent ?? theme.accent;
  const soft = palette?.soft ?? `color-mix(in srgb, ${accent} 8%, #ffffff)`;
  const border = palette?.border ?? `color-mix(in srgb, ${accent} 26%, #ffffff)`;
  return { theme, palette, accent, soft, border };
}

/** Fonts that ship with the computer — no downloads, works fully offline. */
export const EXAM_FONTS: { id: ExamFont; label: string; stack: string }[] = [
  { id: "default", label: "Normal", stack: "var(--font-sans, inherit)" },
  { id: "classic", label: "Classic", stack: '"Times New Roman", Times, serif' },
  { id: "serif", label: "Book serif", stack: 'Georgia, Cambria, "Palatino Linotype", serif' },
  { id: "sans", label: "Clean sans", stack: 'Arial, Helvetica, "Segoe UI", system-ui, sans-serif' },
  { id: "rounded", label: "Friendly", stack: '"Trebuchet MS", Verdana, "Segoe UI", sans-serif' },
  { id: "mono", label: "Typewriter", stack: '"Courier New", Courier, ui-monospace, monospace' },
  {
    id: "handwritten",
    label: "Handwritten",
    stack: '"Comic Sans MS", "Chalkboard SE", "Bradley Hand", cursive',
  },
];

/** Per-question edits made directly on the paper. */
export interface QuestionEdit {
  question?: string;
  options?: Record<number, string>;
  removed?: boolean;
}

export const DEFAULT_INSTRUCTIONS =
  "Answer all questions. Write clearly in the space provided. No notes or devices allowed unless stated otherwise.";

export const ALL_TYPES: QuestionType[] = [
  "flashcard",
  "multiple-choice",
  "true-false",
  "fill-blank",
  "short-answer",
  "ordering",
  "matching",
  "word-bank",
];

export const ALL_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export function defaultExamOptions(title = "Practice Exam", subject = ""): ExamOptions {
  return {
    title,
    subject,
    headerText: "KNOWLY · LEARNING PAPER",
    footerText: "Show your thinking · Check your work",
    date: "",
    studentName: "",
    studentClass: "",
    instructions: DEFAULT_INSTRUCTIONS,
    showNameLines: true,
    showInstructions: true,
    showPoints: true,
    pointsPerQuestion: 1,
    columns: 1,
    spacing: "roomy",
    answerLines: 2,
    includeAnswerKey: true,
    theme: "classic",
    printStyle: "design",
    fontFamily: "default",
    fontSize: "normal",
    headerAlign: "left",
    numberStyle: "dot",
    optionCase: "upper",
  };
}

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export interface SelectionFilters {
  types: QuestionType[];
  difficulties: Difficulty[];
  count: number;
  shuffle: boolean;
}

/** Filters a question pool by type/difficulty, optionally shuffles, then trims to `count`. */
export function selectQuestions(pool: Question[], filters: SelectionFilters): Question[] {
  const filtered = pool.filter(
    (q) => filters.types.includes(q.type) && filters.difficulties.includes(q.difficulty),
  );
  const ordered = filters.shuffle ? shuffleArray(filtered) : filtered;
  return ordered.slice(0, Math.max(1, filters.count));
}

/** Human-readable answer for the answer key. */
export function printableAnswer(q: Question): string {
  if (q.type === "ordering" && q.items?.length) {
    return q.items.map((item, i) => `${i + 1}. ${item}`).join("  ");
  }
  if (q.type === "matching" && q.pairs?.length) {
    return q.pairs.map((p) => `${p.left} → ${p.right}`).join("; ");
  }
  if (q.type === "word-bank" && q.blanks?.length) {
    return q.blanks.join(", ");
  }
  return q.answer;
}
