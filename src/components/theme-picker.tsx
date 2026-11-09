import { Check, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKnowly } from "@/store/knowly";

/**
 * Knowly ships with two hand-built themes, designed together so the mode
 * switch keeps the same character. The preview colours below are a small,
 * fixed mirror of the real tokens in styles.css (:root and .dark) — the app
 * itself always reads the CSS variables, never these values.
 */
const THEME_OPTIONS = [
  {
    id: "light" as const,
    label: "Light",
    name: "Daylight",
    blurb: "Warm paper, espresso ink and coral blocks for bright rooms.",
    Icon: Sun,
    preview: {
      background: "#FBF8F2",
      surface: "#FFFFFF",
      panel: "#F1EAE0",
      ink: "#241F19",
      muted: "#6C6358",
      primary: "#C0272D",
      accent: "#7C4DFF",
    },
  },
  {
    id: "dark" as const,
    label: "Dark",
    name: "Midnight",
    blurb: "Deep warm charcoal with cream rules and a coral glow.",
    Icon: Moon,
    preview: {
      background: "#1A1714",
      surface: "#262220",
      panel: "#322D29",
      ink: "#F7F1E7",
      muted: "#A79C8F",
      primary: "#F2836B",
      accent: "#B78DF0",
    },
  },
];

type ThemePreview = (typeof THEME_OPTIONS)[number]["preview"];

function PreviewSwatch({ preview }: { preview: ThemePreview }) {
  return (
    <span
      aria-hidden
      className="mt-3 flex h-24 gap-1.5 overflow-hidden rounded-lg border-2 p-1.5 sm:h-28"
      style={{ borderColor: preview.ink, background: preview.background }}
    >
      <span
        className="flex w-[27%] min-w-10 flex-col gap-1 rounded-md border p-1"
        style={{ borderColor: preview.ink, background: preview.surface }}
      >
        <span className="h-1.5 w-3/4 rounded-full" style={{ background: preview.primary }} />
        <span className="h-1 w-full rounded-full" style={{ background: preview.panel }} />
        <span className="h-1 w-4/5 rounded-full" style={{ background: preview.panel }} />
        <span className="mt-auto h-1.5 w-2/3 rounded-full" style={{ background: preview.accent }} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex items-center justify-between gap-2">
          <span className="h-1.5 w-1/2 rounded-full" style={{ background: preview.ink }} />
          <span
            className="h-2.5 w-8 rounded-full border"
            style={{ borderColor: preview.ink, background: preview.primary }}
          />
        </span>
        <span className="h-1 w-2/3 rounded-full" style={{ background: preview.muted }} />
        <span
          className="flex min-h-0 flex-1 flex-col gap-1 rounded-md border p-1.5"
          style={{ borderColor: preview.ink, background: preview.surface }}
        >
          <span className="h-1.5 w-4/5 rounded-full" style={{ background: preview.ink }} />
          <span className="h-1 w-3/5 rounded-full" style={{ background: preview.muted }} />
          <span className="mt-auto flex gap-1">
            <span
              className="h-3.5 w-9 rounded-[3px] border"
              style={{ borderColor: preview.ink, background: preview.primary }}
            />
            <span
              className="h-3.5 w-7 rounded-[3px] border"
              style={{ borderColor: preview.ink, background: preview.panel }}
            />
          </span>
        </span>
      </span>
    </span>
  );
}

export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const { state, updateSettings } = useKnowly();
  const active = state.settings.theme;

  return (
    <div
      role="group"
      aria-label="Theme"
      className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", compact && "gap-2.5")}
    >
      {THEME_OPTIONS.map(({ id, label, name, blurb, Icon, preview }) => {
        const selected = active === id;
        return (
          <div
            key={id}
            className={cn(
              "relative min-w-0 overflow-hidden rounded-2xl border-[3px] bg-surface transition-all",
              selected
                ? "border-primary shadow-[4px_4px_0_0_var(--shadow-ink)]"
                : "border-border hover:border-primary/60",
            )}
          >
            <button
              type="button"
              onClick={() => updateSettings({ theme: id })}
              aria-pressed={selected}
              className="press block w-full p-3 text-left sm:p-4"
            >
              <span className="flex items-start gap-3">
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-xl border-2"
                  style={{
                    borderColor: preview.ink,
                    background: preview.panel,
                    color: preview.ink,
                  }}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-display text-base font-bold leading-none">{label}</span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {name}
                    </span>
                  </span>
                  <span className="mt-1.5 block text-xs leading-5 text-muted-foreground">
                    {blurb}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-transparent",
                  )}
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
              </span>
              <PreviewSwatch preview={preview} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
