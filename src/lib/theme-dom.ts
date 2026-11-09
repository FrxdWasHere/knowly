import { THEME_VAR_NAMES } from "@/lib/themes";
import type { Settings } from "@/lib/types";

export const THEME_CACHE_KEY = "knowly.theme.v2";
const LEGACY_THEME_CACHE_KEY = "knowly.theme.v1";

interface ResolvedTheme {
  mode: "dark" | "light";
  highContrast: boolean;
  colorblindPalette: boolean;
  reducedMotion: boolean;
  focusIndicators: boolean;
  buttonSize: Settings["buttonSize"];
  fontScale: number;
  radius: number;
  animationSpeed: number;
}

/**
 * Knowly's two themes are built into the stylesheet. Settings only chooses the
 * mode; the palette, surfaces, rules and shadows are authored together so the
 * light and dark themes always feel like the same product.
 */
export function resolveTheme(settings: Settings): ResolvedTheme {
  return {
    mode: settings.theme === "dark" ? "dark" : "light",
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

  // Palette tokens are owned by styles.css now. Clear any inline values a
  // previous preset or custom palette left behind, so upgrades settle on the
  // built-in theme instead of carrying stale colours.
  for (const name of THEME_VAR_NAMES) root.style.removeProperty(name);

  try {
    window.localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(theme));
    window.localStorage.removeItem(LEGACY_THEME_CACHE_KEY);
  } catch {
    // Theme application still works when browser storage is unavailable.
  }
}

/**
 * Runs before React paints, using the last safely resolved theme cache.
 * The v1 cache is read only for its mode and comfort flags; its palette
 * variables are deliberately ignored.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(()=>{try{const s=localStorage.getItem('${THEME_CACHE_KEY}')||localStorage.getItem('${LEGACY_THEME_CACHE_KEY}')||'null';const t=JSON.parse(s);if(!t)return;const r=document.documentElement;r.classList.toggle('light',t.mode==='light');r.classList.toggle('dark',t.mode==='dark');r.classList.toggle('contrast-high',!!t.highContrast);r.classList.toggle('colorblind',!!t.colorblindPalette);r.classList.toggle('reduce-motion',!!t.reducedMotion);r.classList.toggle('focus-strong',!!t.focusIndicators);if(t.buttonSize)r.dataset.btn=t.buttonSize;if(Number.isFinite(t.fontScale))r.style.setProperty('--font-scale',String(t.fontScale));if(Number.isFinite(t.radius))r.style.setProperty('--radius',t.radius+'rem');if(Number.isFinite(t.animationSpeed))r.style.setProperty('--speed',String(t.animationSpeed));}catch{}})();`;
