import { useState } from "react";
import { Check, Copy, Palette, Pencil, Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useKnowly } from "@/store/knowly";
import {
  COLOR_THEMES,
  DEFAULT_CUSTOM_THEME,
  isValidHex,
  luminance,
  newUserThemeId,
  normalizeHex,
  type ThemeColors,
  type UserTheme,
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
  actions,
}: {
  colors: ThemeColors;
  label: string;
  blurb?: string;
  active: boolean;
  onClick: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border transition-all",
        active && "border-primary ring-2 ring-primary/40",
      )}
      style={{ background: colors.background, color: colors.foreground }}
    >
      <button
        type="button"
        onClick={onClick}
        className="press hover-lift block w-full p-3 text-left"
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
        <p className="mt-2 pr-6 text-sm font-semibold">{label}</p>
        {blurb && (
          <p className="mt-0.5 text-[11px]" style={{ opacity: 0.7 }}>
            {blurb}
          </p>
        )}
      </button>
      {actions && <div className="flex gap-1 px-3 pb-2">{actions}</div>}
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid min-h-[44px] min-w-[44px] place-items-center rounded-md border text-current opacity-70 transition hover:opacity-100"
      style={{ borderColor: "currentColor" }}
    >
      {children}
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
  const userThemes: UserTheme[] = s.customThemes ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = userThemes.find((t) => t.id === editingId) ?? null;
  const editingLegacy = editingId === "custom";
  const editColors: ThemeColors = editing ? editing.colors : custom;

  const saveThemes = (next: UserTheme[]) => updateSettings({ customThemes: next });

  const setColor = (key: keyof ThemeColors, raw: string) => {
    const value = raw.startsWith("#") || raw === "" ? raw : `#${raw}`;
    if (editing) {
      const colors = { ...editing.colors, [key]: value };
      saveThemes(
        userThemes.map((t) =>
          t.id === editing.id
            ? {
                ...t,
                colors,
                mode: luminance(colors.background) > 0.5 ? "light" : "dark",
              }
            : t,
        ),
      );
      if (s.colorTheme !== editing.id) updateSettings({ colorTheme: editing.id });
    } else {
      updateSettings({ customTheme: { ...custom, [key]: value }, colorTheme: "custom" });
    }
  };

  const forkTheme = (label: string, colors: ThemeColors) => {
    const theme: UserTheme = {
      id: newUserThemeId(),
      label: `${label} (copy)`,
      mode: luminance(colors.background) > 0.5 ? "light" : "dark",
      colors: { ...colors },
    };
    saveThemes([...userThemes, theme]);
    updateSettings({ colorTheme: theme.id });
    setEditingId(theme.id);
  };

  const removeTheme = (id: string) => {
    saveThemes(userThemes.filter((t) => t.id !== id));
    if (editingId === id) setEditingId(null);
    if (s.colorTheme === id) updateSettings({ colorTheme: "default" });
  };

  return (
    <div className="space-y-5">
      <div
        className={cn("grid gap-3", compact ? "sm:grid-cols-3" : "sm:grid-cols-3 xl:grid-cols-4")}
      >
        <Swatch
          colors={DEFAULT_PREVIEW}
          label="Knowly Default"
          blurb="The stock look."
          active={s.colorTheme === "default" || !s.colorTheme}
          onClick={() => updateSettings({ colorTheme: "default" })}
          actions={
            <IconBtn
              label="Copy & edit"
              onClick={() => forkTheme("Knowly Default", DEFAULT_PREVIEW)}
            >
              <Pencil className="size-3" />
            </IconBtn>
          }
        />
        {COLOR_THEMES.map((t) => (
          <Swatch
            key={t.id}
            colors={t.colors}
            label={t.label}
            blurb={t.blurb}
            active={s.colorTheme === t.id}
            onClick={() => updateSettings({ colorTheme: t.id })}
            actions={
              <IconBtn
                label={`Copy & edit ${t.label}`}
                onClick={() => forkTheme(t.label, t.colors)}
              >
                <Pencil className="size-3" />
              </IconBtn>
            }
          />
        ))}
        {userThemes.map((t) => (
          <Swatch
            key={t.id}
            colors={t.colors}
            label={t.label}
            blurb="Your theme"
            active={s.colorTheme === t.id}
            onClick={() => updateSettings({ colorTheme: t.id })}
            actions={
              <>
                <IconBtn
                  label={`Edit ${t.label}`}
                  onClick={() => {
                    updateSettings({ colorTheme: t.id });
                    setEditingId(t.id);
                  }}
                >
                  <Pencil className="size-3" />
                </IconBtn>
                <IconBtn
                  label={`Duplicate ${t.label}`}
                  onClick={() => forkTheme(t.label, t.colors)}
                >
                  <Copy className="size-3" />
                </IconBtn>
                <IconBtn label={`Delete ${t.label}`} onClick={() => removeTheme(t.id)}>
                  <Trash2 className="size-3" />
                </IconBtn>
              </>
            }
          />
        ))}
        <Swatch
          colors={custom}
          label="Custom"
          blurb="Your own hex colours."
          active={s.colorTheme === "custom"}
          onClick={() => {
            updateSettings({ colorTheme: "custom" });
            setEditingId("custom");
          }}
          actions={
            <IconBtn
              label="Edit custom colours"
              onClick={() => {
                updateSettings({ colorTheme: "custom" });
                setEditingId("custom");
              }}
            >
              <Pencil className="size-3" />
            </IconBtn>
          }
        />
      </div>

      <button
        type="button"
        onClick={() => forkTheme("New theme", custom)}
        className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary"
      >
        <Plus className="size-3" /> Create a new theme
      </button>

      {(editing || editingLegacy || s.colorTheme === "custom") && (
        <div className="rounded-xl border border-border bg-surface-2/50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Palette className="size-4 text-primary" />
            <p className="text-sm font-semibold">{editing ? "Editing" : "Custom colours"}</p>
            {editing && (
              <Input
                value={editing.label}
                onChange={(e) =>
                  saveThemes(
                    userThemes.map((t) =>
                      t.id === editing.id ? { ...t, label: e.target.value } : t,
                    ),
                  )
                }
                className="h-8 w-48 text-sm"
                aria-label="Theme name"
              />
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Enter a hex code (like #1b2f45) or use the colour square. Changes apply instantly.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {CUSTOM_FIELDS.map((f) => {
              const value = editColors[f.key] ?? "";
              const valid = isValidHex(value);
              return (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs">{f.label}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label={`${f.label} colour picker`}
                      value={valid ? normalizeHex(value) : "#000000"}
                      onChange={(e) => setColor(f.key, e.target.value)}
                      className="size-9 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                    />
                    <Input
                      value={value}
                      onChange={(e) => setColor(f.key, e.target.value)}
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
          <div className="mt-4 flex flex-wrap gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => forkTheme(editing.label, editing.colors)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => removeTheme(editing.id)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-destructive"
                >
                  Delete theme
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary"
                >
                  Done
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => updateSettings({ customTheme: { ...DEFAULT_CUSTOM_THEME } })}
                className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary"
              >
                Reset custom colours
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
