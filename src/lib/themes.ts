import { createId } from "./id";

export interface ThemeColors {
  /** page background */
  background: string;
  /** panel / card background */
  surface: string;
  /** raised panel background */
  surface2: string;
  /** main text colour */
  foreground: string;
  /** primary / accent colour */
  primary: string;
  /** secondary accent colour */
  accent: string;
}

export interface ColorTheme {
  id: string;
  label: string;
  mode: "dark" | "light";
  blurb: string;
  colors: ThemeColors;
}

/** Preset palettes. "default" keeps the built-in Ocean Deep stylesheet. */
export const COLOR_THEMES: ColorTheme[] = [
  {
    id: "ocean",
    label: "Ocean Deep",
    mode: "dark",
    blurb: "The Knowly original — deep navy and arc blue.",
    colors: {
      background: "#08111f",
      surface: "#122235",
      surface2: "#1a2f47",
      foreground: "#eaf4ff",
      primary: "#5aa9f8",
      accent: "#49c2e8",
    },
  },
  {
    id: "midnight",
    label: "Midnight Ink",
    mode: "dark",
    blurb: "Near-black with violet highlights.",
    colors: {
      background: "#0b0b12",
      surface: "#15151f",
      surface2: "#1f1f2e",
      foreground: "#ececf5",
      primary: "#8b7cff",
      accent: "#b98cff",
    },
  },
  {
    id: "forest",
    label: "Forest Night",
    mode: "dark",
    blurb: "Mossy dark green with fresh mint.",
    colors: {
      background: "#0c1712",
      surface: "#12241c",
      surface2: "#1b3328",
      foreground: "#e6f5ec",
      primary: "#43c98a",
      accent: "#7ddba7",
    },
  },
  {
    id: "ember",
    label: "Ember",
    mode: "dark",
    blurb: "Charcoal with warm orange embers.",
    colors: {
      background: "#141010",
      surface: "#1e1817",
      surface2: "#2b2220",
      foreground: "#f6eae5",
      primary: "#ff8a4c",
      accent: "#ffb066",
    },
  },
  {
    id: "rose",
    label: "Rose Noir",
    mode: "dark",
    blurb: "Plum shadows with a rose glow.",
    colors: {
      background: "#150e14",
      surface: "#1f1520",
      surface2: "#2c1e2e",
      foreground: "#f7e9f3",
      primary: "#ff6fa5",
      accent: "#ff9ec4",
    },
  },
  {
    id: "mono",
    label: "Graphite",
    mode: "dark",
    blurb: "Pure greyscale, zero distraction.",
    colors: {
      background: "#101010",
      surface: "#181818",
      surface2: "#242424",
      foreground: "#f0f0f0",
      primary: "#d4d4d4",
      accent: "#9a9a9a",
    },
  },
  {
    id: "terminal",
    label: "Terminal",
    mode: "dark",
    blurb: "Black screen, phosphor green.",
    colors: {
      background: "#05080a",
      surface: "#0b1114",
      surface2: "#121b1f",
      foreground: "#d6ffe6",
      primary: "#3ef08a",
      accent: "#7cf5c0",
    },
  },
  {
    id: "paper",
    label: "Paper",
    mode: "light",
    blurb: "Clean white with classic blue.",
    colors: {
      background: "#f7f9fc",
      surface: "#ffffff",
      surface2: "#eef2f8",
      foreground: "#141c26",
      primary: "#2563eb",
      accent: "#0ea5e9",
    },
  },
  {
    id: "sepia",
    label: "Sepia",
    mode: "light",
    blurb: "Warm paper, easy on tired eyes.",
    colors: {
      background: "#f6efe3",
      surface: "#fffaf1",
      surface2: "#efe4d2",
      foreground: "#2e2318",
      primary: "#a4632a",
      accent: "#c98a4b",
    },
  },
  {
    id: "mint",
    label: "Mint Light",
    mode: "light",
    blurb: "Soft green daylight palette.",
    colors: {
      background: "#f2faf5",
      surface: "#ffffff",
      surface2: "#e4f3ea",
      foreground: "#122019",
      primary: "#0f9b6c",
      accent: "#3cc48f",
    },
  },
  {
    id: "lavender",
    label: "Lavender",
    mode: "light",
    blurb: "Pale lilac with a purple accent.",
    colors: {
      background: "#f7f5fd",
      surface: "#ffffff",
      surface2: "#ece7fa",
      foreground: "#1d1730",
      primary: "#6d4aff",
      accent: "#9a7bff",
    },
  },
  {
    id: "high-contrast",
    label: "High Contrast",
    mode: "dark",
    blurb: "Maximum separation for low-light rooms.",
    colors: {
      background: "#000000",
      surface: "#0d0d0d",
      surface2: "#1a1a1a",
      foreground: "#ffffff",
      primary: "#ffd400",
      accent: "#00e5ff",
    },
  },
  {
    id: "nord",
    label: "Nord Frost",
    mode: "dark",
    blurb: "Cool slate blues with icy frost.",
    colors: {
      background: "#2e3440",
      surface: "#3b4252",
      surface2: "#434c5e",
      foreground: "#eceff4",
      primary: "#88c0d0",
      accent: "#81a1c1",
    },
  },
  {
    id: "dracula",
    label: "Dracula",
    mode: "dark",
    blurb: "Purple dusk with a pink bite.",
    colors: {
      background: "#282a36",
      surface: "#343746",
      surface2: "#44475a",
      foreground: "#f8f8f2",
      primary: "#bd93f9",
      accent: "#ff79c6",
    },
  },
  {
    id: "solarized",
    label: "Solarized Dusk",
    mode: "dark",
    blurb: "Teal-toned classic with amber.",
    colors: {
      background: "#002b36",
      surface: "#073642",
      surface2: "#0d4a58",
      foreground: "#eee8d5",
      primary: "#b58900",
      accent: "#2aa198",
    },
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk",
    mode: "dark",
    blurb: "Neon magenta over electric cyan.",
    colors: {
      background: "#0a0118",
      surface: "#170a2b",
      surface2: "#24103f",
      foreground: "#f6e9ff",
      primary: "#ff2fd0",
      accent: "#26f7fd",
    },
  },
  {
    id: "blueprint",
    label: "Blueprint",
    mode: "dark",
    blurb: "Drafting-table blue and chalk white.",
    colors: {
      background: "#0a2540",
      surface: "#0f3355",
      surface2: "#154169",
      foreground: "#e8f1ff",
      primary: "#7fd3ff",
      accent: "#ffffff",
    },
  },
  {
    id: "coffee",
    label: "Coffee House",
    mode: "dark",
    blurb: "Roasted browns with cream.",
    colors: {
      background: "#1a1310",
      surface: "#251b16",
      surface2: "#33251d",
      foreground: "#f2e3d3",
      primary: "#c98f5b",
      accent: "#e0b98c",
    },
  },
  {
    id: "grape",
    label: "Grape Soda",
    mode: "dark",
    blurb: "Fizzy purple with lime pop.",
    colors: {
      background: "#1b0f2b",
      surface: "#26163c",
      surface2: "#341f52",
      foreground: "#f1e8ff",
      primary: "#a855f7",
      accent: "#a3e635",
    },
  },
  {
    id: "abyss",
    label: "Deep Abyss",
    mode: "dark",
    blurb: "Sunken teal with bioluminescence.",
    colors: {
      background: "#04161a",
      surface: "#082227",
      surface2: "#0d3138",
      foreground: "#dcf5f2",
      primary: "#14b8a6",
      accent: "#67e8f9",
    },
  },
  {
    id: "crimson",
    label: "Crimson Noir",
    mode: "dark",
    blurb: "Black velvet with deep red.",
    colors: {
      background: "#0f0709",
      surface: "#1a0d10",
      surface2: "#2a1418",
      foreground: "#f7e7e9",
      primary: "#e11d48",
      accent: "#fb7185",
    },
  },
  {
    id: "vapor",
    label: "Vaporwave",
    mode: "dark",
    blurb: "Sunset gradient nostalgia.",
    colors: {
      background: "#1a1033",
      surface: "#241548",
      surface2: "#341d63",
      foreground: "#fdeaff",
      primary: "#ff6ec7",
      accent: "#7af5ff",
    },
  },
  {
    id: "sakura",
    label: "Sakura",
    mode: "light",
    blurb: "Blossom pink on soft white.",
    colors: {
      background: "#fdf4f6",
      surface: "#ffffff",
      surface2: "#fbe4ea",
      foreground: "#3a1f2b",
      primary: "#e35d8a",
      accent: "#f0a0bb",
    },
  },
  {
    id: "arctic",
    label: "Arctic",
    mode: "light",
    blurb: "Pale ice with glacier blue.",
    colors: {
      background: "#f1f6fb",
      surface: "#ffffff",
      surface2: "#e0ebf6",
      foreground: "#13232f",
      primary: "#0b7ea8",
      accent: "#56b4d3",
    },
  },
  {
    id: "honey",
    label: "Honey",
    mode: "light",
    blurb: "Golden warmth for daytime study.",
    colors: {
      background: "#fdf7e7",
      surface: "#fffdf7",
      surface2: "#f6e9c8",
      foreground: "#33280f",
      primary: "#c9901a",
      accent: "#e8b44a",
    },
  },
  {
    id: "matcha",
    label: "Matcha",
    mode: "light",
    blurb: "Earthy green tea tones.",
    colors: {
      background: "#f3f6ec",
      surface: "#ffffff",
      surface2: "#e5edd6",
      foreground: "#20281a",
      primary: "#5b8c2a",
      accent: "#8bbf4d",
    },
  },
  {
    id: "newsprint",
    label: "Newsprint",
    mode: "light",
    blurb: "Grey paper, black ink, red rule.",
    colors: {
      background: "#f2f2ef",
      surface: "#fbfbf9",
      surface2: "#e5e5e0",
      foreground: "#1b1b1b",
      primary: "#c0392b",
      accent: "#5a5a5a",
    },
  },
  {
    id: "tangerine",
    label: "Tangerine",
    mode: "light",
    blurb: "Bright citrus on cream.",
    colors: {
      background: "#fff6ef",
      surface: "#ffffff",
      surface2: "#ffe6d4",
      foreground: "#2f1c10",
      primary: "#f06a20",
      accent: "#ff9d5c",
    },
  },
];

export interface UserTheme {
  id: string;
  label: string;
  mode: "dark" | "light";
  colors: ThemeColors;
}

export function newUserThemeId() {
  return createId("user");
}

export const DEFAULT_CUSTOM_THEME: ThemeColors = {
  background: "#08111f",
  surface: "#122235",
  surface2: "#1a2f47",
  foreground: "#eaf4ff",
  primary: "#5aa9f8",
  accent: "#49c2e8",
};

export function getColorTheme(id: string): ColorTheme | undefined {
  return COLOR_THEMES.find((t) => t.id === id);
}

export function isValidHex(value: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

export function normalizeHex(value: string) {
  let v = value.trim();
  if (!v.startsWith("#")) v = `#${v}`;
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  return v.toLowerCase();
}

/** Relative luminance 0..1 of a hex colour. */
export function luminance(hex: string) {
  const h = normalizeHex(hex);
  if (!isValidHex(h)) return 0;
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = channel(parseInt(h.slice(1, 3), 16));
  const g = channel(parseInt(h.slice(3, 5), 16));
  const b = channel(parseInt(h.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function readableOn(hex: string) {
  return luminance(hex) > 0.5 ? "#0b0b0b" : "#ffffff";
}

/** Derive the full CSS variable map applied to <html> for a palette. */
export function themeCssVars(c: ThemeColors): Record<string, string> {
  const mix = (a: string, pct: number, b: string) => `color-mix(in oklab, ${a} ${pct}%, ${b})`;
  const onPrimary = readableOn(c.primary);
  const onAccent = readableOn(c.accent);
  return {
    "--background": c.background,
    "--foreground": c.foreground,
    "--surface": c.surface,
    "--surface-2": c.surface2,
    "--card": c.surface,
    "--card-foreground": c.foreground,
    "--popover": c.surface,
    "--popover-foreground": c.foreground,
    "--primary": c.primary,
    "--primary-foreground": onPrimary,
    "--primary-glow": mix(c.primary, 70, c.accent),
    "--secondary": c.surface2,
    "--secondary-foreground": c.foreground,
    "--muted": c.surface2,
    "--muted-foreground": mix(c.foreground, 66, c.background),
    "--accent": c.accent,
    "--accent-foreground": onAccent,
    "--border": mix(c.foreground, 16, "transparent"),
    "--input": mix(c.foreground, 22, "transparent"),
    "--ring": c.primary,
    "--chart-1": c.primary,
    "--chart-2": c.accent,
    "--chart-3": mix(c.primary, 55, c.foreground),
    "--chart-4": mix(c.accent, 55, c.background),
    "--chart-5": mix(c.primary, 50, c.accent),
    "--sidebar": mix(c.background, 82, c.surface),
    "--sidebar-foreground": c.foreground,
    "--sidebar-primary": c.primary,
    "--sidebar-primary-foreground": onPrimary,
    "--sidebar-accent": c.surface2,
    "--sidebar-accent-foreground": c.foreground,
    "--sidebar-border": mix(c.foreground, 12, "transparent"),
    // Status colours keep their meaning (green / red / amber) but are tinted
    // toward the theme so they sit naturally in every palette.
    "--success": mix("#2fb872", 72, c.accent),
    "--success-foreground": readableOn(c.accent),
    "--destructive": mix("#e5484d", 78, c.primary),
    "--destructive-foreground": "#ffffff",
    "--warning": mix("#f0a020", 78, c.primary),
    "--warning-foreground": "#1a1204",
    "--shadow-panel": `0 8px 22px -16px ${mix(c.foreground, 20, "transparent")}`,
    "--deck-1": c.primary,
    "--deck-2": c.accent,
    "--deck-3": mix(c.primary, 55, c.accent),
    "--deck-4": mix(c.primary, 60, c.foreground),
    "--deck-5": mix(c.accent, 60, c.foreground),
    "--deck-6": mix(c.primary, 65, c.background),
  };
}

export const THEME_VAR_NAMES = Object.keys(themeCssVars(DEFAULT_CUSTOM_THEME));

/** Replace any invalid hex entry with the default, so CSS never receives garbage. */
export function sanitizePalette(c: Partial<ThemeColors> | undefined): ThemeColors {
  const out = { ...DEFAULT_CUSTOM_THEME };
  for (const key of Object.keys(out) as (keyof ThemeColors)[]) {
    const v = c?.[key];
    if (v && isValidHex(v)) out[key] = normalizeHex(v);
  }
  return out;
}
