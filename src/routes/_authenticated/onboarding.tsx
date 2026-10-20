import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  Flame,
  HardDrive,
  Wand2,
  ClipboardCopy,
  Bot,
  FileJson,
  DatabaseBackup,
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  UserRound,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Swords,
  BarChart3,
  Rocket,
  Check,
  Palette,
  Plus,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ACCENTS,
  AVATAR_EMOJIS,
  GRADE_LEVELS,
  SESSION_LENGTHS,
  STUDY_REASONS,
  STUDY_TIMES,
  SUBJECT_SUGGESTIONS,
} from "@/lib/defaults";
import { validateDeckJson, type ValidationResult } from "@/lib/schema";
import { cn } from "@/lib/utils";

import { useKnowly } from "@/store/knowly";
import { ThemePicker } from "@/components/theme-picker";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome to Knowly" },
      {
        name: "description",
        content:
          "Set up your Knowly profile, learn the AI-free workflow and bring your library — import a deck or restore a full backup. Everything stays in this browser until you export it as JSON.",
      },
      { property: "og:title", content: "Welcome to Knowly" },
      {
        property: "og:description",
        content:
          "Build your profile, generate a prompt with your own AI, import the JSON and start studying.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Onboarding,
});

const STEP_META = [
  { label: "Welcome", icon: Flame },
  { label: "How it works", icon: Bot },
  { label: "What you get", icon: Swords },
  { label: "About you", icon: UserRound },
  { label: "Study plan", icon: BarChart3 },
  { label: "Look & feel", icon: Palette },
  { label: "Your library", icon: FileJson },
  { label: "Ready", icon: Rocket },
] as const;

const STEP_TIPS = [
  "Knowly keeps the library in this browser. Export a JSON backup whenever you want a portable copy.",
  "Use whichever AI you already trust — Knowly only prepares the prompt and validates the JSON it returns.",
  "Start with one deck, then let the analytics point you to the concepts that need another pass.",
  "A name and avatar make your dashboard, reports and arena results feel like yours.",
  "These choices tune your daily goal, subject hints and weak-topic suggestions. Nothing is locked in.",
  "Themes, accents and comfort settings can all be changed later from Settings.",
  "Bring a deck, restore a full backup, or skip this step and start with a clean library.",
  "You're ready. The Prompt Forge is the fastest way to turn your notes into a first deck.",
];

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
      onClick={onClick}
      className={cn(
        "press rounded-full border border-border px-3 py-1.5 text-xs transition-all duration-200 hover:border-primary/60",
        active && "border-primary bg-primary/15 text-primary",
      )}
    >
      {children}
    </button>
  );
}

interface BackupPreview {
  decks: number;
  cards: number;
  sessions: number;
  xp: number;
  owner: string;
  version: number | null;
}

/** Summarises a Knowly backup file without applying it. */
function previewBackup(
  text: string,
): { ok: true; preview: BackupPreview } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "That file doesn't look like a Knowly backup." };
  }
  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data.decks)) {
    return { ok: false, error: "That file doesn't look like a Knowly backup (missing decks)." };
  }
  const decks = data.decks as { questions?: unknown }[];
  const cards = decks.reduce(
    (n, d) => n + (Array.isArray(d?.questions) ? d.questions.length : 0),
    0,
  );
  const sessions = Array.isArray(data.history) ? data.history.length : 0;
  const progress = (data.progress ?? {}) as { lifetimeXp?: unknown; xp?: unknown };
  const xp =
    typeof progress.lifetimeXp === "number"
      ? progress.lifetimeXp
      : typeof progress.xp === "number"
        ? progress.xp
        : 0;
  const settings = (data.settings ?? {}) as { displayName?: unknown };
  return {
    ok: true,
    preview: {
      decks: decks.length,
      cards,
      sessions,
      xp,
      owner: typeof settings.displayName === "string" ? settings.displayName : "",
      version: typeof data.version === "number" ? data.version : null,
    },
  };
}

function Onboarding() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const { state, completeOnboarding, updateSettings, addDeck, importState } = useKnowly();
  const navigate = useNavigate();
  const settings = state.settings;

  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [imported, setImported] = useState(false);
  const [libraryMode, setLibraryMode] = useState<"deck" | "backup">("deck");
  const [backupText, setBackupText] = useState("");
  const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupRestored, setBackupRestored] = useState(false);
  const [customSubject, setCustomSubject] = useState("");
  const [studyTime, setStudyTime] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const backupFileRef = useRef<HTMLInputElement>(null);

  const evaluate = (text: string) => {
    setRaw(text);
    setImported(false);
    setResult(text.trim() ? validateDeckJson(text) : null);
  };

  const evaluateBackup = (text: string) => {
    setBackupText(text);
    setBackupRestored(false);
    if (!text.trim()) {
      setBackupPreview(null);
      setBackupError(null);
      return;
    }
    const checked = previewBackup(text);
    if (checked.ok) {
      setBackupPreview(checked.preview);
      setBackupError(null);
    } else {
      setBackupPreview(null);
      setBackupError(checked.error);
    }
  };

  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const addCustomSubject = () => {
    const value = customSubject.trim();
    if (!value) return;
    if (!settings.focusSubjects.includes(value)) {
      updateSettings({ focusSubjects: [...settings.focusSubjects, value] });
    }
    setCustomSubject("");
  };

  const go = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const finish = (to: "/dashboard" | "/generate" | "/format" | "/decks") => {
    completeOnboarding();
    navigate({ to });
  };

  const doImport = () => {
    if (!result?.ok || !result.deck) return;
    addDeck(result.deck);
    setImported(true);
    setBackupRestored(false);
    toast.success(`Imported "${result.deck.title}"`);
  };

  const restoreBackup = () => {
    if (!backupText.trim() || !backupPreview) return;
    const ok = importState(backupText);
    if (!ok) {
      toast.error("That file isn't a valid Knowly backup");
      return;
    }
    setBackupRestored(true);
    setImported(false);
    toast.success(`Backup restored — ${backupPreview.decks} decks, ${backupPreview.cards} cards`);
  };

  const last = STEP_META.length - 1;
  const progress = ((step + 1) / STEP_META.length) * 100;
  const StepIcon = STEP_META[step].icon;
  const librarySummary = backupRestored
    ? "Backup restored"
    : imported
      ? "Deck imported"
      : "Fresh workspace";
  const shortStep = step === 0 || step === 1 || step === 2 || step === 7;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Soft forge backdrop behind the setup frame. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="anim-aurora landing-aurora absolute -top-40 left-1/2 h-[30rem] w-[60rem] max-w-none -translate-x-1/2 opacity-40 blur-3xl" />
        <div className="grid-forge absolute inset-0 opacity-[0.035] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent_75%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--primary),transparent)] opacity-60" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6">
        <div className="relative rounded-[1.75rem] bg-gradient-to-br from-primary/60 via-border to-primary/30 p-px shadow-[0_35px_100px_-45px_rgba(15,23,42,0.6)]">
          <div className="grid w-full overflow-hidden rounded-[calc(1.75rem-1px)] bg-background lg:h-[min(780px,calc(100vh-6.5rem))] lg:grid-cols-[0.82fr_1.18fr]">
            <aside className="relative flex min-h-64 flex-col overflow-hidden bg-slate-950 p-6 text-white lg:min-h-0 lg:p-8">
              <div
                aria-hidden
                className="absolute -right-24 -top-20 size-72 rounded-full bg-primary/50 blur-3xl"
              />
              <div
                aria-hidden
                className="absolute -bottom-24 -left-20 size-64 rounded-full bg-cyan-400/30 blur-3xl"
              />
              <div
                aria-hidden
                className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]"
              />

              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/65">
                  <Sparkles className="size-3.5" />
                  Knowly · Setup
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium tabular-nums text-white/55">
                  {String(step + 1).padStart(2, "0")} / {String(STEP_META.length).padStart(2, "0")}
                </span>
              </div>

              <div className="relative mt-6 flex flex-1 flex-col items-center justify-center">
                <div className="relative">
                  <div
                    aria-hidden
                    className="absolute inset-0 scale-125 rounded-full bg-primary/25 blur-2xl"
                  />
                  <div className="relative grid size-24 place-items-center rounded-[1.75rem] border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl lg:size-32 lg:rounded-[2rem]">
                    <div
                      aria-hidden
                      className="absolute inset-3 rounded-[1.35rem] border border-white/10 lg:rounded-[1.45rem]"
                    />
                    <StepIcon className="relative size-10 lg:size-14" strokeWidth={1.4} />
                  </div>
                  <span className="absolute -left-16 top-1 hidden rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white/75 shadow-lg backdrop-blur sm:block">
                    Local-first
                  </span>
                  <span className="absolute -right-14 bottom-1 hidden rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-medium text-cyan-100/80 shadow-lg backdrop-blur sm:block">
                    JSON backup
                  </span>
                  <span className="absolute -right-10 -top-5 hidden rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white/70 shadow-lg backdrop-blur sm:block">
                    8-step setup
                  </span>
                </div>
                <div className="mt-5 text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40">
                    Now setting up
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold text-white">
                    {STEP_META[step].label}
                  </p>
                </div>
              </div>

              <div className="relative mt-4 hidden rounded-2xl border border-white/10 bg-white/[0.045] p-3 backdrop-blur sm:block">
                <div className="flex items-center gap-3">
                  <div className="relative grid size-11 shrink-0 place-items-center">
                    <svg
                      viewBox="0 0 36 36"
                      className="absolute inset-0 size-full -rotate-90 text-primary"
                      aria-hidden
                    >
                      <circle
                        cx="18"
                        cy="18"
                        r="15.5"
                        fill="none"
                        stroke="rgba(255,255,255,0.14)"
                        strokeWidth="3"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="15.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${Math.max(1, progress * 0.974)} 100`}
                        className="transition-all duration-500 ease-out"
                      />
                    </svg>
                    <span className="text-[10px] font-semibold tabular-nums text-white">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white">Setup progress</p>
                    <p className="mt-0.5 text-[10px] text-white/50">
                      {step + 1} of {STEP_META.length} steps
                    </p>
                  </div>
                </div>
              </div>

              <p className="relative mt-3 hidden text-[9px] font-semibold uppercase tracking-[0.18em] text-white/30 lg:block">
                Jump to a step
              </p>
              <nav
                aria-label="Setup steps"
                className="relative mt-1.5 hidden flex-col gap-0.5 lg:flex lg:min-h-0 lg:overflow-y-auto"
              >
                {STEP_META.map((s, i) => {
                  const done = i < step;
                  const active = i === step;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => go(i)}
                      aria-current={active ? "step" : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-1.5 text-left text-[13px] transition-colors",
                        active && "bg-white/10 text-white ring-1 ring-white/15",
                        done && "text-white/65 hover:bg-white/5 hover:text-white",
                        !done && !active && "text-white/45 hover:bg-white/5 hover:text-white/80",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-full border",
                          active
                            ? "border-white/30 bg-white/15"
                            : done
                              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                              : "border-white/15",
                        )}
                      >
                        {done ? <Check className="size-3" /> : <s.icon className="size-3" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{s.label}</span>
                      {active && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                    </button>
                  );
                })}
              </nav>

              <div className="relative mt-3 hidden items-start gap-2 text-[11px] leading-5 text-white/55 sm:flex lg:mt-auto">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-white/40" />
                <span>
                  Decks, notes, courses and progress live in this browser. Export a JSON backup
                  whenever you want a portable copy.
                </span>
              </div>
            </aside>

            <section className="relative flex min-h-0 flex-col overflow-hidden bg-background">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(77,163,255,0.1),transparent_45%)]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:20px_20px]"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -right-1 top-20 font-display text-[9rem] font-black leading-none text-foreground/[0.025]"
              >
                {String(step + 1).padStart(2, "0")}
              </span>

              <div className="relative h-1 shrink-0 bg-border/60">
                <div
                  className="h-full bg-[linear-gradient(90deg,var(--primary),var(--primary-glow))] shadow-[0_0_10px_var(--primary)] transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="relative shrink-0 border-b border-border px-5 py-4 sm:px-8">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary shadow-[0_10px_28px_-14px_var(--primary)] ring-1 ring-primary/25">
                      <StepIcon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                        {STEP_META[step].label}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">
                        {librarySummary} · Everything stays on this device
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                key={step}
                className={cn(
                  "relative min-h-0 flex-1 p-5 sm:p-8 lg:overflow-y-auto",
                  dir > 0 ? "anim-fade-up" : "anim-fade-in",
                )}
              >
                <div
                  className={cn(
                    "flex min-h-full flex-col",
                    shortStep ? "justify-center" : "justify-start",
                  )}
                >
                  {step === 0 && (
                    <div>
                      <span className="anim-pop inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                        <HardDrive className="size-3.5" /> Local workspace
                      </span>
                      <h1 className="mt-4 font-display text-3xl leading-tight tracking-tight sm:text-4xl">
                        {settings.displayName
                          ? `Welcome back, ${settings.displayName}.`
                          : "Welcome to your study forge."}
                      </h1>
                      <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                        Knowly keeps decks, questions, XP, streaks, notes and quiz history in this
                        browser. Nothing is uploaded. Use JSON export when you want a backup or to
                        move a library to another machine.
                      </p>
                      <ul className="stagger mt-8 grid gap-3 text-sm sm:grid-cols-3">
                        {[
                          "No account — this browser holds the library",
                          "JSON backups, deck imports and snapshots",
                          "Built to feel like a desktop app",
                        ].map((p) => (
                          <li
                            key={p}
                            className="flex items-start gap-3 rounded-xl border border-border bg-surface/60 p-4"
                          >
                            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {step === 1 && (
                    <div>
                      <h1 className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">
                        There's no AI inside Knowly
                      </h1>
                      <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                        It never calls an AI service. Instead it writes a precise prompt for you to
                        run in whichever model you already use — so you control cost, privacy and
                        quality.
                      </p>
                      <div className="stagger mt-8 grid gap-3 sm:grid-cols-4">
                        {[
                          { icon: Wand2, label: "Forge a prompt" },
                          { icon: ClipboardCopy, label: "Run it in your AI" },
                          { icon: FileJson, label: "Import the JSON" },
                          { icon: GraduationCap, label: "Study & quiz" },
                        ].map((s, i) => (
                          <div
                            key={s.label}
                            className="hover-lift relative rounded-xl border border-border bg-surface/60 p-4 text-center"
                          >
                            <span className="absolute left-2 top-2 text-[10px] font-bold text-muted-foreground">
                              {i + 1}
                            </span>
                            <s.icon className="mx-auto size-5 text-primary" />
                            <p className="mt-2 text-xs font-medium">{s.label}</p>
                          </div>
                        ))}
                      </div>
                      <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
                        {[
                          "Gemini, ChatGPT, Claude, OpenRouter, Ollama — your choice",
                          "No API keys are ever stored here",
                          "Import validates every field and flags problems",
                        ].map((p) => (
                          <li key={p} className="flex items-start gap-3">
                            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {step === 2 && (
                    <div>
                      <h1 className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">
                        What you get once a deck lands
                      </h1>
                      <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                        Every deck instantly becomes four different ways to practise — plus the
                        numbers to prove it's working.
                      </p>
                      <div className="stagger mt-8 grid gap-3 sm:grid-cols-2">
                        {[
                          {
                            icon: GraduationCap,
                            t: "Study Mode",
                            d: "Keyboard-driven reveal, notes, bookmarks and mastery.",
                          },
                          {
                            icon: FileJson,
                            t: "Quiz Mode",
                            d: "Timed, filtered quizzes with a rich visual report.",
                          },
                          {
                            icon: Swords,
                            t: "Deck Arena",
                            d: "Lives, combos and XP you keep when the round ends.",
                          },
                          {
                            icon: BarChart3,
                            t: "Analytics",
                            d: "Concept heatmaps, weak topics, streaks and levels.",
                          },
                        ].map((f) => (
                          <div
                            key={f.t}
                            className="hover-lift group rounded-xl border border-border bg-surface/60 p-5"
                          >
                            <f.icon className="size-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                            <p className="mt-3 text-sm font-semibold">{f.t}</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{f.d}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-8">
                      <div>
                        <h1 className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">
                          Who's studying?
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                          Just a name and a face — everything here is optional and stays on this
                          device.
                        </p>
                      </div>

                      <div className="flex flex-col gap-6 rounded-xl border border-border bg-surface/60 p-5 sm:flex-row sm:items-center">
                        <div className="anim-pop grid size-20 shrink-0 place-items-center rounded-3xl border border-primary/40 bg-primary/10 text-4xl">
                          {settings.avatarEmoji || "🌊"}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <Label className="text-xs">What should we call you?</Label>
                          <Input
                            value={settings.displayName}
                            onChange={(e) => updateSettings({ displayName: e.target.value })}
                            placeholder="Your name"
                            maxLength={40}
                            className="text-base"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Used on your dashboard, reports and arena results.
                          </p>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Pick an avatar</Label>
                        <div className="stagger mt-2 grid grid-cols-6 gap-2 sm:grid-cols-12">
                          {AVATAR_EMOJIS.map((e) => (
                            <button
                              key={e}
                              onClick={() => updateSettings({ avatarEmoji: e })}
                              className={cn(
                                "press grid aspect-square min-h-[44px] place-items-center rounded-xl border border-border text-lg transition-all hover:scale-110",
                                settings.avatarEmoji === e &&
                                  "scale-110 border-primary bg-primary/15",
                              )}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">School / institution</Label>
                          <Input
                            value={settings.school}
                            onChange={(e) => updateSettings({ school: e.target.value })}
                            placeholder="Optional"
                            maxLength={80}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Level</Label>
                          <select
                            value={settings.gradeLevel}
                            onChange={(e) => updateSettings({ gradeLevel: e.target.value })}
                            className="h-9 w-full rounded-md border border-border bg-surface/60 px-3 text-sm outline-none focus-visible:border-primary"
                          >
                            <option value="">Prefer not to say</option>
                            {GRADE_LEVELS.map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-8">
                      <div>
                        <h1 className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">
                          Shape your study plan
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                          Pick as many or as few as you like — it tunes your goals, reports and
                          weak-topic hints.
                        </p>
                      </div>

                      <div className="rounded-xl border border-border bg-surface/60 p-5">
                        <Label className="text-xs">
                          Subjects you're focusing on
                          {settings.focusSubjects.length > 0 && (
                            <span className="ml-2 text-primary">
                              {settings.focusSubjects.length} selected
                            </span>
                          )}
                        </Label>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {[
                            ...SUBJECT_SUGGESTIONS,
                            ...settings.focusSubjects.filter(
                              (s) => !SUBJECT_SUGGESTIONS.includes(s),
                            ),
                          ].map((sub) => (
                            <Chip
                              key={sub}
                              active={settings.focusSubjects.includes(sub)}
                              onClick={() =>
                                updateSettings({
                                  focusSubjects: toggle(settings.focusSubjects, sub),
                                })
                              }
                            >
                              {sub}
                            </Chip>
                          ))}
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Input
                            value={customSubject}
                            onChange={(e) => setCustomSubject(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addCustomSubject();
                              }
                            }}
                            placeholder="Add your own subject"
                            maxLength={40}
                            className="max-w-xs"
                          />
                          <Button variant="outline" className="press" onClick={addCustomSubject}>
                            <Plus /> Add
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-border bg-surface/60 p-5">
                          <Label className="text-xs">Why are you studying?</Label>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {STUDY_REASONS.map((r) => (
                              <Chip
                                key={r}
                                active={settings.studyReason === r}
                                onClick={() =>
                                  updateSettings({
                                    studyReason: settings.studyReason === r ? "" : r,
                                  })
                                }
                              >
                                {r}
                              </Chip>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border bg-surface/60 p-5">
                          <Label className="flex items-center gap-2 text-xs">
                            <Clock className="size-3.5 text-primary" /> When do you usually study?
                          </Label>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {STUDY_TIMES.map((t) => (
                              <Chip
                                key={t}
                                active={studyTime === t}
                                onClick={() => setStudyTime(studyTime === t ? "" : t)}
                              >
                                {t}
                              </Chip>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-surface/60 p-5">
                        <Label className="text-xs">Session style</Label>
                        <div className="stagger mt-3 grid gap-3 sm:grid-cols-4">
                          {SESSION_LENGTHS.map((s) => (
                            <button
                              key={s.label}
                              onClick={() => updateSettings({ dailyGoal: s.goal })}
                              className={cn(
                                "press hover-lift rounded-xl border border-border bg-background/50 p-3 text-left transition-all",
                                settings.dailyGoal === s.goal && "border-primary bg-primary/12",
                              )}
                            >
                              <p className="text-sm font-semibold">{s.label}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground">{s.detail}</p>
                            </button>
                          ))}
                        </div>
                        <div className="mt-5 space-y-2">
                          <Label className="text-xs">
                            Daily goal — {settings.dailyGoal} questions
                          </Label>
                          <input
                            type="range"
                            min={5}
                            max={200}
                            step={5}
                            value={settings.dailyGoal}
                            onChange={(e) => updateSettings({ dailyGoal: Number(e.target.value) })}
                            className="w-full accent-[var(--primary)]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 5 && (
                    <div className="space-y-8">
                      <div>
                        <h1 className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">
                          Make it look right
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                          Choose a colour theme and comfort settings. You can change all of this
                          later.
                        </p>
                      </div>

                      <div className="rounded-xl border border-border bg-surface/60 p-5">
                        <Label className="text-xs">Colour theme</Label>
                        <div className="mt-3">
                          <ThemePicker compact />
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-surface/60 p-5">
                        <Label className="text-xs">Accent colour</Label>
                        <div className="stagger mt-3 grid gap-3 sm:grid-cols-3">
                          {ACCENTS.map((a) => (
                            <button
                              key={a.id}
                              onClick={() => updateSettings({ accent: a.id })}
                              className={cn(
                                "press hover-lift flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3 text-left",
                                settings.accent === a.id && "border-primary bg-primary/12",
                              )}
                            >
                              <span
                                className="size-7 shrink-0 rounded-lg"
                                style={{
                                  background: `linear-gradient(135deg, ${a.value}, ${a.glow})`,
                                }}
                              />
                              <span className="text-sm font-medium">{a.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-border bg-surface/60 p-5">
                          <Label className="text-xs">Layout density</Label>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(["compact", "cozy", "spacious"] as const).map((d) => (
                              <Chip
                                key={d}
                                active={settings.density === d}
                                onClick={() => updateSettings({ density: d })}
                              >
                                {d[0].toUpperCase() + d.slice(1)}
                              </Chip>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border bg-surface/60 p-5">
                          <Label className="text-xs">Comfort toggles</Label>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {[
                              {
                                label: "Reduced motion",
                                desc: "Calmer transitions",
                                on: settings.reducedMotion,
                                set: () =>
                                  updateSettings({ reducedMotion: !settings.reducedMotion }),
                              },
                              {
                                label: "High contrast",
                                desc: "Stronger borders and text",
                                on: settings.highContrast,
                                set: () => updateSettings({ highContrast: !settings.highContrast }),
                              },
                              {
                                label: "XP and levels",
                                desc: "Gamified progress",
                                on: settings.xpEnabled,
                                set: () => updateSettings({ xpEnabled: !settings.xpEnabled }),
                              },
                              {
                                label: "Strong focus indicators",
                                desc: "Clear outline when tabbing",
                                on: settings.focusIndicators,
                                set: () =>
                                  updateSettings({ focusIndicators: !settings.focusIndicators }),
                              },
                            ].map((o) => (
                              <button
                                key={o.label}
                                onClick={o.set}
                                className={cn(
                                  "press flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 p-3 text-left",
                                  o.on && "border-primary/60 bg-primary/10",
                                )}
                              >
                                <span>
                                  <span className="block text-sm font-medium">{o.label}</span>
                                  <span className="block text-[11px] text-muted-foreground">
                                    {o.desc}
                                  </span>
                                </span>
                                <span
                                  className={cn(
                                    "grid size-5 shrink-0 place-items-center rounded border border-border",
                                    o.on && "border-primary bg-primary text-primary-foreground",
                                  )}
                                >
                                  {o.on && <Check className="size-3" />}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 6 && (
                    <div className="space-y-6">
                      <div>
                        <h1 className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">
                          Bring your library
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                          Import a single deck from AI-generated JSON — or restore a full Knowly
                          backup with decks, progress, settings, and history. Otherwise skip; you
                          can do either at any time.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setLibraryMode("deck")}
                          aria-pressed={libraryMode === "deck"}
                          className={cn(
                            "press group flex items-center gap-4 rounded-2xl border border-border bg-surface/60 p-5 text-left transition-all",
                            libraryMode === "deck" && "border-primary bg-primary/12",
                          )}
                        >
                          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25 transition-transform duration-300 group-hover:scale-110">
                            <FileJson className="size-5" />
                          </span>
                          <span>
                            <span className="block text-sm font-semibold">Import a deck</span>
                            <span className="block text-xs text-muted-foreground">
                              Single AI-generated deck
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setLibraryMode("backup")}
                          aria-pressed={libraryMode === "backup"}
                          className={cn(
                            "press group flex items-center gap-4 rounded-2xl border border-border bg-surface/60 p-5 text-left transition-all",
                            libraryMode === "backup" && "border-primary bg-primary/12",
                          )}
                        >
                          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25 transition-transform duration-300 group-hover:scale-110">
                            <DatabaseBackup className="size-5" />
                          </span>
                          <span>
                            <span className="block text-sm font-semibold">Restore backup</span>
                            <span className="block text-xs text-muted-foreground">
                              Full library and progress
                            </span>
                          </span>
                        </button>
                      </div>

                      {libraryMode === "deck" ? (
                        <div className="space-y-4 rounded-xl border border-border bg-surface/60 p-5">
                          <Button
                            variant="outline"
                            className="press"
                            onClick={() => fileRef.current?.click()}
                          >
                            <Upload /> Choose a .json file
                          </Button>
                          <input
                            ref={fileRef}
                            type="file"
                            accept="application/json,.json"
                            hidden
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (!file) return;
                              evaluate(await file.text());
                            }}
                          />

                          <Textarea
                            value={raw}
                            onChange={(e) => evaluate(e.target.value)}
                            placeholder={
                              'Or paste deck JSON here — { "title": "…", "questions": [ … ] }'
                            }
                            className="min-h-40 font-mono text-xs"
                          />

                          {result && (
                            <div
                              className={cn(
                                "anim-fade-up rounded-xl border p-4 text-sm",
                                result.ok
                                  ? "border-success/50 bg-success/10"
                                  : "border-destructive/50 bg-destructive/10",
                              )}
                            >
                              <p className="flex items-center gap-2 font-medium">
                                {result.ok ? (
                                  <CheckCircle2 className="size-4 text-success" />
                                ) : (
                                  <AlertTriangle className="size-4 text-destructive" />
                                )}
                                {result.ok
                                  ? `Valid deck — ${result.deck?.questions.length} questions`
                                  : "This JSON can't be imported yet"}
                              </p>
                              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                {[...result.errors, ...result.warnings].slice(0, 6).map((m) => (
                                  <li key={m}>· {m}</li>
                                ))}
                              </ul>
                              {result.ok && (
                                <Button
                                  className="press mt-4"
                                  disabled={imported}
                                  onClick={doImport}
                                >
                                  {imported ? "Imported" : "Import this deck"}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4 rounded-xl border border-border bg-surface/60 p-5">
                          <p className="text-sm text-muted-foreground">
                            Choose the backup file exported from Settings or Snapshots (for example,{" "}
                            <span className="font-mono">knowly-backup-2026-10-16.json</span>
                            ). Restoring replaces everything currently in this browser.
                          </p>
                          <Button
                            variant="outline"
                            className="press"
                            onClick={() => backupFileRef.current?.click()}
                          >
                            <Upload /> Choose a backup file
                          </Button>
                          <input
                            ref={backupFileRef}
                            type="file"
                            accept="application/json,.json"
                            hidden
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (!file) return;
                              evaluateBackup(await file.text());
                            }}
                          />

                          {backupError && (
                            <div className="anim-fade-up rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm">
                              <p className="flex items-center gap-2 font-medium">
                                <AlertTriangle className="size-4 text-destructive" />
                                {backupError}
                              </p>
                            </div>
                          )}

                          {backupPreview && (
                            <div className="anim-fade-up rounded-xl border border-success/50 bg-success/10 p-4 text-sm">
                              <p className="flex items-center gap-2 font-medium">
                                <CheckCircle2 className="size-4 text-success" />
                                Valid backup
                                {backupPreview.owner ? ` — ${backupPreview.owner}` : ""}
                              </p>
                              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                                <div className="rounded-lg border border-border bg-background/50 p-3">
                                  <dt className="text-muted-foreground">Decks</dt>
                                  <dd className="mt-1 text-base font-semibold">
                                    {backupPreview.decks}
                                  </dd>
                                </div>
                                <div className="rounded-lg border border-border bg-background/50 p-3">
                                  <dt className="text-muted-foreground">Cards</dt>
                                  <dd className="mt-1 text-base font-semibold">
                                    {backupPreview.cards}
                                  </dd>
                                </div>
                                <div className="rounded-lg border border-border bg-background/50 p-3">
                                  <dt className="text-muted-foreground">Sessions</dt>
                                  <dd className="mt-1 text-base font-semibold">
                                    {backupPreview.sessions}
                                  </dd>
                                </div>
                                <div className="rounded-lg border border-border bg-background/50 p-3">
                                  <dt className="text-muted-foreground">Lifetime XP</dt>
                                  <dd className="mt-1 text-base font-semibold">
                                    {backupPreview.xp.toLocaleString()}
                                  </dd>
                                </div>
                              </dl>
                              <Button
                                className="press mt-4"
                                disabled={backupRestored}
                                onClick={restoreBackup}
                              >
                                {backupRestored ? "Restored" : "Restore this backup"}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {step === 7 && (
                    <div className="text-center">
                      <div className="anim-pop mx-auto grid size-20 place-items-center rounded-[28px] bg-gradient-to-br from-primary/40 via-primary/15 to-transparent text-primary ring-1 ring-primary/40 shadow-[0_18px_50px_-20px_var(--primary)]">
                        <Rocket className="size-9" />
                      </div>
                      <h1 className="mt-6 font-display text-3xl leading-tight tracking-tight sm:text-4xl">
                        The forge is lit{settings.displayName ? `, ${settings.displayName}` : ""}.
                      </h1>
                      <p className="mx-auto mt-4 max-w-md text-muted-foreground">
                        {backupRestored
                          ? "Your backup is restored. Jump back into your dashboard and keep studying."
                          : imported
                            ? "Your first deck is in. Jump into your library and start a session."
                            : "Head to the Prompt Forge to build your first deck — it stays on this device, and you can export it as JSON any time."}
                      </p>
                      <div className="anim-fade-up mt-6 flex flex-wrap justify-center gap-2 text-xs">
                        <span className="rounded-full border border-border bg-surface/60 px-3 py-1.5 text-muted-foreground">
                          {settings.focusSubjects.length > 0
                            ? `${settings.focusSubjects.length} subject${settings.focusSubjects.length === 1 ? "" : "s"}`
                            : "No subjects picked"}
                        </span>
                        <span className="rounded-full border border-border bg-surface/60 px-3 py-1.5 text-muted-foreground">
                          {settings.dailyGoal} questions / day
                        </span>
                        <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-primary">
                          {librarySummary}
                        </span>
                      </div>
                      <div className="anim-fade-up mt-8 flex flex-wrap justify-center gap-3 [animation-delay:120ms]">
                        <Button
                          className="press anim-glow"
                          onClick={() =>
                            finish(
                              backupRestored ? "/dashboard" : imported ? "/decks" : "/generate",
                            )
                          }
                        >
                          {backupRestored
                            ? "Go to dashboard"
                            : imported
                              ? "Go to my library"
                              : "Open Prompt Forge"}{" "}
                          <ArrowRight />
                        </Button>
                        <Button
                          variant="outline"
                          className="press"
                          onClick={() => finish(backupRestored ? "/decks" : "/dashboard")}
                        >
                          {backupRestored ? "Browse decks" : "Go to dashboard"}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.06] p-4">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Sparkles className="size-4" />
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                        Good to know
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {STEP_TIPS[step]}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative shrink-0 border-t border-border bg-surface/40 px-5 py-4 sm:px-8">
                <div className="mb-3 flex gap-1.5" aria-hidden>
                  {STEP_META.map((_, i) => (
                    <span
                      key={i}
                      className={
                        i === step
                          ? "h-1.5 w-8 rounded-full bg-primary transition-all duration-300"
                          : "h-1.5 w-3 rounded-full bg-border transition-all duration-300"
                      }
                    />
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => finish("/dashboard")}
                    className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Skip setup
                  </button>
                  <div className="flex items-center gap-2">
                    {step > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="press"
                        onClick={() => go(step - 1)}
                      >
                        <ArrowLeft className="size-4" /> Back
                      </Button>
                    )}
                    {step < last ? (
                      <Button size="sm" className="press group" onClick={() => go(step + 1)}>
                        Continue
                        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </Button>
                    ) : (
                      <span className="px-1 text-[11px] text-muted-foreground">You're all set</span>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="anim-fade-in mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <button
            type="button"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
            onClick={() => finish("/format")}
          >
            Show me the JSON format first
          </button>
          <button
            type="button"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
            onClick={() => go(6)}
          >
            I have a deck or backup — bring it now
          </button>
        </div>
      </main>
    </div>
  );
}
