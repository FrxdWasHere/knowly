import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  Contrast,
  Download,
  Droplets,
  Eye,
  Gauge,
  GraduationCap,
  HardDrive,
  ImagePlus,
  Keyboard,
  Lightbulb,
  ListChecks,
  Moon,
  RotateCcw,
  ShieldCheck,
  Shuffle,
  SlidersHorizontal,
  Sun,
  Target,
  Timer,
  Trash2,
  Trophy,
  Type,
  Upload,
  UserRound,
  X,
  Zap,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { ThemePicker } from "@/components/theme-picker";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  ACCENTS,
  AVATAR_EMOJIS,
  GRADE_LEVELS,
  STUDY_REASONS,
  SUBJECT_SUGGESTIONS,
} from "@/lib/defaults";
import { fileToWallpaperDataUrl } from "@/lib/wallpaper";
import { estimateStorageUsage, formatBytes, type StorageUsage } from "@/lib/storage-usage";
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

/* ------------------------------------------------------------------ */
/* iOS-style building blocks: grouped cards, icon tiles, rows          */
/* ------------------------------------------------------------------ */

function Tile({ icon: Icon, tint }: { icon: LucideIcon; tint: string }) {
  // `tint` is a theme CSS variable name (e.g. "--primary") so tiles always
  // recolor with the active theme instead of a fixed palette.
  return (
    <span
      className="grid size-8 shrink-0 place-items-center rounded-[9px]"
      style={{
        background: `color-mix(in oklab, var(${tint}, var(--primary)) 18%, transparent)`,
        color: `var(${tint}, var(--primary))`,
      }}
    >
      <Icon className="size-[18px]" strokeWidth={2.2} />
    </span>
  );
}

function Group({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="anim-fade-up">
      <h2 className="px-4 pb-1.5 text-[13px] text-muted-foreground">{title}</h2>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card/80">
        {children}
      </div>
      {footer && (
        <p className="px-4 pt-1.5 text-[13px] leading-5 text-muted-foreground">{footer}</p>
      )}
    </section>
  );
}

function ToggleRow({
  icon,
  tint,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  tint: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Tile icon={icon} tint={tint} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px]">{label}</span>
        {hint && <span className="block truncate text-[13px] text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SliderBlock({
  icon,
  tint,
  label,
  value,
  hint,
  children,
}: {
  icon?: LucideIcon;
  tint?: string;
  label: string;
  value: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        {icon && tint && <Tile icon={icon} tint={tint} />}
        <span className="flex-1 text-[15px]">{label}</span>
        <span className="text-[15px] tabular-nums text-muted-foreground">{value}</span>
      </div>
      <div className={cn(icon && tint && "pl-11", "mt-2")}>{children}</div>
      {hint && (
        <p className={cn(icon && tint && "pl-11", "mt-1.5 text-[13px] text-muted-foreground")}>
          {hint}
        </p>
      )}
    </div>
  );
}

function ActionRow({
  icon,
  tint,
  label,
  hint,
  destructive,
  onClick,
}: {
  icon: LucideIcon;
  tint: string;
  label: string;
  hint?: string;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
    >
      <Tile icon={icon} tint={tint} />
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[15px]", destructive && "text-destructive")}>
          {label}
        </span>
        {hint && <span className="block truncate text-[13px] text-muted-foreground">{hint}</span>}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" />
    </button>
  );
}

function Segmented<T extends string>({
  label,
  ariaLabel,
  options,
  value,
  onChange,
}: {
  label: string;
  ariaLabel: string;
  options: { value: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="px-4 py-3">
      <p className="mb-2 text-[15px]">{label}</p>
      <div role="group" aria-label={ariaLabel} className="flex rounded-xl bg-muted p-1">
        {options.map((o) => {
          const active = o.value === value;
          const OptionIcon = o.icon;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] transition-all",
                active
                  ? "bg-background font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {OptionIcon && <OptionIcon className="size-3.5" />}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChipRow({
  label,
  count,
  children,
}: {
  label: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3">
      <p className="mb-2 text-[15px]">
        {label}
        {count !== undefined && count > 0 && (
          <span className="ml-2 text-muted-foreground">{count} selected</span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "press rounded-full border border-border px-3 py-1.5 text-[13px] transition-colors",
        active && "border-primary bg-primary/15 font-medium text-primary",
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */

function SettingsPage() {
  const { state, updateSettings, setWallpaper, resetSettings, resetAll, exportState, importState } =
    useKnowly();
  const s = state.settings;
  const wallpaperUrl = useWallpaperUrl(s.wallpaper);
  const fileRef = useRef<HTMLInputElement>(null);
  const wallpaperRef = useRef<HTMLInputElement>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [usage, setUsage] = useState<StorageUsage | null>(null);

  // Re-measure whenever the sizeable parts of the state change.
  useEffect(() => {
    let alive = true;
    void estimateStorageUsage().then((next) => {
      if (alive) setUsage(next);
    });
    return () => {
      alive = false;
    };
  }, [
    state.decks.length,
    state.history.length,
    state.results.length,
    state.journal.length,
    s.wallpaper,
  ]);

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

  const profileSubtitle =
    [s.school, s.gradeLevel].filter(Boolean).join(" · ") || "Local profile · no account";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Settings"
        description="Everything is stored locally in this browser. Nothing is ever uploaded."
        action={
          <Button variant="outline" size="sm" onClick={resetSettings}>
            <RotateCcw /> Reset settings
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Profile banner, iOS Apple-Account style */}
        <div className="anim-fade-up overflow-hidden rounded-2xl border border-border bg-card/80 p-4">
          <div className="flex items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/50 via-primary/20 to-transparent text-3xl ring-1 ring-primary/30">
              {s.avatarEmoji || "🌊"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xl font-bold">
                {s.displayName || "Study Profile"}
              </p>
              <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{profileSubtitle}</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" aria-hidden />
          </div>
        </div>

        <Group title="Profile" footer="Used across the dashboard, arena and reports.">
          <div className="px-4 py-3">
            <Label className="text-[15px]">Avatar</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {AVATAR_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => set("avatarEmoji", e)}
                  aria-pressed={s.avatarEmoji === e}
                  className={cn(
                    "press grid size-10 place-items-center rounded-xl border border-transparent text-lg transition-all hover:scale-110",
                    s.avatarEmoji === e && "scale-110 border-primary bg-primary/15",
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-2.5">
            <Tile icon={UserRound} tint="--primary" />
            <span className="shrink-0 text-[15px]">Name</span>
            <input
              value={s.displayName}
              maxLength={40}
              placeholder="Your name"
              onChange={(e) => set("displayName", e.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent text-right text-[15px] outline-none placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="flex items-center gap-3 px-4 py-2.5">
            <Tile icon={GraduationCap} tint="--accent" />
            <span className="shrink-0 text-[15px]">School</span>
            <input
              value={s.school}
              maxLength={80}
              placeholder="Optional"
              onChange={(e) => set("school", e.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent text-right text-[15px] outline-none placeholder:text-muted-foreground/50"
            />
          </div>
          <ChipRow label="Grade level">
            {GRADE_LEVELS.map((g) => (
              <Chip key={g} active={s.gradeLevel === g} onClick={() => set("gradeLevel", g)}>
                {g}
              </Chip>
            ))}
          </ChipRow>
          <ChipRow label="Focus subjects" count={s.focusSubjects.length}>
            {SUBJECT_SUGGESTIONS.map((sub) => {
              const on = s.focusSubjects.includes(sub);
              return (
                <Chip
                  key={sub}
                  active={on}
                  onClick={() =>
                    set(
                      "focusSubjects",
                      on ? s.focusSubjects.filter((x) => x !== sub) : [...s.focusSubjects, sub],
                    )
                  }
                >
                  {sub}
                </Chip>
              );
            })}
          </ChipRow>
          <ChipRow label="Why are you studying?">
            {STUDY_REASONS.map((r) => (
              <Chip
                key={r}
                active={s.studyReason === r}
                onClick={() => set("studyReason", s.studyReason === r ? "" : r)}
              >
                {r}
              </Chip>
            ))}
          </ChipRow>
          <SliderBlock
            icon={Target}
            tint="--success"
            label="Daily goal"
            value={`${s.dailyGoal} questions`}
          >
            <Slider
              value={[s.dailyGoal]}
              min={5}
              max={200}
              step={5}
              onValueChange={([v]) => set("dailyGoal", v)}
            />
          </SliderBlock>
          <ToggleRow
            icon={ShieldCheck}
            tint="--primary"
            label="Confirm before leaving a session"
            checked={s.confirmBeforeExit}
            onChange={(v) => set("confirmBeforeExit", v)}
          />
        </Group>

        <Group
          title="Wallpaper"
          footer="Upload any image from this device. It is stored locally in this browser, kept separate from your study data."
        >
          <div className="flex items-center gap-3 px-4 py-2.5">
            <Tile icon={ImagePlus} tint="--accent" />
            <span className="flex-1 text-[15px]">
              {s.wallpaper ? "Current image" : "No wallpaper"}
            </span>
            <Button variant="outline" size="sm" onClick={() => wallpaperRef.current?.click()}>
              {s.wallpaper ? "Replace" : "Upload"}
            </Button>
            {s.wallpaper && (
              <Button variant="ghost" size="sm" onClick={() => setWallpaper(null)}>
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
                  setWallpaper(next);
                  toast.success("Wallpaper applied");
                } catch (err) {
                  toast.error((err as Error).message);
                }
              }}
            />
          </div>
          {wallpaperUrl && (
            <div className="space-y-3 px-4 py-3">
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[13px]">
                    <span>Opacity</span>
                    <span className="tabular-nums text-muted-foreground">
                      {Math.round(s.wallpaperOpacity * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[s.wallpaperOpacity]}
                    min={0.05}
                    max={1}
                    step={0.05}
                    onValueChange={([v]) => set("wallpaperOpacity", v)}
                  />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[13px]">
                    <span>Blur</span>
                    <span className="tabular-nums text-muted-foreground">{s.wallpaperBlur}px</span>
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
            </div>
          )}
        </Group>

        <Group title="Appearance" footer="Pick a preset palette or build your own from hex codes.">
          <div className="px-4 py-3">
            <ThemePicker />
          </div>
          <ChipRow label={`Accent${s.colorTheme !== "default" ? " (default theme only)" : ""}`}>
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => set("accent", a.id)}
                aria-pressed={s.accent === a.id}
                className={cn(
                  "press flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-[13px]",
                  s.accent === a.id && "border-primary bg-primary/15 font-medium text-primary",
                )}
              >
                <span className="size-3 rounded-full" style={{ background: a.value }} />
                {a.label}
              </button>
            ))}
          </ChipRow>
          <Segmented
            label="Theme"
            ariaLabel="Colour theme"
            value={s.theme}
            onChange={(v) => set("theme", v)}
            options={[
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
            ]}
          />
          <SliderBlock
            icon={Gauge}
            tint="--chart-4"
            label="Animation speed"
            value={`${s.animationSpeed.toFixed(2)}×`}
          >
            <Slider
              value={[s.animationSpeed]}
              min={0.5}
              max={2}
              step={0.25}
              onValueChange={([v]) => set("animationSpeed", v)}
            />
          </SliderBlock>
          <SliderBlock
            icon={Type}
            tint="--chart-3"
            label="Font scale"
            value={`${s.fontScale.toFixed(2)}×`}
          >
            <Slider
              value={[s.fontScale]}
              min={0.85}
              max={1.3}
              step={0.05}
              onValueChange={([v]) => set("fontScale", v)}
            />
          </SliderBlock>
          <SliderBlock label="Corner radius" value={`${s.radius.toFixed(2)}rem`}>
            <Slider
              value={[s.radius]}
              min={0}
              max={1.5}
              step={0.05}
              onValueChange={([v]) => set("radius", v)}
            />
          </SliderBlock>
          <Segmented
            label="Density"
            ariaLabel="Layout density"
            value={s.density}
            onChange={(v) => set("density", v)}
            options={[
              { value: "compact", label: "Compact" },
              { value: "cozy", label: "Cozy" },
              { value: "spacious", label: "Spacious" },
            ]}
          />
          <Segmented
            label="Button size"
            ariaLabel="Button size"
            value={s.buttonSize}
            onChange={(v) => set("buttonSize", v)}
            options={[
              { value: "sm", label: "Small" },
              { value: "default", label: "Medium" },
              { value: "lg", label: "Large" },
            ]}
          />
          <ToggleRow
            icon={BarChart3}
            tint="--chart-2"
            label="Show progress bars"
            hint="Dashboard, study sessions and quizzes"
            checked={s.showProgressBars}
            onChange={(v) => set("showProgressBars", v)}
          />
        </Group>

        <Group title="Accessibility">
          <ToggleRow
            icon={Eye}
            tint="--chart-4"
            label="Reduced motion"
            hint="Disable animations and transitions"
            checked={s.reducedMotion}
            onChange={(v) => set("reducedMotion", v)}
          />
          <ToggleRow
            icon={Contrast}
            tint="--foreground"
            label="High contrast"
            checked={s.highContrast}
            onChange={(v) => set("highContrast", v)}
          />
          <ToggleRow
            icon={Droplets}
            tint="--accent"
            label="Colorblind-safe palette"
            hint="Higher-contrast light and deep blue pair"
            checked={s.colorblindPalette}
            onChange={(v) => set("colorblindPalette", v)}
          />
          <ToggleRow
            icon={Keyboard}
            tint="--chart-5"
            label="Strong focus indicators"
            checked={s.focusIndicators}
            onChange={(v) => set("focusIndicators", v)}
          />
          <SliderBlock
            icon={Timer}
            tint="--warning"
            label="Timer multiplier"
            value={`${s.timerMultiplier.toFixed(1)}×`}
          >
            <Slider
              value={[s.timerMultiplier]}
              min={0.5}
              max={3}
              step={0.5}
              onValueChange={([v]) => set("timerMultiplier", v)}
            />
          </SliderBlock>
        </Group>

        <Group title="Study">
          <ToggleRow
            icon={BookOpen}
            tint="--accent"
            label="Auto-reveal answers"
            checked={s.autoReveal}
            onChange={(v) => set("autoReveal", v)}
          />
          <ToggleRow
            icon={Shuffle}
            tint="--chart-3"
            label="Shuffle study order"
            checked={s.shuffleStudy}
            onChange={(v) => set("shuffleStudy", v)}
          />
          <ToggleRow
            icon={Lightbulb}
            tint="--warning"
            label="Show hints"
            hint="Applies to study sessions and quizzes"
            checked={s.showHints}
            onChange={(v) => set("showHints", v)}
          />
          <ToggleRow
            icon={ListChecks}
            tint="--chart-4"
            label="Show explanations"
            hint="Applies to study sessions and quizzes"
            checked={s.showExplanations}
            onChange={(v) => set("showExplanations", v)}
          />
        </Group>

        <Group
          title="Review scheduling"
          footer="Fine-tune how often forgotten cards come back. These settings change every screen where you review."
        >
          <SliderBlock
            icon={RotateCcw}
            tint="--accent"
            label="Second chance"
            value={`${s.srs.learningStepMinutes} min`}
            hint="How soon a forgotten card comes back."
          >
            <Slider
              value={[s.srs.learningStepMinutes]}
              min={1}
              max={60}
              step={1}
              onValueChange={([v]) => set("srs", { ...s.srs, learningStepMinutes: v })}
            />
          </SliderBlock>
          <SliderBlock
            icon={SlidersHorizontal}
            tint="--primary"
            label="Review pace"
            value={`${s.srs.intervalModifier.toFixed(2)}×`}
            hint="Make every review come back sooner or later (higher = further apart)."
          >
            <Slider
              value={[s.srs.intervalModifier]}
              min={0.5}
              max={2}
              step={0.05}
              onValueChange={([v]) => set("srs", { ...s.srs, intervalModifier: v })}
            />
          </SliderBlock>
          <SliderBlock
            icon={Zap}
            tint="--warning"
            label="“Easy” stretch"
            value={`${s.srs.easyBonus.toFixed(2)}×`}
            hint="When you say a card was “Easy”, its next review moves even further out."
          >
            <Slider
              value={[s.srs.easyBonus]}
              min={1}
              max={1.6}
              step={0.05}
              onValueChange={([v]) => set("srs", { ...s.srs, easyBonus: v })}
            />
          </SliderBlock>
          <SliderBlock
            icon={CalendarCheck}
            tint="--chart-5"
            label="Longest gap"
            value={`${s.srs.maxIntervalDays} days`}
            hint="No card waits longer than this many days."
          >
            <Slider
              value={[s.srs.maxIntervalDays]}
              min={30}
              max={730}
              step={5}
              onValueChange={([v]) => set("srs", { ...s.srs, maxIntervalDays: v })}
            />
          </SliderBlock>
        </Group>

        <Group title="Gamification">
          <ToggleRow
            icon={Trophy}
            tint="--warning"
            label="Earn XP"
            checked={s.xpEnabled}
            onChange={(v) => set("xpEnabled", v)}
          />
          <ToggleRow
            icon={Bell}
            tint="--destructive"
            label="Achievement popups"
            checked={s.achievementPopups}
            onChange={(v) => set("achievementPopups", v)}
          />
        </Group>

        <Group
          title="Data & Storage"
          footer={`${state.decks.length} decks · ${state.courses.length} courses · ${state.history.length} sessions saved on this device. Save a backup file to keep a copy or move your library. Notebooks are exported one at a time from the Notebooks page.`}
        >
          <ActionRow
            icon={Download}
            tint="--success"
            label="Export backup"
            hint="Decks, courses, progress and settings"
            onClick={download}
          />
          <ActionRow
            icon={Upload}
            tint="--primary"
            label="Import backup"
            hint="Bring back everything from a saved backup file"
            onClick={() => fileRef.current?.click()}
          />
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
          <div className="flex items-center gap-3 px-4 py-2.5">
            <Tile icon={Trash2} tint="--destructive" />
            <button
              type="button"
              onClick={() => {
                if (!confirmWipe) {
                  setConfirmWipe(true);
                  return;
                }
                resetAll();
                setConfirmWipe(false);
                toast.success("All data erased");
              }}
              className={cn(
                "flex-1 truncate text-left text-[15px] text-destructive",
                !confirmWipe && "hover:underline",
              )}
            >
              {confirmWipe ? "Tap again to confirm erasing" : "Erase all data"}
            </button>
          </div>
          <div className="space-y-2 px-4 py-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <HardDrive className="size-3.5" aria-hidden /> Space Knowly is using
              </span>
              <span className="font-medium tabular-nums">
                {usage ? formatBytes(usage.usedBytes) : "measuring…"}
                {usage?.quotaBytes ? ` of ${formatBytes(usage.quotaBytes)}` : ""}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Space Knowly is using"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={usage?.percent ?? undefined}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width]",
                  (usage?.percent ?? 0) >= 80 ? "bg-destructive" : "bg-primary",
                )}
                style={{
                  width: `${usage?.percent ?? Math.min(100, ((usage?.usedBytes ?? 0) / 5_000_000) * 100)}%`,
                }}
              />
            </div>
            <p className="text-[13px] leading-5 text-muted-foreground">
              When Knowly runs out of room, it can't save new work — save a backup now and then to
              be safe. Notebooks are stored separately; export each one from the Notebooks page.
            </p>
          </div>
        </Group>

        <div className="px-4 py-2 text-center">
          <p className="text-[13px] text-muted-foreground">
            Knowly · local-first study workspace · no account
          </p>
        </div>
      </div>
    </div>
  );
}
