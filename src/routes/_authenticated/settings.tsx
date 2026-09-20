import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, ImagePlus, RotateCcw, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ACCENTS,
  AVATAR_EMOJIS,
  GRADE_LEVELS,
  STUDY_REASONS,
  SUBJECT_SUGGESTIONS,
} from "@/lib/defaults";
import { fileToWallpaperDataUrl } from "@/lib/wallpaper";
import { useWallpaperUrl } from "@/hooks/use-wallpaper-url";
import { useKnowly } from "@/store/knowly";
import { cn } from "@/lib/utils";
import type { Settings } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Appearance, Study & Data Controls | Knowly" },
      {
        name: "description",
        content:
          "Tune accent colors, density, accessibility, study behaviour and gamification, then export, import or wipe all locally stored Knowly data.",
      },
      { property: "og:title", content: "Settings — Knowly" },
      {
        property: "og:description",
        content: "Full control over appearance, accessibility, study rules and your local data.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <SettingsPage />
    </AppPage>
  ),
});

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel hover-lift anim-fade-up p-6">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <Label className="text-sm">{label}</Label>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SettingsPage() {
  const { state, updateSettings, resetSettings, resetAll, exportState, importState } =
    useKnowly();
  const s = state.settings;
  const wallpaperUrl = useWallpaperUrl(s.wallpaper);
  const fileRef = useRef<HTMLInputElement>(null);
  const wallpaperRef = useRef<HTMLInputElement>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    updateSettings({ [key]: value } as Partial<Settings>);

  const download = () => {
    const blob = new Blob([exportState()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `knowly-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  };

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Settings"
        description="Everything is stored locally in this browser. Nothing is ever uploaded."
        action={
          <Button variant="outline" onClick={resetSettings}>
            <RotateCcw /> Reset settings
          </Button>
        }
      />

      <div className="grid gap-6">
        <Section title="Your profile" description="Used across the dashboard, arena and reports.">
          <div className="flex flex-wrap items-center gap-2">
            {AVATAR_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => set("avatarEmoji", e)}
                className={cn(
                  "press grid size-10 place-items-center rounded-xl border border-border text-lg transition-all hover:scale-110",
                  s.avatarEmoji === e && "border-primary bg-primary/15 scale-110",
                )}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Display name</Label>
              <Input value={s.displayName} onChange={(e) => set("displayName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">School / institution</Label>
              <Input
                value={s.school}
                placeholder="Optional"
                onChange={(e) => set("school", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Grade level</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {GRADE_LEVELS.map((g) => (
                <button
                  key={g}
                  onClick={() => set("gradeLevel", s.gradeLevel === g ? "" : g)}
                  className={cn(
                    "press rounded-full border border-border px-3 py-1.5 text-xs transition-colors",
                    s.gradeLevel === g && "border-primary bg-primary/15 text-primary",
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Focus subjects</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {SUBJECT_SUGGESTIONS.map((sub) => {
                const on = s.focusSubjects.includes(sub);
                return (
                  <button
                    key={sub}
                    onClick={() =>
                      set(
                        "focusSubjects",
                        on ? s.focusSubjects.filter((x) => x !== sub) : [...s.focusSubjects, sub],
                      )
                    }
                    className={cn(
                      "press rounded-full border border-border px-3 py-1.5 text-xs transition-colors",
                      on && "border-primary bg-primary/15 text-primary",
                    )}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label className="text-xs">Why are you studying?</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {STUDY_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => set("studyReason", s.studyReason === r ? "" : r)}
                  className={cn(
                    "press rounded-full border border-border px-3 py-1.5 text-xs transition-colors",
                    s.studyReason === r && "border-primary bg-primary/15 text-primary",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Daily goal</Label>
                <Badge variant="secondary">{s.dailyGoal} questions</Badge>
              </div>
              <Slider
                value={[s.dailyGoal]}
                min={5}
                max={200}
                step={5}
                onValueChange={([v]) => set("dailyGoal", v)}
              />
            </div>
          </div>
          <Toggle
            label="Confirm before leaving a session"
            checked={s.confirmBeforeExit}
            onChange={(v) => set("confirmBeforeExit", v)}
          />
        </Section>

        <Section
          title="Wallpaper"
          description="Upload any image from this device. It is stored in this browser with the rest of your settings."
        >
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => wallpaperRef.current?.click()}>
              <ImagePlus /> {s.wallpaper ? "Replace image" : "Upload image"}
            </Button>
            {s.wallpaper && (
              <Button
                variant="ghost"
                onClick={() => {
                  set("wallpaper", null);
                }}
              >
                <X /> Remove
              </Button>
            )}
            <input
              ref={wallpaperRef}
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  const next = await fileToWallpaperDataUrl(file);
                  set("wallpaper", next);
                  toast.success("Wallpaper applied");
                } catch (err) {
                  toast.error((err as Error).message);
                }
              }}
            />
          </div>

          {wallpaperUrl && (
            <>
              <div className="anim-pop relative h-40 overflow-hidden rounded-xl border border-border">
                <img
                  src={wallpaperUrl}
                  alt="Your current Knowly wallpaper"
                  className="size-full object-cover"
                  style={{
                    opacity: s.wallpaperOpacity,
                    filter: `blur(${s.wallpaperBlur}px)`,
                  }}
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Opacity</Label>
                    <Badge variant="secondary">{Math.round(s.wallpaperOpacity * 100)}%</Badge>
                  </div>
                  <Slider
                    value={[s.wallpaperOpacity]}
                    min={0.05}
                    max={1}
                    step={0.05}
                    onValueChange={([v]) => set("wallpaperOpacity", v)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Blur</Label>
                    <Badge variant="secondary">{s.wallpaperBlur}px</Badge>
                  </div>
                  <Slider
                    value={[s.wallpaperBlur]}
                    min={0}
                    max={24}
                    step={1}
                    onValueChange={([v]) => set("wallpaperBlur", v)}
                  />
                </div>
              </div>
            </>
          )}
        </Section>

        <Section
          title="Colour theme"
          description="Pick a preset palette or build your own from hex codes."
        >
          <ThemePicker />
        </Section>

        <Section title="Appearance">
          <div>
            <Label className="text-xs">
              Accent{" "}
              {s.colorTheme !== "default" && (
                <span className="text-muted-foreground">(used by the default theme only)</span>
              )}
            </Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => set("accent", a.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs",
                    s.accent === a.id && "border-primary bg-primary/15 text-primary",
                  )}
                >
                  <span className="size-3 rounded-full" style={{ background: a.value }} />
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Theme</Label>
            <div className="mt-2 flex gap-2">
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => set("theme", t)}
                  className={cn(
                    "rounded-full border border-border px-3 py-1.5 text-xs capitalize",
                    s.theme === t && "border-primary bg-primary/15 text-primary",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Animation speed</Label>
                <Badge variant="secondary">{s.animationSpeed.toFixed(2)}×</Badge>
              </div>
              <Slider
                value={[s.animationSpeed]}
                min={0.5}
                max={2}
                step={0.25}
                onValueChange={([v]) => set("animationSpeed", v)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Font scale</Label>
                <Badge variant="secondary">{s.fontScale.toFixed(2)}×</Badge>
              </div>
              <Slider
                value={[s.fontScale]}
                min={0.85}
                max={1.3}
                step={0.05}
                onValueChange={([v]) => set("fontScale", v)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Corner radius</Label>
                <Badge variant="secondary">{s.radius.toFixed(2)}rem</Badge>
              </div>
              <Slider
                value={[s.radius]}
                min={0}
                max={1.5}
                step={0.05}
                onValueChange={([v]) => set("radius", v)}
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Density</Label>
              <div className="mt-2 flex gap-2">
                {(["compact", "cozy", "spacious"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => set("density", d)}
                    className={cn(
                      "rounded-full border border-border px-3 py-1.5 text-xs capitalize",
                      s.density === d && "border-primary bg-primary/15 text-primary",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Button size</Label>
              <div className="mt-2 flex gap-2">
                {(["sm", "default", "lg"] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => set("buttonSize", b)}
                    className={cn(
                      "rounded-full border border-border px-3 py-1.5 text-xs capitalize",
                      s.buttonSize === b && "border-primary bg-primary/15 text-primary",
                    )}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Toggle
            label="Show progress bars"
            hint="Applies to the dashboard, study sessions and quizzes"
            checked={s.showProgressBars}
            onChange={(v) => set("showProgressBars", v)}
          />
        </Section>

        <Section title="Accessibility">
          <Toggle
            label="Reduced motion"
            hint="Disable animations and transitions"
            checked={s.reducedMotion}
            onChange={(v) => set("reducedMotion", v)}
          />
          <Toggle
            label="High contrast"
            checked={s.highContrast}
            onChange={(v) => set("highContrast", v)}
          />
          <Toggle
            label="Colorblind-safe palette"
            hint="Use a higher-contrast light and deep blue pair"
            checked={s.colorblindPalette}
            onChange={(v) => set("colorblindPalette", v)}
          />
          <Toggle
            label="Strong focus indicators"
            checked={s.focusIndicators}
            onChange={(v) => set("focusIndicators", v)}
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Timer multiplier</Label>
              <Badge variant="secondary">{s.timerMultiplier.toFixed(1)}×</Badge>
            </div>
            <Slider
              value={[s.timerMultiplier]}
              min={0.5}
              max={3}
              step={0.5}
              onValueChange={([v]) => set("timerMultiplier", v)}
            />
          </div>
        </Section>

        <Section title="Study behaviour">
          <Toggle
            label="Auto-reveal answers"
            checked={s.autoReveal}
            onChange={(v) => set("autoReveal", v)}
          />
          <Toggle
            label="Shuffle study order"
            checked={s.shuffleStudy}
            onChange={(v) => set("shuffleStudy", v)}
          />
          <Toggle
            label="Show hints"
            hint="Applies to study sessions and quizzes"
            checked={s.showHints}
            onChange={(v) => set("showHints", v)}
          />
          <Toggle
            label="Show explanations"
            hint="Applies to study sessions and quizzes"
            checked={s.showExplanations}
            onChange={(v) => set("showExplanations", v)}
          />
        </Section>

        <Section title="Gamification">
          <Toggle label="Earn XP" checked={s.xpEnabled} onChange={(v) => set("xpEnabled", v)} />
          <Toggle
            label="Achievement popups"
            checked={s.achievementPopups}
            onChange={(v) => set("achievementPopups", v)}
          />
        </Section>

        <Section
          title="Data"
          description={`${state.decks.length} decks · ${state.history.length} sessions stored in this browser. Export JSON to back up or move your library.`}
        >
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={download}>
              <Download /> Export backup
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload /> Import backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const ok = importState(await file.text());
                toast[ok ? "success" : "error"](
                  ok ? "Backup restored" : "That file isn't a valid Knowly backup",
                );
                e.target.value = "";
              }}
            />
            <Button
              variant="destructive"
              onClick={() => {
                if (!confirmWipe) {
                  setConfirmWipe(true);
                  return;
                }
                resetAll();
                setConfirmWipe(false);
                toast.success("All data erased");
              }}
            >
              <Trash2 /> {confirmWipe ? "Click again to confirm" : "Erase all data"}
            </Button>
          </div>
        </Section>
      </div>
    </div>
  );
}