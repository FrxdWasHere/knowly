import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  BookMarked,
  BookOpenCheck,
  Brain,
  Check,
  CheckCircle2,
  FileJson,
  Flame,
  NotebookPen,
  Palette,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Wand2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKnowly } from "@/store/knowly";
import { Logo } from "@/components/brand/logo";
import { COLOR_THEMES } from "@/lib/themes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Knowly — The all-in-one study superapp you never know you needed" },
      {
        name: "description",
        content:
          "Forge decks with your own AI, build structured courses, handwrite notebooks, and master everything with spaced repetition, exams and analytics — in one private, offline workspace. No account. No cloud.",
      },
      {
        property: "og:title",
        content: "Knowly — The all-in-one study superapp you never know you needed",
      },
      {
        property: "og:description",
        content:
          "Decks, courses, notebooks, SRS reviews, exams, analytics and portable backups — one private workspace, entirely yours.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const NAV_LINKS = [
  ["#platform", "Platform"],
  ["#features", "Features"],
  ["#workflow", "Workflow"],
  ["#privacy", "Privacy"],
] as const;

const MARQUEE = [
  "Prompt Forge",
  "Structured courses",
  "Handwritten notebooks",
  "Spaced repetition",
  "Exams & quizzes",
  "Weak-spot analytics",
  "Deck Arena",
  "Portable backups",
];

const FEATURE_GROUPS: {
  icon: LucideIcon;
  title: string;
  blurb: string;
  items: string[];
}[] = [
  {
    icon: Wand2,
    title: "Build & import",
    blurb: "Turn any source into a validated, editable deck or course — with your own AI.",
    items: [
      "Prompt Forge",
      "Deck Forge",
      "Course Forge",
      "JSON import",
      "JSON validator",
      "Merge & split",
    ],
  },
  {
    icon: BookOpenCheck,
    title: "Study & schedule",
    blurb: "Let SRS choose the next card, then switch modes when the exam gets close.",
    items: [
      "Daily Review",
      "Spaced repetition",
      "Cram mode",
      "Practice quiz",
      "Exam simulator",
      "Print exam",
      "Focus timer",
      "Deck Arena",
    ],
  },
  {
    icon: BookMarked,
    title: "Courses",
    blurb: "A real path from the first lesson to the final exam, with practice built in.",
    items: [
      "Modules & lessons",
      "Markdown lessons",
      "Checkpoints",
      "Module quizzes",
      "Timed finals",
      "Progress tracking",
      "Linked practice decks",
    ],
  },
  {
    icon: NotebookPen,
    title: "Notebooks",
    blurb: "A pressure-sensitive canvas for handwriting, PDFs, diagrams and audio.",
    items: [
      "Pen & highlighter",
      "Lasso & shapes",
      "Text & sticky notes",
      "PDF annotation",
      "Images & audio",
      "Page templates",
      "PNG / PDF / JSON export",
    ],
  },
  {
    icon: Target,
    title: "Improve & track",
    blurb: "Find the material costing you marks, then close the gap with focused practice.",
    items: [
      "Weak Spots",
      "Leech manager",
      "Card browser",
      "Tag explorer",
      "Bookmarks",
      "Statistics",
      "Goals & streaks",
      "Achievements & XP",
      "Progress report",
      "Study journal",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Private & personal",
    blurb: "Your study life stays on your device — and looks exactly the way you want.",
    items: [
      "100% local",
      "No account",
      "No cloud",
      "Snapshots",
      "JSON backup",
      "28 themes",
      "Accent colors",
      "Wallpapers",
      "Command palette",
      "Shortcuts",
    ],
  },
];

const STEPS = [
  {
    icon: Wand2,
    n: "01",
    title: "Forge the brief",
    body: "Choose subject, level and question mix. Prompt Forge writes a precise generation brief.",
  },
  {
    icon: Sparkles,
    n: "02",
    title: "Use your own AI",
    body: "Run it in ChatGPT, Gemini, Claude or a local model. No API keys are stored in Knowly.",
  },
  {
    icon: FileJson,
    n: "03",
    title: "Validate the import",
    body: "Paste or upload JSON. Every field is checked before a single card touches your library.",
  },
  {
    icon: Trophy,
    n: "04",
    title: "Learn, review, master",
    body: "Courses, notebooks and SRS carry the material until it is recall — not recognition.",
  },
];

const FEATURED_THEMES = COLOR_THEMES.slice(0, 8);

function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
        <Sparkles className="size-3.5" />
        {eyebrow}
      </p>
      <h2 className="mt-5 font-display text-3xl font-bold tracking-[-0.035em] text-balance sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-sm leading-6 text-muted-foreground text-pretty sm:text-base sm:leading-7">
        {description}
      </p>
    </div>
  );
}

function DueRing() {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative grid size-20 shrink-0 place-items-center">
      <svg viewBox="0 0 64 64" className="absolute inset-0 size-full -rotate-90" aria-hidden>
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="4"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="url(#hero-due)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.38}
        />
        <defs>
          <linearGradient id="hero-due" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--primary-glow)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="text-center">
        <p className="font-display text-xl font-bold leading-none text-white">24</p>
        <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-white/35">
          due
        </p>
      </div>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[640px]">
      <div
        aria-hidden
        className="absolute -inset-8 rounded-[3rem] bg-[radial-gradient(circle_at_50%_25%,var(--primary),transparent_62%)] opacity-20 blur-3xl"
      />
      <div className="relative rounded-[2rem] bg-gradient-to-br from-primary/60 via-white/10 to-primary/25 p-px shadow-[0_45px_120px_-45px_rgba(0,0,0,0.95)]">
        <div className="overflow-hidden rounded-[calc(2rem-1px)] bg-[#07111f]">
          <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex gap-1.5">
                <span className="size-2 rounded-full bg-white/15" />
                <span className="size-2 rounded-full bg-white/10" />
                <span className="size-2 rounded-full bg-white/5" />
              </span>
              <span className="ml-1 text-[10px] font-medium text-white/40">knowly / workspace</span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-200">
              <span className="size-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
              Local
            </span>
          </div>

          <div className="grid gap-3 p-3.5 sm:grid-cols-[1.02fr_0.98fr] sm:p-4">
            <div className="space-y-3">
              <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/35">
                      Tonight&apos;s plan
                    </p>
                    <p className="mt-1 font-display text-base font-semibold text-white">
                      Good evening, Scholar
                    </p>
                  </div>
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[8px] font-semibold text-primary">
                    SRS due
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <DueRing />
                  <div className="grid flex-1 grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                      <Flame className="size-3.5 text-orange-300" />
                      <p className="mt-1.5 font-display text-sm font-bold leading-none text-white">
                        12
                      </p>
                      <p className="mt-1 text-[8px] text-white/35">day streak</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                      <Zap className="size-3.5 text-primary" />
                      <p className="mt-1.5 font-display text-sm font-bold leading-none text-white">
                        4,860
                      </p>
                      <p className="mt-1 text-[8px] text-white/35">XP earned</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/35">
                    Continue course
                  </span>
                  <span className="text-[9px] font-semibold text-primary">68%</span>
                </div>
                <div className="mt-2 flex items-start gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-400/20">
                    <BookMarked className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">Cellular Biology</p>
                    <p className="truncate text-[9px] text-white/40">
                      Module 4 · Membrane transport
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-primary to-cyan-300" />
                </div>
                <div className="mt-3 inline-flex items-center gap-1 text-[9px] font-medium text-white/45">
                  <Play className="size-2.5 fill-current" /> Resume lesson
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div
                className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#f6f2e7] p-3 text-slate-900 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.8)]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to bottom, rgba(15,23,42,0.05) 0px, rgba(15,23,42,0.05) 1px, transparent 1px, transparent 18px)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Notebook
                  </span>
                  <span className="text-[8px] text-slate-400">Page 12</span>
                </div>
                <p className="mt-1 font-display text-xs font-semibold">Cell membrane</p>
                <svg viewBox="0 0 160 72" className="mt-1 h-[72px] w-full" aria-hidden>
                  <path
                    d="M8 52c14-18 24 2 38-10s20-18 34-8 16 18 30 8 22-10 40-4"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 62c18-8 26-12 42-7s28 6 44-1 24-8 48-2"
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    opacity="0.72"
                  />
                  <path
                    d="M20 30c12-4 22-5 34-1s24 3 38-3"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="0.45"
                  />
                  <path
                    d="M100 16l8 22M112 14l10 24M94 22l7 16"
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    opacity="0.38"
                  />
                </svg>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-blue-500" />
                  <span className="size-2 rounded-full bg-amber-400" />
                  <span className="size-2 rounded-full bg-slate-800" />
                  <span className="ml-auto text-[8px] text-slate-400">3 ink layers</span>
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/35">
                    Quick quiz
                  </span>
                  <span className="text-[8px] font-semibold text-primary">+20 XP</span>
                </div>
                <p className="mt-1.5 text-[10px] font-semibold leading-snug text-white">
                  Which organelle produces most of the cell&apos;s ATP?
                </p>
                <div className="mt-2 space-y-1">
                  <div className="rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-[9px] font-medium text-primary">
                    Mitochondria
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1 text-[9px] text-white/40">
                    Nucleus
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              {[Wand2, BookOpenCheck, NotebookPen, Brain, BarChart3].map((Icon, index) => (
                <span
                  key={index}
                  className={cn(
                    "grid size-6 place-items-center rounded-lg border",
                    index === 0
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-white/10 bg-white/[0.02] text-white/30",
                  )}
                >
                  <Icon className="size-3" />
                </span>
              ))}
            </div>
            <span className="hidden text-[8px] text-white/30 sm:block">
              All your study tools. One window.
            </span>
          </div>
        </div>
      </div>

      <div className="absolute -top-5 left-10 hidden items-center gap-2 rounded-full border border-white/10 bg-background/85 px-3 py-1.5 text-[10px] font-medium shadow-xl backdrop-blur-xl sm:flex">
        <Wand2 className="size-3 text-primary" />
        Prompt Forge
      </div>
      <div className="absolute -bottom-6 right-10 hidden items-center gap-2 rounded-full border border-white/10 bg-background/85 px-3 py-1.5 text-[10px] font-medium shadow-xl backdrop-blur-xl lg:flex">
        <CheckCircle2 className="size-3 text-emerald-300" />
        Notebook saved
      </div>
    </div>
  );
}

/** Fades content up the first time it scrolls into view. */
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
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
      className={cn(visible ? "anim-fade-up" : "opacity-0", className)}
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
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/65 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:h-18 sm:px-8">
          <Link to="/" className="group flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-[1.1rem] border border-white/10 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent shadow-[0_14px_30px_-18px_var(--primary)] ring-1 ring-primary/25">
              <Logo className="size-7 rounded-lg" />
            </span>
            <span className="leading-none">
              <span className="block font-display text-lg font-bold tracking-tight">Knowly</span>
              <span className="mt-1 hidden text-[8px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/55 sm:block">
                Study superapp
              </span>
            </span>
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 rounded-full border border-white/5 bg-white/[0.025] p-1 text-sm text-muted-foreground backdrop-blur md:flex"
          >
            {NAV_LINKS.map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-full px-3.5 py-2 transition-colors hover:bg-white/[0.05] hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="#privacy"
              className="hidden text-xs font-medium text-muted-foreground transition-colors hover:text-foreground lg:block"
            >
              Private by default
            </a>
            <Button onClick={openApp} className="px-4">
              Open app
              <ArrowRight />
            </Button>
          </div>
        </div>

        <nav
          aria-label="Sections"
          className="flex gap-1.5 overflow-x-auto border-t border-white/5 px-4 py-2 md:hidden"
        >
          {NAV_LINKS.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <main>
        <section className="relative px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-20 lg:pt-24">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/2 top-[-20rem] h-[46rem] w-[80rem] max-w-none -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_50%_50%,var(--primary),transparent_62%)] opacity-[0.17] blur-3xl" />
            <div className="absolute -left-36 top-72 size-80 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -right-44 top-48 size-96 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.035] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:26px_26px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />
          </div>

          <div className="relative mx-auto grid max-w-7xl items-center gap-14 xl:grid-cols-[1.02fr_0.98fr] xl:gap-12">
            <div className="min-w-0 max-w-2xl">
              <Reveal>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                    <Sparkles className="size-3.5" />
                    Learn it. Remember it. Own it.
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-semibold text-emerald-200">
                    <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                    Local-first
                  </span>
                </div>
              </Reveal>

              <Reveal delay={70}>
                <h1 className="mt-6 font-display text-[clamp(2.45rem,6.15vw,4.75rem)] font-bold leading-[0.96] tracking-[-0.05em] text-balance">
                  The all-in-one
                  <br />
                  <span className="bg-gradient-to-r from-primary via-cyan-300 to-[var(--primary-glow)] bg-clip-text text-transparent">
                    study superapp
                  </span>
                  <br />
                  you never know
                  <br />
                  you needed.
                </h1>
              </Reveal>

              <Reveal delay={140}>
                <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground text-pretty sm:text-lg sm:leading-8">
                  Forge decks with your own AI, build structured courses, handwrite notebooks, and
                  master everything with spaced repetition, exams and analytics — in one private,
                  offline workspace.
                </p>
              </Reveal>

              <Reveal delay={210}>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" onClick={openApp}>
                    Start studying
                    <ArrowRight />
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <a href="#platform">See everything inside</a>
                  </Button>
                </div>
              </Reveal>

              <Reveal delay={280}>
                <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                  {["No account", "No cloud", "JSON backup", "Desktop + mobile"].map((item) => (
                    <span key={item} className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-primary/80" />
                      {item}
                    </span>
                  ))}
                </div>
              </Reveal>
            </div>

            <Reveal delay={160} className="relative min-w-0">
              <HeroPreview />
            </Reveal>
          </div>
        </section>

        <section className="relative border-y border-white/5 bg-white/[0.015] py-4">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-5 gap-y-2 px-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55 sm:px-8">
            {MARQUEE.map((item, index) => (
              <span key={item} className="inline-flex items-center gap-5">
                {index > 0 && <span aria-hidden className="size-1 rounded-full bg-primary/50" />}
                {item}
              </span>
            ))}
          </div>
        </section>

        <section id="platform" className="px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <SectionHeading
                eyebrow="One app. Every study loop."
                title="From blank page to mastered — without app-hopping."
                description="Most study stacks are five disconnected tools. Knowly connects the source, the course, the notebook, the review queue and the exam into one continuous loop."
              />
            </Reveal>

            <div className="mt-12 grid gap-4 lg:grid-cols-12">
              <Reveal className="h-full lg:col-span-7">
                <article className="group relative h-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.015] p-5 shadow-[0_24px_70px_-45px_rgba(0,0,0,0.9)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 sm:p-7">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-primary/10 blur-3xl"
                  />
                  <div className="relative">
                    <span className="inline-flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                      <Wand2 className="size-4" />
                    </span>
                    <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight">
                      Forge the raw material.
                    </h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                      Prompt Forge writes the brief. Deck Forge and Course Forge shape it. JSON
                      import validates every field before it touches your library.
                    </p>
                    <div className="mt-5 rounded-2xl border border-white/10 bg-background/50 p-3 font-mono text-[10px] leading-5 text-muted-foreground">
                      <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.16em] text-muted-foreground/45">
                        <span>Prompt Forge</span>
                        <span className="text-primary">ready</span>
                      </div>
                      <p className="mt-2 text-foreground/80">
                        Create 24 cards on <span className="text-primary">membrane transport</span>{" "}
                        for a first-year biology exam. Mix ordering, matching and short answer.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5 font-sans text-[10px]">
                        {["24 cards", "6 concepts", "JSON safe"].map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {["Deck Forge", "Course Forge", "Merge & split", "JSON import"].map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[10px] font-medium text-primary/90"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              </Reveal>

              <Reveal delay={60} className="h-full lg:col-span-5">
                <article className="group relative h-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.015] p-5 shadow-[0_24px_70px_-45px_rgba(0,0,0,0.9)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 sm:p-7">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <BookMarked className="size-4" />
                  </span>
                  <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">
                    Learn with structure.
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Modules, lessons, checkpoints, module quizzes and timed finals — with linked
                    practice decks so every lesson ends in recall.
                  </p>
                  <div className="mt-5 space-y-2">
                    {["Cell structure", "Membrane transport", "Osmosis & tonicity"].map(
                      (module, index) => (
                        <div
                          key={module}
                          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5"
                        >
                          <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-primary/10 text-[9px] font-bold text-primary">
                            0{index + 1}
                          </span>
                          <span className="flex-1 truncate text-[11px] font-medium text-foreground/75">
                            {module}
                          </span>
                          {index === 0 ? (
                            <CheckCircle2 className="size-3.5 text-primary" />
                          ) : (
                            <Play className="size-3 text-muted-foreground/50" />
                          )}
                        </div>
                      ),
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {["Checkpoints", "Module quizzes", "Final exams", "Progress"].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              </Reveal>

              <Reveal delay={120} className="h-full lg:col-span-5">
                <article className="group relative h-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.015] p-5 shadow-[0_24px_70px_-45px_rgba(0,0,0,0.9)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 sm:p-7">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <NotebookPen className="size-4" />
                  </span>
                  <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">
                    Think in ink.
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    A pressure-sensitive notebook with pen, highlighter, shapes, sticky notes, PDF
                    annotation, audio and export that keeps every stroke.
                  </p>
                  <div
                    className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#f6f2e7] p-3 text-slate-900 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.8)]"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(to bottom, rgba(15,23,42,0.05) 0px, rgba(15,23,42,0.05) 1px, transparent 1px, transparent 18px)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Biology notebook
                      </span>
                      <span className="text-[8px] text-slate-400">Page 12</span>
                    </div>
                    <svg viewBox="0 0 160 82" className="mt-1 h-24 w-full" aria-hidden>
                      <path
                        d="M8 54c16-20 26 2 40-10s22-20 36-10 18 20 32 10 24-12 42-6"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M12 66c18-8 28-14 44-8s30 7 46-1 26-8 50-1"
                        fill="none"
                        stroke="#0f172a"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        opacity="0.72"
                      />
                      <path
                        d="M20 30c12-4 24-5 36-1s24 4 38-2"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="4"
                        strokeLinecap="round"
                        opacity="0.45"
                      />
                      <path
                        d="M102 16l8 24M114 14l10 26M96 22l7 18"
                        fill="none"
                        stroke="#0f172a"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        opacity="0.38"
                      />
                    </svg>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-blue-500" />
                      <span className="size-2 rounded-full bg-amber-400" />
                      <span className="size-2 rounded-full bg-slate-800" />
                      <span className="ml-auto text-[8px] text-slate-400">3 ink layers</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {["PDF annotation", "Audio", "Templates", "PNG / PDF export"].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              </Reveal>

              <Reveal delay={180} className="h-full lg:col-span-7">
                <article className="group relative h-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.015] p-5 shadow-[0_24px_70px_-45px_rgba(0,0,0,0.9)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 sm:p-7">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-16 top-0 size-52 rounded-full bg-cyan-400/10 blur-3xl"
                  />
                  <div className="relative">
                    <span className="inline-flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                      <Brain className="size-4" />
                    </span>
                    <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight">
                      Remember on schedule. Perform under pressure.
                    </h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                      Daily SRS decides what is due. Cram mode ignores the schedule. Quizzes, timed
                      finals, print exams and Deck Arena make recall feel like the real thing.
                    </p>
                    <div className="mt-5 grid gap-2 sm:grid-cols-3">
                      {[
                        { icon: Brain, label: "SRS due", value: "24", hint: "spaced review" },
                        { icon: Timer, label: "Focus", value: "25:00", hint: "timer" },
                        { icon: Trophy, label: "Arena", value: "Lv 7", hint: "deck battles" },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5"
                        >
                          <item.icon className="size-4 text-primary" />
                          <p className="mt-3 font-display text-xl font-bold leading-none">
                            {item.value}
                          </p>
                          <p className="mt-1 text-[10px] font-medium text-foreground/60">
                            {item.label}
                          </p>
                          <p className="mt-0.5 text-[9px] text-muted-foreground/60">{item.hint}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {[
                        "8 question types",
                        "Exam simulator",
                        "Cram mode",
                        "Print exam",
                        "Focus timer",
                        "Deck Arena",
                      ].map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[10px] font-medium text-primary/90"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              </Reveal>

              <Reveal delay={240} className="h-full lg:col-span-6">
                <article className="group relative h-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.015] p-5 shadow-[0_24px_70px_-45px_rgba(0,0,0,0.9)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 sm:p-7">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <Target className="size-4" />
                  </span>
                  <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">
                    Fix what is costing you marks.
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Weak Spots, leech cards, concept accuracy and a card browser show exactly where
                    recall breaks — then send you back with a focused queue.
                  </p>
                  <div className="mt-5 space-y-2.5">
                    {[
                      { label: "Membrane transport", value: 42 },
                      { label: "Osmosis & tonicity", value: 63 },
                      { label: "Cell signalling", value: 81 },
                    ].map((row) => (
                      <div key={row.label}>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-foreground/70">{row.label}</span>
                          <span className="text-muted-foreground">{row.value}%</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-300"
                            style={{ width: `${row.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {["Weak Spots", "Leech manager", "Card browser", "Tag explorer"].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              </Reveal>

              <Reveal delay={300} className="h-full lg:col-span-6">
                <article className="group relative h-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.015] p-5 shadow-[0_24px_70px_-45px_rgba(0,0,0,0.9)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 sm:p-7">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <BarChart3 className="size-4" />
                  </span>
                  <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">
                    See the whole picture.
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Streaks, goals, XP, achievements, forecasts and printable reports turn steady
                    work into visible momentum.
                  </p>
                  <div className="mt-5 flex h-24 items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    {[34, 48, 40, 66, 58, 82, 74, 92].map((height, index) => (
                      <div
                        key={index}
                        className="flex-1 rounded-t bg-gradient-to-t from-primary/15 to-primary"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    {[
                      ["12", "day streak"],
                      ["4,860", "XP"],
                      ["96%", "goal rate"],
                    ].map(([value, label]) => (
                      <div
                        key={label}
                        className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-2"
                      >
                        <p className="font-display text-sm font-bold">{value}</p>
                        <p className="mt-0.5 text-[9px] text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </Reveal>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="border-y border-white/5 bg-surface/25 px-5 py-20 sm:px-8 sm:py-28"
        >
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <SectionHeading
                eyebrow="Everything inside"
                title="The whole study stack. One workspace."
                description="No feature island left behind. Every tool is connected to the same library, the same progress and the same private backup."
              />
            </Reveal>
            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {FEATURE_GROUPS.map((group, index) => (
                <Reveal key={group.title} delay={index * 50} className="h-full">
                  <article className="group h-full rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:bg-white/[0.04] sm:p-6">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                        <group.icon className="size-4" />
                      </span>
                      <h3 className="font-display text-lg font-semibold tracking-tight">
                        {group.title}
                      </h3>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">{group.blurb}</p>
                    <ul className="mt-4 flex flex-wrap gap-1.5">
                      {group.items.map((item) => (
                        <li
                          key={item}
                          className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-muted-foreground"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
              <Reveal>
                <SectionHeading
                  align="left"
                  eyebrow="How it works"
                  title="From raw material to recall in four moves."
                  description="Knowly does not force you into one content pipeline. Bring your own AI and your own sources, then let the workspace keep the loop tight."
                />
              </Reveal>
              <Reveal delay={80}>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {["Bring your own AI", "No API keys stored", "Validate before import"].map(
                    (tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-medium text-muted-foreground"
                      >
                        <Check className="size-3 text-primary" />
                        {tag}
                      </span>
                    ),
                  )}
                </div>
              </Reveal>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {STEPS.map((step, index) => (
                <Reveal key={step.n} delay={index * 70} className="h-full">
                  <article className="relative h-full rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-5 transition-colors hover:border-primary/25 hover:bg-white/[0.04]">
                    <div className="flex items-center justify-between">
                      <span className="grid size-9 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                        <step.icon className="size-4" />
                      </span>
                      <span className="font-display text-3xl font-bold text-white/5">{step.n}</span>
                    </div>
                    <h3 className="mt-4 font-display text-base font-semibold">{step.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.body}</p>
                    {index < STEPS.length - 1 && (
                      <ArrowRight className="absolute -right-3 top-1/2 hidden size-4 text-primary/40 xl:block" />
                    )}
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="privacy" className="px-5 pb-20 sm:px-8 sm:pb-28">
          <Reveal className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#07111f] p-6 shadow-[0_35px_100px_-50px_rgba(0,0,0,0.95)] sm:p-10 lg:p-12">
              <div
                aria-hidden
                className="pointer-events-none absolute -left-20 -top-20 size-80 rounded-full bg-primary/15 blur-3xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-24 right-0 size-96 rounded-full bg-cyan-400/10 blur-3xl"
              />
              <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                    <ShieldCheck className="size-3.5" />
                    Private by default
                  </p>
                  <h2 className="mt-5 font-display text-3xl font-bold tracking-[-0.035em] text-balance sm:text-4xl">
                    Your study life is not a data product.
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                    Knowly runs locally. There is no account to create, no library uploaded to a
                    server, and no subscription gate between you and your own material.
                  </p>
                  <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                    {[
                      "Lives in this browser",
                      "One JSON file moves everything",
                      "Snapshots let you roll back",
                      "No account, cloud or telemetry",
                    ].map((point) => (
                      <li key={point} className="flex items-start gap-2 text-xs text-foreground/75">
                        <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                          <Check className="size-2.5" />
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" asChild className="mt-7">
                    <a href="#features">
                      See what is inside
                      <ArrowRight />
                    </a>
                  </Button>
                </div>

                <div className="relative mx-auto w-full max-w-sm">
                  <div
                    aria-hidden
                    className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-2xl"
                  />
                  <div className="relative rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
                    <div className="flex items-center gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                        <FileJson className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-semibold">
                          knowly-backup.json
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          Decks · courses · notebooks · progress
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {["1,248 cards", "12 courses", "8 notebooks", "XP, streaks & reports"].map(
                        (label) => (
                          <div
                            key={label}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-background/40 px-3 py-2 text-[11px] text-foreground/70"
                          >
                            <span>{label}</span>
                            <Check className="size-3.5 text-primary" />
                          </div>
                        ),
                      )}
                    </div>
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[10px] font-medium text-emerald-200">
                      <ShieldCheck className="size-3.5" />
                      Validated before restore
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <section className="px-5 pb-20 sm:px-8 sm:pb-28">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                <Palette className="size-3.5" />
                Make it yours
              </p>
              <h2 className="mt-5 font-display text-3xl font-bold tracking-[-0.035em] text-balance sm:text-4xl">
                A workspace that looks like yours.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                28 palettes, accent colors, wallpapers, density, type scale, button size, reduced
                motion, high contrast and a colorblind-safe palette. The defaults are premium; the
                controls are yours.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  "28 themes",
                  "Custom accents",
                  "Wallpapers",
                  "Density",
                  "High contrast",
                  "Reduced motion",
                ].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-4 sm:p-5">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-3xl"
                />
                <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {FEATURED_THEMES.map((theme) => (
                    <div
                      key={theme.id}
                      className="overflow-hidden rounded-2xl border border-white/10"
                    >
                      <div className="h-20 p-2" style={{ background: theme.colors.background }}>
                        <div
                          className="h-full rounded-xl border p-2"
                          style={{
                            background: theme.colors.surface,
                            borderColor: `${theme.colors.primary}55`,
                          }}
                        >
                          <div
                            className="h-1.5 w-8 rounded-full"
                            style={{ background: theme.colors.primary }}
                          />
                          <div
                            className="mt-1.5 h-1 w-12 rounded-full opacity-40"
                            style={{ background: theme.colors.foreground }}
                          />
                          <div
                            className="mt-1 h-1 w-9 rounded-full opacity-25"
                            style={{ background: theme.colors.foreground }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-background/50 px-2.5 py-2">
                        <span className="truncate text-[9px] text-muted-foreground">
                          {theme.label}
                        </span>
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ background: theme.colors.primary }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="relative overflow-hidden border-t border-white/5 px-5 py-24 sm:px-8 sm:py-28">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-72 w-[52rem] max-w-none -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
          />
          <Reveal className="relative mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="size-3.5" />
              Your next session
            </p>
            <h2 className="mt-5 font-display text-4xl font-bold tracking-[-0.04em] text-balance sm:text-5xl">
              Your next study session has a home.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              Set up in minutes. Import a deck, rebuild from a backup, or start a course from
              scratch. Then keep everything in one private workspace.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={openApp}>
                Open Knowly
                <ArrowRight />
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#privacy">How your data stays yours</a>
              </Button>
            </div>
            <p className="mt-5 text-[10px] text-muted-foreground/60">
              No account required · Export or restore any time
            </p>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-surface/20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.2fr_1.8fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-[1.1rem] border border-white/10 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent ring-1 ring-primary/20">
                <Logo className="size-7 rounded-lg" />
              </span>
              <span className="font-display text-lg font-bold tracking-tight">Knowly</span>
            </Link>
            <p className="mt-4 max-w-xs text-xs leading-5 text-muted-foreground">
              The all-in-one study superapp. Forge, learn, remember and own every session — without
              an account.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-semibold text-emerald-200">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Local-first by design
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/50">
                Explore
              </p>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                {NAV_LINKS.map(([href, label]) => (
                  <li key={href}>
                    <a href={href} className="transition-colors hover:text-foreground">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/50">
                Study
              </p>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li>Spaced repetition</li>
                <li>Courses</li>
                <li>Notebooks</li>
                <li>Exams & analytics</li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/50">
                Start
              </p>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li>
                  <button
                    type="button"
                    onClick={openApp}
                    className="transition-colors hover:text-foreground"
                  >
                    Open app
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={openApp}
                    className="transition-colors hover:text-foreground"
                  >
                    Run setup
                  </button>
                </li>
                <li>
                  <a href="#privacy" className="transition-colors hover:text-foreground">
                    Backup & restore
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-white/5 px-5 py-5 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 text-[10px] text-muted-foreground/55 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Knowly. Built local-first.</span>
            <span>No account. No cloud. No telemetry.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
