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
      background: "#0c1723",
      surface: "#132234",
      surface2: "#1b2f45",
      foreground: "#eaf2fb",
      primary: "#4da3ff",
      accent: "#38bdf8",
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
];

export const DEFAULT_CUSTOM_THEME: ThemeColors = {
  background: "#0c1723",
  surface: "#132234",
  surface2: "#1b2f45",
  foreground: "#eaf2fb",
  primary: "#4da3ff",
  accent: "#38bdf8",
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
  };
}

export const THEME_VAR_NAMES = Object.keys(themeCssVars(DEFAULT_CUSTOM_THEME));
