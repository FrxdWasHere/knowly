import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  Flame,
  HardDrive,
  Wand2,
  ClipboardCopy,
  Bot,
  FileJson,
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
import { Logo } from "@/components/brand/logo";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome to Knowly" },
      {
        name: "description",
        content:
          "Set up your Knowly profile, learn the AI-free workflow and import your first deck. Everything stays in this browser until you export it as JSON.",
      },
      { property: "og:title", content: "Welcome to Knowly" },
      {
        property: "og:description",
        content: "Build your profile, generate a prompt with your own AI, import the JSON and start studying.",
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
  { label: "First deck", icon: FileJson },
  { label: "Ready", icon: Rocket },
] as const;

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


function Onboarding() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const { state, completeOnboarding, updateSettings, addDeck } = useKnowly();
  const navigate = useNavigate();
  const settings = state.settings;

  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [imported, setImported] = useState(false);
  const [customSubject, setCustomSubject] = useState("");
  const [studyTime, setStudyTime] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);


  const evaluate = (text: string) => {
    setRaw(text);
    setImported(false);
    setResult(text.trim() ? validateDeckJson(text) : null);
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
    toast.success(`Imported "${result.deck.title}"`);
  };

  const last = STEP_META.length - 1;
  const progress = ((step + 1) / STEP_META.length) * 100;

  return (
    <div className="ocean-premium grid-forge relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--primary),transparent)] opacity-70" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl gap-14 px-6 py-10 lg:py-14">
        {/* Rail */}
        <aside className="anim-fade-up hidden w-64 shrink-0 flex-col border-r border-border pr-10 lg:flex">
          <div className="flex items-center gap-3">
            <Logo className="size-11 shadow-[var(--shadow-forge)]" />
            <div>
              <p className="font-display text-lg font-bold">Knowly</p>
              <p className="text-[11px] text-muted-foreground">Setup</p>
            </div>
          </div>

          <ol className="mt-10 space-y-1">
            {STEP_META.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={s.label}>
                  <button
                    onClick={() => go(i)}
                    className={cn(
                      "press flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm transition-all duration-300",
                      active && "bg-primary/12 text-foreground",
                      !active && "text-muted-foreground hover:bg-surface-2/60",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded border transition-all duration-300",
                        done && "border-success/60 bg-success/15 text-success",
                        active && "scale-110 border-primary bg-primary text-primary-foreground",
                        !done && !active && "border-border",
                      )}
                    >
                      {done ? <Check className="size-3.5" /> : <s.icon className="size-3.5" />}
                    </span>
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-auto border-t border-border pt-5 text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Stored here.</span> Decks, XP and settings
            live in this browser. Export a JSON backup when you want a portable copy.
          </div>
        </aside>

        {/* Card */}
        <main className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="mb-5 flex items-center gap-3 lg:hidden">
            <Logo className="size-9 rounded-xl" />
            <p className="font-display font-bold">Knowly</p>
          </div>

          <div className="mb-5 h-1 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--primary),var(--primary-glow))] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div
            key={step}
            className={cn("panel min-h-[600px] p-7 sm:p-10 lg:p-12", dir > 0 ? "anim-fade-up" : "anim-fade-in")}
          >
            <p className="text-xs font-semibold uppercase text-primary">
              Step {step + 1} of {STEP_META.length} · {STEP_META[step].label}
            </p>

            {step === 0 && (
              <div className="mt-4">
                <span className="anim-pop inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] text-primary">
                  <HardDrive className="size-3.5" /> Local workspace
                </span>
                <h1 className="mt-4 text-3xl font-bold">
                  {settings.displayName ? `Welcome, ${settings.displayName}.` : "Welcome to the forge."}
                </h1>
                <p className="mt-3 text-muted-foreground">
                  Knowly keeps decks, questions, XP, streaks, notes and quiz history in this
                  browser. Nothing is uploaded. Use JSON export when you want a backup or to move
                  a library to another machine.
                </p>
                <ul className="stagger mt-6 space-y-2.5 text-sm">
                  {[
                    "This browser holds the library — no account required",
                    "JSON export and import for backups and sharing decks",
                    "Built to feel like a desktop app",
                  ].map((p) => (
                    <li key={p} className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {step === 1 && (
              <div className="mt-4">
                <h1 className="text-3xl font-bold">There's no AI inside Knowly</h1>
                <p className="mt-3 text-muted-foreground">
                  It never calls an AI service. Instead it writes a precise prompt for you to run in
                  whichever model you already use — so you control cost, privacy and quality.
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
                      className="hover-lift relative rounded-xl border border-border bg-surface-2/60 p-4 text-center"
                    >
                      <span className="absolute left-2 top-2 text-[10px] font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <s.icon className="mx-auto size-5 text-primary" />
                      <p className="mt-2 text-xs font-medium">{s.label}</p>
                    </div>
                  ))}
                </div>
                <ul className="stagger mt-6 space-y-2.5 text-sm">
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
              <div className="mt-4">
                <h1 className="text-3xl font-bold">What you get once a deck lands</h1>
                <p className="mt-3 text-muted-foreground">
                  Every deck instantly becomes four different ways to practise — plus the numbers to
                  prove it's working.
                </p>
                <div className="stagger mt-6 grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: GraduationCap, t: "Study Mode", d: "Keyboard-driven reveal, notes, bookmarks and mastery." },
                    { icon: FileJson, t: "Quiz Mode", d: "Timed, filtered quizzes with a rich visual report." },
                    { icon: Swords, t: "Deck Arena", d: "Lives, combos and XP you keep when the round ends." },
                    { icon: BarChart3, t: "Analytics", d: "Concept heatmaps, weak topics, streaks and levels." },
                  ].map((f) => (
                    <div key={f.t} className="hover-lift rounded-xl border border-border bg-surface-2/60 p-4">
                      <f.icon className="size-5 text-primary" />
                      <p className="mt-2 text-sm font-semibold">{f.t}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{f.d}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="mt-4 space-y-8">
                <div>
                  <h1 className="text-3xl font-bold">Who's studying?</h1>
                  <p className="mt-3 text-muted-foreground">
                    Just a name and a face — everything here is optional and stays on this device.
                  </p>
                </div>

                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
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
                  <div className="stagger mt-2 grid grid-cols-8 gap-2 sm:grid-cols-12">
                    {AVATAR_EMOJIS.map((e) => (
                      <button
                        key={e}
                        onClick={() => updateSettings({ avatarEmoji: e })}
                        className={cn(
                          "press grid aspect-square place-items-center rounded-xl border border-border text-lg transition-all hover:scale-110",
                          settings.avatarEmoji === e && "scale-110 border-primary bg-primary/15",
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
                      className="h-9 w-full rounded-md border border-border bg-surface-2/60 px-3 text-sm outline-none focus-visible:border-primary"
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
              <div className="mt-4 space-y-8">
                <div>
                  <h1 className="text-3xl font-bold">Shape your study plan</h1>
                  <p className="mt-3 text-muted-foreground">
                    Pick as many or as few as you like — it tunes your goals, reports and weak-topic
                    hints.
                  </p>
                </div>

                <div>
                  <Label className="text-xs">
                    Subjects you're focusing on
                    {settings.focusSubjects.length > 0 && (
                      <span className="ml-2 text-primary">{settings.focusSubjects.length} selected</span>
                    )}
                  </Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      ...SUBJECT_SUGGESTIONS,
                      ...settings.focusSubjects.filter((s) => !SUBJECT_SUGGESTIONS.includes(s)),
                    ].map((sub) => (
                      <Chip
                        key={sub}
                        active={settings.focusSubjects.includes(sub)}
                        onClick={() =>
                          updateSettings({ focusSubjects: toggle(settings.focusSubjects, sub) })
                        }
                      >
                        {sub}
                      </Chip>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
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

                <div>
                  <Label className="text-xs">Why are you studying?</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {STUDY_REASONS.map((r) => (
                      <Chip
                        key={r}
                        active={settings.studyReason === r}
                        onClick={() =>
                          updateSettings({ studyReason: settings.studyReason === r ? "" : r })
                        }
                      >
                        {r}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-2 text-xs">
                    <Clock className="size-3.5 text-primary" /> When do you usually study?
                  </Label>
                  <div className="mt-2 flex flex-wrap gap-2">
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

                <div>
                  <Label className="text-xs">Session style</Label>
                  <div className="stagger mt-2 grid gap-3 sm:grid-cols-4">
                    {SESSION_LENGTHS.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => updateSettings({ dailyGoal: s.goal })}
                        className={cn(
                          "press hover-lift rounded-xl border border-border bg-surface-2/60 p-3 text-left transition-all",
                          settings.dailyGoal === s.goal && "border-primary bg-primary/12",
                        )}
                      >
                        <p className="text-sm font-semibold">{s.label}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{s.detail}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Daily goal — {settings.dailyGoal} questions</Label>
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
            )}

            {step === 5 && (
              <div className="mt-4 space-y-8">
                <div>
                  <h1 className="text-3xl font-bold">Make it look right</h1>
                  <p className="mt-3 text-muted-foreground">
                    Choose a colour theme and comfort settings. You can change all of this later.
                  </p>
                </div>

                <div>
                  <Label className="text-xs">Colour theme</Label>
                  <div className="mt-2">
                    <ThemePicker compact />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Accent colour</Label>
                  <div className="stagger mt-2 grid gap-3 sm:grid-cols-3">
                    {ACCENTS.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => updateSettings({ accent: a.id })}
                        className={cn(
                          "press hover-lift flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 p-3 text-left",
                          settings.accent === a.id && "border-primary bg-primary/12",
                        )}
                      >
                        <span
                          className="size-7 shrink-0 rounded-lg"
                          style={{ background: `linear-gradient(135deg, ${a.value}, ${a.glow})` }}
                        />
                        <span className="text-sm font-medium">{a.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Layout density</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
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

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      label: "Reduced motion",
                      desc: "Calmer transitions",
                      on: settings.reducedMotion,
                      set: () => updateSettings({ reducedMotion: !settings.reducedMotion }),
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
                      set: () => updateSettings({ focusIndicators: !settings.focusIndicators }),
                    },
                  ].map((o) => (
                    <button
                      key={o.label}
                      onClick={o.set}
                      className={cn(
                        "press flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/60 p-3 text-left",
                        o.on && "border-primary/60 bg-primary/10",
                      )}
                    >
                      <span>
                        <span className="block text-sm font-medium">{o.label}</span>
                        <span className="block text-[11px] text-muted-foreground">{o.desc}</span>
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
            )}

            {step === 6 && (

              <div className="mt-4 space-y-4">
                <h1 className="text-3xl font-bold">Import your first deck</h1>
                <p className="text-muted-foreground">
                  Already have Knowly JSON from your AI? Drop it in now. Otherwise skip — you can
                  import at any time.
                </p>

                <Button variant="outline" className="press" onClick={() => fileRef.current?.click()}>
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
                  placeholder={'Or paste deck JSON here — { "title": "…", "questions": [ … ] }'}
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
                      <Button className="press mt-4" disabled={imported} onClick={doImport}>
                        {imported ? "Imported" : "Import this deck"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 7 && (
              <div className="mt-4 text-center">
                <div className="anim-pop mx-auto grid size-16 place-items-center rounded-3xl bg-primary text-primary-foreground shadow-[var(--shadow-forge)]">
                  <Rocket className="size-8" />
                </div>
                <h1 className="mt-5 text-3xl font-bold">
                  The forge is lit{settings.displayName ? `, ${settings.displayName}` : ""}.
                </h1>
                <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                  {imported
                    ? "Your first deck is in. Jump into your library and start a session."
                    : "Head to the Prompt Forge to build your first deck — it stays on this device, and you can export it as JSON any time."}
                </p>
                <div className="anim-fade-up mt-8 flex flex-wrap justify-center gap-3">
                  <Button className="press anim-glow" onClick={() => finish(imported ? "/decks" : "/generate")}>
                    {imported ? "Go to my library" : "Open Prompt Forge"} <ArrowRight />
                  </Button>
                  <Button variant="outline" className="press" onClick={() => finish("/dashboard")}>
                    Go to dashboard
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-10 flex items-center justify-between gap-4">
              <div className="flex gap-1.5">
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
              <div className="flex gap-2">
                {step > 0 && (
                  <Button variant="ghost" className="press" onClick={() => go(step - 1)}>
                    <ArrowLeft /> Back
                  </Button>
                )}
                {step < last && (
                  <Button className="press" onClick={() => go(step + 1)}>
                    Continue <ArrowRight />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="anim-fade-in mt-6 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <button className="underline-offset-4 hover:underline" onClick={() => finish("/dashboard")}>
              Skip and go to dashboard
            </button>
            <button className="underline-offset-4 hover:underline" onClick={() => finish("/format")}>
              Show me the JSON format first
            </button>
            <button className="underline-offset-4 hover:underline" onClick={() => go(6)}>
              I already have JSON — import it now
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
