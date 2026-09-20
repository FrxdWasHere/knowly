import { Check, Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useKnowly } from "@/store/knowly";
import {
  COLOR_THEMES,
  DEFAULT_CUSTOM_THEME,
  isValidHex,
  normalizeHex,
  type ThemeColors,
} from "@/lib/themes";

const CUSTOM_FIELDS: { key: keyof ThemeColors; label: string; hint: string }[] = [
  { key: "background", label: "Page background", hint: "The colour behind everything" },
  { key: "surface", label: "Panels & cards", hint: "Boxes sitting on the background" },
  { key: "surface2", label: "Raised panels", hint: "Inputs, chips and inner boxes" },
  { key: "foreground", label: "Text", hint: "Main reading colour" },
  { key: "primary", label: "Primary", hint: "Buttons, links and highlights" },
  { key: "accent", label: "Accent", hint: "Secondary highlight colour" },
];

function Swatch({
  colors,
  label,
  blurb,
  active,
  onClick,
}: {
  colors: ThemeColors;
  label: string;
  blurb?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "press hover-lift relative overflow-hidden rounded-xl border border-border p-3 text-left transition-all",
        active && "border-primary ring-2 ring-primary/40",
      )}
      style={{ background: colors.background, color: colors.foreground }}
    >
      {active && (
        <span
          className="absolute right-2 top-2 grid size-5 place-items-center rounded-full"
          style={{ background: colors.primary, color: colors.background }}
        >
          <Check className="size-3" />
        </span>
      )}
      <div className="flex gap-1.5">
        {[colors.surface, colors.surface2, colors.primary, colors.accent].map((c, i) => (
          <span
            key={i}
            className="size-5 rounded-md"
            style={{ background: c, boxShadow: `inset 0 0 0 1px ${colors.foreground}22` }}
          />
        ))}
      </div>
      <p className="mt-2 text-sm font-semibold">{label}</p>
      {blurb && (
        <p className="mt-0.5 text-[11px]" style={{ opacity: 0.7 }}>
          {blurb}
        </p>
      )}
    </button>
  );
}

const DEFAULT_PREVIEW: ThemeColors = {
  background: "#101d2c",
  surface: "#17293c",
  surface2: "#20364d",
  foreground: "#eaf2fb",
  primary: "#5aa9f8",
  accent: "#49c2e8",
};

export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const { state, updateSettings } = useKnowly();
  const s = state.settings;
  const custom = s.customTheme ?? DEFAULT_CUSTOM_THEME;

  const setCustomColor = (key: keyof ThemeColors, raw: string) => {
    const value = raw.startsWith("#") || raw === "" ? raw : `#${raw}`;
    const next = { ...custom, [key]: value };
    updateSettings({ customTheme: next, colorTheme: "custom" });
  };

  return (
    <div className="space-y-5">
      <div className={cn("grid gap-3", compact ? "sm:grid-cols-3" : "sm:grid-cols-3 xl:grid-cols-4")}>
        <Swatch
          colors={DEFAULT_PREVIEW}
          label="Knowly Default"
          blurb="The stock look."
          active={s.colorTheme === "default" || !s.colorTheme}
          onClick={() => updateSettings({ colorTheme: "default" })}
        />
        {COLOR_THEMES.map((t) => (
          <Swatch
            key={t.id}
            colors={t.colors}
            label={t.label}
            blurb={t.blurb}
            active={s.colorTheme === t.id}
            onClick={() => updateSettings({ colorTheme: t.id })}
          />
        ))}
        <Swatch
          colors={custom}
          label="Custom"
          blurb="Your own hex colours."
          active={s.colorTheme === "custom"}
          onClick={() => updateSettings({ colorTheme: "custom" })}
        />
      </div>

      {s.colorTheme === "custom" && (
        <div className="rounded-xl border border-border bg-surface-2/50 p-4">
          <div className="flex items-center gap-2">
            <Palette className="size-4 text-primary" />
            <p className="text-sm font-semibold">Custom colours</p>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Enter a hex code (like #1b2f45) or use the colour square. Changes apply instantly.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {CUSTOM_FIELDS.map((f) => {
              const value = custom[f.key] ?? "";
              const valid = isValidHex(value);
              return (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs">{f.label}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label={`${f.label} colour picker`}
                      value={valid ? normalizeHex(value) : "#000000"}
                      onChange={(e) => setCustomColor(f.key, e.target.value)}
                      className="size-9 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                    />
                    <Input
                      value={value}
                      onChange={(e) => setCustomColor(f.key, e.target.value)}
                      placeholder="#000000"
                      maxLength={7}
                      spellCheck={false}
                      className={cn("font-mono text-sm", !valid && "border-destructive")}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {valid ? f.hint : "Needs a 6-digit hex code"}
                  </p>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => updateSettings({ customTheme: { ...DEFAULT_CUSTOM_THEME } })}
            className="mt-4 rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary"
          >
            Reset custom colours
          </button>
        </div>
      )}
    </div>
  );
}
