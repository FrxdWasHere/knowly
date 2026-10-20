import { ACCENTS } from "@/lib/defaults";
import {
  getColorTheme,
  luminance,
  sanitizePalette,
  themeCssVars,
  THEME_VAR_NAMES,
  type ThemeColors,
} from "@/lib/themes";
import type { Settings } from "@/lib/types";

export const THEME_CACHE_KEY = "knowly.theme.v1";

interface ResolvedTheme {
  mode: "dark" | "light";
  vars: Record<string, string>;
  highContrast: boolean;
  colorblindPalette: boolean;
  reducedMotion: boolean;
  focusIndicators: boolean;
  buttonSize: Settings["buttonSize"];
  fontScale: number;
  radius: number;
  animationSpeed: number;
}

export function resolveTheme(settings: Settings): ResolvedTheme {
  const preset = getColorTheme(settings.colorTheme);
  const userTheme = settings.customThemes?.find((theme) => theme.id === settings.colorTheme);
  const palette: ThemeColors | undefined =
    settings.colorTheme === "custom"
      ? sanitizePalette(settings.customTheme)
      : userTheme
        ? sanitizePalette(userTheme.colors)
        : preset?.colors;
  const mode = palette
    ? (preset?.mode ?? userTheme?.mode ?? (luminance(palette.background) > 0.5 ? "light" : "dark"))
    : settings.theme;
  const vars = palette ? themeCssVars(palette) : {};

  if (!palette) {
    const accent = ACCENTS.find((item) => item.id === settings.accent) ?? ACCENTS[0];
    if (accent) {
      vars["--primary"] = accent.value;
      vars["--primary-glow"] = accent.glow;
      vars["--ring"] = accent.value;
      vars["--sidebar-primary"] = accent.value;
    }
  }

  if (settings.colorblindPalette) {
    // Let the colour-blind friendly status colours win over theme tints.
    for (const k of [
      "--success",
      "--success-foreground",
      "--destructive",
      "--destructive-foreground",
      "--warning",
      "--warning-foreground",
    ])
      delete vars[k];
  }

  if (settings.highContrast) {
    vars["--border"] = `color-mix(in oklab, var(--foreground) 42%, transparent)`;
    vars["--input"] = `color-mix(in oklab, var(--foreground) 50%, transparent)`;
    vars["--muted-foreground"] = `color-mix(in oklab, var(--foreground) 88%, var(--background))`;
    vars["--sidebar-border"] = `color-mix(in oklab, var(--foreground) 36%, transparent)`;
  }

  return {
    mode,
    vars,
    highContrast: settings.highContrast,
    colorblindPalette: settings.colorblindPalette,
    reducedMotion: settings.reducedMotion,
    focusIndicators: settings.focusIndicators,
    buttonSize: settings.buttonSize,
    fontScale: settings.fontScale,
    radius: settings.radius,
    animationSpeed: settings.animationSpeed,
  };
}

export function applyThemeToRoot(settings: Settings) {
  if (typeof document === "undefined") return;
  const theme = resolveTheme(settings);
  const root = document.documentElement;

  root.classList.toggle("light", theme.mode === "light");
  root.classList.toggle("dark", theme.mode === "dark");
  root.classList.toggle("contrast-high", theme.highContrast);
  root.classList.toggle("colorblind", theme.colorblindPalette);
  root.classList.toggle("reduce-motion", theme.reducedMotion);
  root.classList.toggle("focus-strong", theme.focusIndicators);
  root.dataset.btn = theme.buttonSize;
  root.style.setProperty("--font-scale", String(theme.fontScale));
  root.style.setProperty("--radius", `${theme.radius}rem`);
  root.style.setProperty("--speed", String(theme.animationSpeed));

  for (const name of THEME_VAR_NAMES) root.style.removeProperty(name);
  for (const [name, value] of Object.entries(theme.vars)) root.style.setProperty(name, value);

  try {
    window.localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(theme));
  } catch {
    // Theme application still works when browser storage is unavailable.
  }
}

/** Runs before React paints, using the last safely resolved theme cache. */
export const THEME_BOOTSTRAP_SCRIPT = `(()=>{try{const t=JSON.parse(localStorage.getItem('${THEME_CACHE_KEY}')||'null');if(!t||!t.vars)return;const r=document.documentElement;r.classList.toggle('light',t.mode==='light');r.classList.toggle('dark',t.mode==='dark');r.classList.toggle('contrast-high',!!t.highContrast);r.classList.toggle('colorblind',!!t.colorblindPalette);r.classList.toggle('reduce-motion',!!t.reducedMotion);r.classList.toggle('focus-strong',!!t.focusIndicators);if(t.buttonSize)r.dataset.btn=t.buttonSize;if(Number.isFinite(t.fontScale))r.style.setProperty('--font-scale',String(t.fontScale));if(Number.isFinite(t.radius))r.style.setProperty('--radius',t.radius+'rem');if(Number.isFinite(t.animationSpeed))r.style.setProperty('--speed',String(t.animationSpeed));for(const [n,v] of Object.entries(t.vars)){if(/^--[a-z0-9-]+$/.test(n)&&typeof v==='string')r.style.setProperty(n,v)}}catch{}})();`;
