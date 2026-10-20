import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  ChevronRight,
  DatabaseBackup,
  FileJson,
  GripVertical,
  HardDrive,
  History,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Timer,
  Trophy,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKnowly } from "@/store/knowly";
import { Logo } from "@/components/brand/logo";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Knowly — Your local study workspace" },
      {
        name: "description",
        content:
          "Build decks with your own AI, study with spaced repetition, quizzes and exams, track progress, and restore everything from a portable JSON backup. No account. No cloud.",
      },
      { property: "og:title", content: "Knowly — Your local study workspace" },
      {
        property: "og:description",
        content:
          "Decks, SRS reviews, quizzes, exams, reports and portable backups — all on your device.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const studyModes = [
  {
    icon: BrainCircuit,
    title: "Guided study",
    body: "Reveal answers, take notes, bookmark trouble cards, and mark mastery as you go.",
  },
  {
    icon: Timer,
    title: "Quizzes & exams",
    body: "Timed, filtered quizzes plus full exam simulations with pass/fail reports.",
  },
  {
    icon: Trophy,
    title: "Streaks & XP",
    body: "Daily goals, combos, levels, and achievements keep momentum visible.",
  },
  {
    icon: BarChart3,
    title: "Reports & weak spots",
    body: "Concept accuracy, leech cards, forecasts, and printable progress reports.",
  },
];

const benefits = [
  {
    icon: History,
    title: "Remember longer",
    body: "Spaced repetition schedules each card for the moment you are about to forget it — with forecasts for the days ahead.",
  },
  {
    icon: Timer,
    title: "Spend review time well",
    body: "Daily due queues, focused quizzes, and timed exams keep sessions short, deliberate, and exam-shaped.",
  },
  {
    icon: BarChart3,
    title: "Fix the weak topics first",
    body: "Concept accuracy, weak spots, and leech cards point at the exact material costing you marks.",
  },
  {
    icon: Trophy,
    title: "Stay consistent",
    body: "Streaks, daily goals, XP, levels, and achievements make steady progress visible on hard days.",
  },
  {
    icon: BrainCircuit,
    title: "Learn actively, not passively",
    body: "Ordering, matching, word banks, flashcards, and written answers force recall instead of rereading.",
  },
  {
    icon: ShieldCheck,
    title: "Keep control of your work",
    body: "Your library lives locally with snapshots and portable backups — no account, no lock-in, no uploads.",
  },
];

const steps = [
  {
    icon: Wand2,
    n: "01",
    title: "Forge the prompt",
    body: "Pick subject, level, and question mix. Knowly writes a precise generation brief.",
  },
  {
    icon: Sparkles,
    n: "02",
    title: "Use your own AI",
    body: "Run it in ChatGPT, Gemini, Claude, or a local model. No keys stored here.",
  },
  {
    icon: FileJson,
    n: "03",
    title: "Import the deck",
    body: "Paste or upload JSON. Every field is validated before anything is added.",
  },
  {
    icon: History,
    n: "04",
    title: "Study on schedule",
    body: "SRS queues what is due; quizzes and exams sharpen recall under pressure.",
  },
];

const assurances = [
  {
    icon: HardDrive,
    title: "Stays on this device",
    body: "Decks, settings, notes, XP, history, and reports live in your browser — not an account.",
  },
  {
    icon: LockKeyhole,
    title: "Private by design",
    body: "Nothing is uploaded. Clearing browser storage is the only way the library disappears.",
  },
  {
    icon: DatabaseBackup,
    title: "Portable backups",
    body: "Export one JSON file with everything, then restore it during setup or from Settings.",
  },
];

/** Fades content up the first time it scrolls into view. With `stagger`, direct children animate one after another. */
function Reveal({
  children,
  className = "",
  delay = 0,
  stagger = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={`${visible ? (stagger ? "stagger" : "anim-fade-up") : "opacity-0"}${className ? ` ${className}` : ""}`}
    >
      {children}
    </div>
  );
}

function Landing() {
  const navigate = useNavigate();
  const { state, hydrated } = useKnowly();

  useEffect(() => {
    if (!hydrated) return;
    if (state.onboardingComplete) navigate({ to: "/dashboard", replace: true });
  }, [hydrated, state.onboardingComplete, navigate]);

  const openApp = () => {
    navigate({ to: state.onboardingComplete ? "/dashboard" : "/onboarding" });
  };

  if (!hydrated || state.onboardingComplete) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="anim-fade-in sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <Logo className="size-9" />
            <span className="font-display text-xl font-bold tracking-tight">Knowly</span>
          </Link>
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-7 text-sm text-muted-foreground md:flex"
          >
            <a href="#workspace" className="transition-colors hover:text-foreground">
              Workspace
            </a>
            <a href="#benefits" className="transition-colors hover:text-foreground">
              Benefits
            </a>
            <a href="#workflow" className="transition-colors hover:text-foreground">
              Workflow
            </a>
            <a href="#backup" className="transition-colors hover:text-foreground">
              Backup
            </a>
          </nav>
          <Button variant="ghost" onClick={openApp}>
            Open app <ChevronRight />
          </Button>
        </div>
        <nav
          aria-label="Sections"
          className="flex gap-1 overflow-x-auto border-t border-border px-5 py-2 md:hidden"
        >
          {[
            ["#workspace", "Workspace"],
            ["#benefits", "Benefits"],
            ["#workflow", "Workflow"],
            ["#backup", "Backup"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <main>
        <section className="relative px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-48 left-1/2 h-[36rem] w-[72rem] max-w-none -translate-x-1/2"
          >
            <div className="anim-aurora-fast landing-aurora h-full w-full opacity-70 blur-3xl" />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[52rem] -translate-x-1/2"
          >
            <div className="anim-float-fast h-full w-full rounded-full bg-primary/10 blur-3xl" />
          </div>
          <div
            aria-hidden
            className="anim-float-fast pointer-events-none absolute -left-40 top-64 hidden h-72 w-72 rounded-full bg-primary/10 blur-3xl [animation-delay:1200ms] lg:block"
          />
          <div
            aria-hidden
            className="anim-float-fast pointer-events-none absolute -right-40 top-24 hidden h-80 w-80 rounded-full bg-primary/10 blur-3xl [animation-delay:2400ms] lg:block"
          />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.02fr_0.98fr]">
            <div>
              <p className="anim-fade-up inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                <ShieldCheck className="size-3.5" /> 100% local · No account
              </p>
              <h1 className="anim-fade-up mt-6 text-balance font-display text-5xl font-bold leading-[1.02] [animation-delay:60ms] sm:text-6xl lg:text-7xl">
                A study workspace that keeps everything — and keeps it yours.
              </h1>
              <p className="anim-fade-up mt-6 max-w-xl text-pretty text-lg leading-8 text-muted-foreground [animation-delay:120ms]">
                Turn any subject into structured decks with your preferred AI, then learn through
                spaced repetition, quizzes, exams, and interactive questions. Progress, notes, and
                backups never leave your device unless you export them.
              </p>
              <div className="anim-fade-up mt-8 flex flex-col gap-3 sm:flex-row [animation-delay:180ms]">
                <Button size="lg" className="press anim-glow group h-12 px-7" onClick={openApp}>
                  Start setup{" "}
                  <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="press h-12 px-7"
                  onClick={() =>
                    document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Explore the workspace
                </Button>
              </div>
              <dl className="stagger mt-10 grid max-w-xl grid-cols-3 gap-3">
                {[
                  ["8", "question types"],
                  ["SRS", "due-date reviews"],
                  ["JSON", "portable backup"],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-border bg-surface/60 px-4 py-3"
                  >
                    <dt className="font-display text-xl font-bold text-primary">{value}</dt>
                    <dd className="mt-1 text-xs text-muted-foreground">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="anim-fade-up relative [animation-delay:200ms]">
              <div
                aria-hidden
                className="absolute -inset-6 rounded-[28px] bg-gradient-to-br from-primary/20 via-transparent to-primary/10 blur-2xl"
              />
              <div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-forge)]">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-destructive/70" />
                    <span className="size-2.5 rounded-full bg-warning/70" />
                    <span className="size-2.5 rounded-full bg-success/70" />
                    <span className="ml-3 text-xs text-muted-foreground">Knowly workspace</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-[11px] text-success">
                    <span className="size-1.5 rounded-full bg-success" /> Offline
                  </span>
                </div>
                <div className="grid md:grid-cols-[76px_1fr]">
                  <div className="hidden flex-col items-center gap-2 border-r border-border bg-background/40 p-3 md:flex">
                    {[BrainCircuit, Timer, BarChart3, DatabaseBackup].map((Icon, i) => (
                      <span
                        key={i}
                        className={
                          i === 0
                            ? "grid size-10 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30"
                            : "grid size-10 place-items-center rounded-xl text-muted-foreground ring-1 ring-border"
                        }
                      >
                        <Icon className="size-4" />
                      </span>
                    ))}
                  </div>
                  <div className="p-6 sm:p-8">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                        Ordering · Biology
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">12 / 20</span>
                    </div>
                    <h2 className="mt-3 text-xl font-semibold sm:text-2xl">
                      Arrange the stages of mitosis in order.
                    </h2>
                    <div className="stagger mt-6 space-y-2">
                      {["Prophase", "Metaphase", "Anaphase", "Telophase"].map((item, i) => (
                        <div
                          key={item}
                          className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-4 py-3"
                        >
                          <GripVertical className="size-4 text-muted-foreground" />
                          <span className="grid size-6 place-items-center rounded-md bg-secondary text-xs font-semibold text-primary">
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Timer className="size-4 text-primary" /> 12:40 left
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Trophy className="size-4 text-primary" /> +20 XP
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="anim-float absolute -bottom-5 left-6 hidden items-center gap-2 rounded-full border border-border bg-background/90 px-4 py-2 text-xs shadow-lg backdrop-blur [animation-delay:800ms] sm:inline-flex">
                <DatabaseBackup className="size-4 text-primary" /> One file restores everything
              </div>
            </div>
          </div>
        </section>

        <section id="workspace" className="border-y border-border bg-surface/40 px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                One library, many ways to learn
              </p>
              <h2 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
                Practice changes shape to match the knowledge.
              </h2>
            </Reveal>
            <Reveal stagger className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {studyModes.map((mode) => (
                <article
                  key={mode.title}
                  className="panel hover-lift group p-7 transition-all duration-300"
                >
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <mode.icon className="size-5" />
                  </span>
                  <h3 className="mt-6 text-xl font-bold">{mode.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{mode.body}</p>
                </article>
              ))}
            </Reveal>
          </div>
        </section>

        <section id="benefits" className="px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
              <Reveal>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  Why it works
                </p>
                <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                  Less rereading.
                  <br />
                  More remembering.
                </h2>
              </Reveal>
              <Reveal delay={120}>
                <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                  Knowly combines the study methods that actually move grades — recall, spacing,
                  feedback, and consistency — with the practical benefit of owning everything you
                  make.
                </p>
              </Reveal>
            </div>
            <Reveal stagger className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {benefits.map((benefit) => (
                <article
                  key={benefit.title}
                  className="panel hover-lift group p-7 transition-all duration-300"
                >
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <benefit.icon className="size-5" />
                  </span>
                  <h3 className="mt-6 text-xl font-bold">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{benefit.body}</p>
                </article>
              ))}
            </Reveal>
          </div>
        </section>

        <section id="workflow" className="px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
              <Reveal>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  A controlled workflow
                </p>
                <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                  Your material.
                  <br />
                  Your model. Your deck.
                </h2>
              </Reveal>
              <Reveal delay={120}>
                <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                  Knowly does not hide an AI model behind the interface. It gives you a rigorous
                  format, while you keep control over the tool, source material, privacy, and
                  output.
                </p>
              </Reveal>
            </div>
            <Reveal
              stagger
              className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2 lg:grid-cols-4"
            >
              {steps.map((item) => (
                <article key={item.n} className="group bg-background p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                      <item.icon className="size-5" />
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{item.n}</span>
                  </div>
                  <h3 className="mt-10 text-xl font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
                </article>
              ))}
            </Reveal>
          </div>
        </section>

        <section id="backup" className="border-y border-border bg-surface/40 px-5 py-24 sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <Reveal stagger>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Move machines without losing momentum
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                One backup file. The whole workspace.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
                Export decks, settings, XP, streaks, notes, quiz history, and reports as a single
                JSON file. Restore it during onboarding when you set up a new browser — or later
                from Settings.
              </p>
              <ul className="mt-8 space-y-3 text-sm">
                {[
                  "Restore a full backup while setting up Knowly",
                  "Import a single deck when you only need new material",
                  "Keep snapshots before merges, splits, and big imports",
                ].map((x) => (
                  <li key={x} className="flex gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {x}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="press anim-glow group h-12 px-7" onClick={openApp}>
                  Start setup{" "}
                  <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </div>
            </Reveal>
            <Reveal delay={140}>
              <div className="panel hover-lift p-6 transition-all duration-300 sm:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Example backup contents</p>
                    <p className="mt-1 font-display text-2xl font-bold">knowly-backup.json</p>
                  </div>
                  <span className="anim-float inline-flex">
                    <DatabaseBackup className="size-7 text-primary" />
                  </span>
                </div>
                <div className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  {[
                    ["12 decks", "248 cards"],
                    ["36 sessions", "92% best accuracy"],
                    ["Settings", "Themes & SRS"],
                    ["Journal", "Notes & reports"],
                  ].map(([top, bottom]) => (
                    <div
                      key={top}
                      className="rounded-xl border border-border bg-background/50 p-4 transition-colors duration-300 hover:border-primary/40"
                    >
                      <p className="font-semibold">{top}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{bottom}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-xs leading-5 text-muted-foreground">
                  Backups are validated and migrated on import, so older exports keep working as the
                  app evolves.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <Reveal
              stagger
              className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3"
            >
              {assurances.map((a) => (
                <div key={a.title} className="group bg-background p-8">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <a.icon className="size-5" />
                  </span>
                  <h3 className="mt-6 text-xl font-bold">{a.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{a.body}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        <section className="relative overflow-hidden border-t border-border px-5 py-24 text-center sm:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-64 left-1/2 h-[32rem] w-[64rem] max-w-none -translate-x-1/2"
          >
            <div className="anim-aurora-fast landing-aurora h-full w-full opacity-60 blur-3xl [animation-delay:2000ms]" />
          </div>
          <Reveal className="relative mx-auto max-w-3xl">
            <p className="anim-pop inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              <Sparkles className="size-3.5" /> Set up in minutes
            </p>
            <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
              Make the next study session count.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              Start fresh, import a deck, or restore a full backup. It all stays on this device
              until you export it.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" className="press anim-glow group h-12 px-7" onClick={openApp}>
                Get started{" "}
                <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="press group h-12 px-7"
                onClick={() =>
                  document.getElementById("backup")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                How backups work
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border bg-surface/30">
        <Reveal className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-3">
            <Logo className="anim-pop size-5 rounded-md" />
            <span className="font-display font-bold">Knowly</span>
            <span className="text-xs text-muted-foreground">Built by students, for students.</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/privacy" className="transition-colors hover:text-foreground">
              Privacy Policy
            </Link>
            <Link to="/terms" className="transition-colors hover:text-foreground">
              Terms of Service
            </Link>
          </div>
        </Reveal>
      </footer>
    </div>
  );
}
