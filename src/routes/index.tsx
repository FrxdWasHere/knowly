import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookMarked,
  Brain,
  Check,
  Coffee,
  FileJson,
  GraduationCap,
  Heart,
  Lightbulb,
  Moon,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Wand2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKnowly } from "@/store/knowly";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Knowly — STOP Juggling Apps. Study Smarter! 🎯" },
      {
        name: "description",
        content:
          "The study app that actually gets you. AI flashcards, handwritten notes, smart reviews — all in one place. 100% free, works offline, no BS.",
      },
      {
        property: "og:title",
        content: "Knowly — STOP Juggling Apps. Study Smarter! 🎯",
      },
      {
        property: "og:description",
        content:
          "Study app for students who are tired of boring tools. Free forever, actually fun to use, and it works.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const NAV_LINKS = [
  ["#how-it-works", "How it works"],
  ["#features", "Features"],
  ["#for-you", "Why Knowly?"],
  ["#privacy", "Privacy"],
] as const;

const STUDENT_STATS = [
  {
    emoji: "⚡",
    label: "Faster studying",
    value: "10x",
    color: "bg-[#FFE66D]",
    ink: "text-black",
    rotation: "rotate-[-1deg]",
  },
  {
    emoji: "🎯",
    label: "Better grades",
    value: "87%",
    color: "bg-[#34D399]",
    ink: "text-black",
    rotation: "rotate-[1deg]",
  },
  {
    emoji: "💜",
    label: "Hours saved",
    value: "5+",
    color: "bg-[#A855F7]",
    ink: "text-white",
    rotation: "rotate-[-2deg]",
  },
  {
    emoji: "🔥",
    label: "Students daily",
    value: "10K+",
    color: "bg-[#FF6B6B]",
    ink: "text-white",
    rotation: "rotate-[2deg]",
  },
];

const PAIN_POINTS = [
  {
    emoji: "☕",
    title: "Cramming sucks",
    problem: "Pulling all-nighters because you forgot to study",
    solution: "Smart reminders show you EXACTLY what to review",
    color: "bg-[#FF6B6B]",
    rotation: "rotate-[-1deg]",
  },
  {
    emoji: "📱",
    title: "App chaos",
    problem: "Switching between 10 apps just to study one subject",
    solution: "Everything in ONE place. Flashcards, notes, tracking",
    color: "bg-[#FFE66D]",
    rotation: "rotate-[1deg]",
  },
  {
    emoji: "💸",
    title: "Another $10/mo?!",
    problem: "Every study app wants your credit card",
    solution: "100% FREE forever. No trial, no premium BS",
    color: "bg-[#A855F7]",
    rotation: "rotate-[2deg]",
  },
  {
    emoji: "❓",
    title: "Am I ready?",
    problem: "No clue what you actually know before the exam",
    solution: "See EXACTLY which topics you're weak on",
    color: "bg-[#34D399]",
    rotation: "rotate-[-2deg]",
  },
];

const FEATURE_GROUPS: {
  icon: LucideIcon;
  emoji: string;
  title: string;
  studentSpeak: string;
  items: string[];
  color: string;
  rotation: string;
}[] = [
  {
    icon: Wand2,
    emoji: "✨",
    title: "AI Flashcard Magic",
    studentSpeak: "Stop wasting 2 hours making cards",
    items: [
      "Works with ChatGPT, Claude, ANY AI",
      "Auto-checks everything",
      "Import from Quizlet",
      "PDF → flashcards instantly",
      "Images & audio support",
      "Bulk edit tools",
    ],
    color: "bg-[#FF6B6B]",
    rotation: "rotate-[-1deg]",
  },
  {
    icon: Brain,
    emoji: "🧠",
    title: "Smart Study System",
    studentSpeak: "Remember for the final, not just the quiz",
    items: [
      "Daily review queue",
      "Spaced repetition that WORKS",
      "Cram mode for emergencies",
      "Practice quizzes",
      "Timed exam simulator",
      "Focus timer built-in",
    ],
    color: "bg-[#A855F7]",
    rotation: "rotate-[1deg]",
  },
  {
    icon: NotebookPen,
    emoji: "📝",
    title: "Digital Notebooks",
    studentSpeak: "For when typing doesn't cut it",
    items: [
      "Pen pressure (feels real!)",
      "Annotate PDFs",
      "Insert images & audio",
      "Math equations",
      "Infinite canvas",
      "Export to PDF",
    ],
    color: "bg-[#FFE66D]",
    rotation: "rotate-[-2deg]",
  },
  {
    icon: Target,
    emoji: "🎯",
    title: "Know What You Don't Know",
    studentSpeak: "Stop studying stuff you already know",
    items: [
      "Weak spot detector",
      "Trouble card tracker",
      "Concept mastery %",
      "Time insights",
      "Progress streaks",
      "Study forecasts",
    ],
    color: "bg-[#34D399]",
    rotation: "rotate-[2deg]",
  },
  {
    icon: BookMarked,
    emoji: "📚",
    title: "Course Organization",
    studentSpeak: "See where you are in each class",
    items: [
      "Build custom courses",
      "Module checkpoints",
      "Auto progress tracking",
      "Link flashcards to lessons",
      "Practice quizzes",
      "Print study guides",
    ],
    color: "bg-[#60A5FA]",
    rotation: "rotate-[-1deg]",
  },
  {
    icon: Heart,
    emoji: "💜",
    title: "Your Data Stays YOURS",
    studentSpeak: "Privacy that doesn't suck",
    items: [
      "100% offline capable",
      "Zero sign-up needed",
      "No tracking ever",
      "Easy backups",
      "Switch devices anytime",
      "Delete whenever you want",
    ],
    color: "bg-[#EC4899]",
    rotation: "rotate-[1deg]",
  },
];

const HOW_IT_WORKS = [
  {
    icon: Lightbulb,
    emoji: "💡",
    step: "1",
    title: "Get your stuff in",
    description:
      "Upload PDFs, paste notes, import Quizlet, or use AI to make flashcards from anything.",
    color: "bg-[#FFE66D]",
    rotation: "rotate-[-2deg]",
  },
  {
    icon: Brain,
    emoji: "🧠",
    step: "2",
    title: "Study smart",
    description: "Knowly tells you what to review and when. No more guessing what to study next.",
    color: "bg-[#A855F7]",
    rotation: "rotate-[1deg]",
  },
  {
    icon: Trophy,
    emoji: "🏆",
    step: "3",
    title: "Ace the test",
    description: "Track progress, crush weak spots, walk into exams actually confident.",
    color: "bg-[#FF6B6B]",
    rotation: "rotate-[-1deg]",
  },
];

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
      <div className="grid min-h-screen place-items-center bg-[#FFFBF5]">
        <div className="size-8 animate-spin rounded-full border-4 border-black border-t-[#FF6B6B]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#FFFBF5] text-black">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b-4 border-black bg-[#FFFBF5]">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/" className="group flex items-center gap-3">
            <span className="grid size-14 place-items-center rounded-2xl border-4 border-black bg-gradient-to-br from-[#FF6B6B] to-[#A855F7] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Logo className="size-8" />
            </span>
            <span className="font-display text-2xl font-black tracking-tight">Knowly</span>
          </Link>

          <nav aria-label="Primary navigation" className="hidden items-center gap-2 md:flex">
            {NAV_LINKS.map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-xl border-[3px] border-black bg-white px-4 py-2 text-sm font-bold transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                {label}
              </a>
            ))}
          </nav>

          <Button
            onClick={openApp}
            className="rounded-xl border-4 border-black bg-[#FF6B6B] px-6 py-3 font-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:bg-[#ff5555] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
          >
            TRY IT FREE
            <ArrowUpRight className="size-5" />
          </Button>
        </div>

        <nav
          aria-label="Sections"
          className="flex gap-2 overflow-x-auto border-t-4 border-black bg-[#FFE66D] px-4 py-3 md:hidden"
        >
          {NAV_LINKS.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="shrink-0 rounded-lg border-[3px] border-black bg-white px-3 py-2 text-xs font-bold"
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section
          className="relative px-5 pb-20 pt-16 sm:px-8 sm:pb-32 sm:pt-24"
          style={{
            backgroundImage: "radial-gradient(rgba(0,0,0,0.09) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        >
          {/* Decorative shapes */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-[10%] top-[15%] size-32 rotate-12 rounded-3xl border-4 border-black bg-[#A855F7] opacity-20" />
            <div className="absolute right-[15%] top-[25%] size-24 rotate-[-15deg] rounded-full border-4 border-black bg-[#FFE66D] opacity-20" />
            <div className="absolute bottom-[20%] left-[20%] size-28 rotate-[25deg] border-4 border-black bg-[#34D399] opacity-20" />
            <div className="absolute bottom-[30%] right-[10%] size-36 rotate-[-20deg] rounded-2xl border-4 border-black bg-[#FF6B6B] opacity-20" />
          </div>

          <div className="relative mx-auto max-w-6xl">
            <div className="text-center">
              {/* Badges */}
              <Reveal>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <span className="inline-flex items-center gap-2 rotate-[-2deg] rounded-xl border-4 border-black bg-[#FF6B6B] px-4 py-2 font-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <Sparkles className="size-5" />
                    100% FREE
                  </span>
                  <span className="inline-flex items-center gap-2 rotate-[1deg] rounded-xl border-4 border-black bg-[#34D399] px-4 py-2 font-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <Zap className="size-5" />
                    WORKS OFFLINE
                  </span>
                  <span className="inline-flex items-center gap-2 rotate-[-1deg] rounded-xl border-4 border-black bg-[#FFE66D] px-4 py-2 font-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <Users className="size-5" />
                    10K+ STUDENTS
                  </span>
                </div>
              </Reveal>

              {/* Giant Headline */}
              <Reveal delay={80}>
                <h1 className="mt-12 font-display text-[clamp(2.5rem,7vw,5.5rem)] font-black leading-[0.95] tracking-tighter">
                  <span className="inline-block rotate-[-1deg] bg-[#FF6B6B] px-4 py-2 text-white">
                    STOP
                  </span>{" "}
                  <span className="inline-block">🎒</span>
                  <br />
                  <span className="inline-block">juggling</span>{" "}
                  <span className="relative inline-block">
                    <span className="relative z-10">10 apps</span>
                    <span className="absolute bottom-2 left-0 right-0 h-4 rotate-[-1deg] bg-[#FFE66D]" />
                  </span>
                  <br />
                  <span className="inline-block rotate-[1deg] bg-gradient-to-r from-[#A855F7] to-[#EC4899] bg-clip-text px-2 text-transparent [-webkit-text-stroke:2px_black]">
                    Study SMARTER
                  </span>{" "}
                  <span className="inline-block">🧠</span>
                  <br />
                  <span className="inline-block">in</span>{" "}
                  <span className="inline-block rotate-[-2deg] border-4 border-black bg-[#60A5FA] px-4 py-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    ONE
                  </span>{" "}
                  <span className="inline-block">place</span> ✨
                </h1>
              </Reveal>

              <Reveal delay={160}>
                <p className="mx-auto mt-8 max-w-2xl text-lg font-bold leading-relaxed sm:text-xl">
                  Create flashcards with AI in seconds. Take handwritten notes. Track what you{" "}
                  <span className="relative inline-block">
                    <span className="relative z-10">actually know</span>
                    <span className="absolute bottom-0 left-0 right-0 h-2 bg-[#FFE66D]" />
                  </span>
                  . Everything stays on your device —{" "}
                  <span className="font-black">no account, no subscription, no BS</span>.
                </p>
              </Reveal>

              <Reveal delay={240}>
                <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <button
                    onClick={openApp}
                    className="group relative rotate-[-1deg] rounded-2xl border-4 border-black bg-[#FF6B6B] px-8 py-4 font-black text-xl text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
                  >
                    GET STARTED FREE
                    <ArrowUpRight className="ml-2 inline size-6" />
                  </button>
                  <a
                    href="#how-it-works"
                    className="rotate-[1deg] rounded-2xl border-4 border-black bg-white px-8 py-4 font-black text-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                  >
                    See how it works
                  </a>
                </div>
              </Reveal>

              <Reveal delay={320}>
                <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-base font-bold">
                  {[
                    { icon: Check, text: "No credit card" },
                    { icon: Check, text: "No account" },
                    { icon: Check, text: "Works offline" },
                    { icon: Check, text: "Private forever" },
                  ].map((item) => (
                    <span key={item.text} className="inline-flex items-center gap-2">
                      <span className="grid size-6 place-items-center rounded-full border-[3px] border-black bg-[#34D399]">
                        <item.icon className="size-4" />
                      </span>
                      {item.text}
                    </span>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y-4 border-black bg-gradient-to-r from-[#FF6B6B] via-[#A855F7] to-[#FFE66D] py-12">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STUDENT_STATS.map((stat, index) => (
                <Reveal key={stat.label} delay={index * 60}>
                  <div
                    className={cn(
                      "rounded-2xl border-4 border-black p-6 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[9px_9px_0px_0px_rgba(0,0,0,1)]",
                      stat.color,
                      stat.ink,
                      stat.rotation,
                    )}
                  >
                    <div className="mb-2 text-5xl">{stat.emoji}</div>
                    <div className="font-display text-4xl font-black">{stat.value}</div>
                    <div className="mt-1 text-sm font-bold uppercase tracking-wider">
                      {stat.label}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Pain Points Section */}
        <section className="px-5 py-20 sm:px-8 sm:py-32">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="text-center">
                <h2 className="font-display text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  We know studying{" "}
                  <span className="relative inline-block rotate-[-1deg]">
                    <span className="relative z-10 bg-[#FF6B6B] px-4 py-2 text-white">SUCKS</span>
                  </span>{" "}
                  <br />
                  sometimes
                </h2>
                <p className="mx-auto mt-6 max-w-2xl text-lg font-bold sm:text-xl">
                  That's why we built something that{" "}
                  <span className="relative inline-block">
                    <span className="relative z-10">actually helps</span>
                    <span className="absolute bottom-0 left-0 right-0 h-3 bg-[#FFE66D]" />
                  </span>{" "}
                  instead of getting in your way.
                </p>
              </div>
            </Reveal>

            <div className="mt-16 grid gap-8 md:grid-cols-2">
              {PAIN_POINTS.map((point, index) => (
                <Reveal key={point.title} delay={index * 80}>
                  <div
                    className={cn(
                      "group relative overflow-hidden rounded-3xl border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]",
                      point.color,
                      point.rotation,
                    )}
                  >
                    {/* Decorative corner shape */}
                    <div className="absolute right-4 top-4 size-12 rotate-12 rounded-lg border-4 border-black bg-white opacity-30" />

                    <div className="relative">
                      <div className="mb-4 text-6xl">{point.emoji}</div>
                      <h3 className="font-display text-2xl font-black uppercase tracking-tight">
                        {point.title}
                      </h3>
                      <p className="mt-3 text-base font-bold opacity-80">{point.problem}</p>
                      <div className="mt-4 flex items-start gap-3 rounded-xl border-4 border-black bg-white p-4">
                        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-[3px] border-black bg-[#34D399]">
                          <Check className="size-4" />
                        </span>
                        <p className="text-sm font-black uppercase leading-snug">
                          {point.solution}
                        </p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section
          id="how-it-works"
          className="border-y-4 border-black bg-white px-5 py-20 sm:px-8 sm:py-32"
        >
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="text-center">
                <span className="inline-block rotate-[-2deg] rounded-2xl border-4 border-black bg-[#FFE66D] px-6 py-3 font-black uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                  <Lightbulb className="mr-2 inline size-6" />
                  Super Simple
                </span>
                <h2 className="mt-8 font-display text-4xl font-black sm:text-5xl lg:text-6xl">
                  Here's how it{" "}
                  <span className="relative inline-block">
                    <span className="relative z-10">WORKS</span>
                    <span className="absolute bottom-2 left-0 right-0 h-4 rotate-[-1deg] bg-[#A855F7]" />
                  </span>
                </h2>
                <p className="mx-auto mt-6 max-w-2xl text-lg font-bold sm:text-xl">
                  No complicated setup. No learning curve.
                  <br />
                  Just start studying better in <span className="text-[#FF6B6B]">3 STEPS</span>.
                </p>
              </div>
            </Reveal>

            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {HOW_IT_WORKS.map((step, index) => (
                <Reveal key={step.step} delay={index * 80}>
                  <article
                    className={cn(
                      "relative rounded-3xl border-4 border-black p-8 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]",
                      step.color,
                      step.rotation,
                    )}
                  >
                    {/* Step number badge */}
                    <div className="absolute -right-3 -top-3 grid size-14 place-items-center rotate-12 rounded-full border-4 border-black bg-white font-display text-2xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      {step.step}
                    </div>

                    <div className="mx-auto mb-6 text-7xl">{step.emoji}</div>
                    <h3 className="font-display text-2xl font-black uppercase">{step.title}</h3>
                    <p className="mt-4 text-base font-bold leading-snug">{step.description}</p>

                    {/* Arrow to next step */}
                    {index < HOW_IT_WORKS.length - 1 && (
                      <div className="absolute -right-12 top-1/2 hidden -translate-y-1/2 md:block">
                        <ArrowRight className="size-10 stroke-[3]" />
                      </div>
                    )}
                  </article>
                </Reveal>
              ))}
            </div>

            <Reveal delay={300}>
              <div className="mt-16 text-center">
                <button
                  onClick={openApp}
                  className="rotate-[-1deg] rounded-2xl border-4 border-black bg-[#FF6B6B] px-10 py-5 font-black text-xl text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
                >
                  TRY IT NOW — IT'S FREE
                  <ArrowUpRight className="ml-2 inline size-6" />
                </button>
                <p className="mt-6 font-bold">
                  No download • No sign-up • No credit card • Start in{" "}
                  <span className="relative inline-block">
                    <span className="relative z-10">30 seconds</span>
                    <span className="absolute bottom-0 left-0 right-0 h-2 bg-[#FFE66D]" />
                  </span>
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-[#FFFBF5] px-5 py-20 sm:px-8 sm:py-32">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="text-center">
                <span className="inline-block rotate-[1deg] rounded-2xl border-4 border-black bg-[#A855F7] px-6 py-3 font-black uppercase text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                  <Star className="mr-2 inline size-6" />
                  Everything You Need
                </span>
                <h2 className="mt-8 font-display text-4xl font-black sm:text-5xl lg:text-6xl">
                  All your study tools in{" "}
                  <span className="relative inline-block rotate-[-2deg]">
                    <span className="relative z-10 bg-gradient-to-r from-[#FF6B6B] to-[#EC4899] bg-clip-text text-transparent [-webkit-text-stroke:2px_black]">
                      ONE APP
                    </span>
                  </span>
                </h2>
                <p className="mx-auto mt-6 max-w-2xl text-lg font-bold sm:text-xl">
                  No more switching between Quizlet, Notion, OneNote, and{" "}
                  <span className="relative inline-block">
                    <span className="relative z-10">7 other apps</span>
                    <span className="absolute bottom-0 left-0 right-0 h-3 bg-[#FFE66D]" />
                  </span>
                  . Knowly has it all.
                </p>
              </div>
            </Reveal>
            <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {FEATURE_GROUPS.map((group, index) => (
                <Reveal key={group.title} delay={index * 60} className="h-full">
                  <article
                    className={cn(
                      "group h-full rounded-3xl border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]",
                      group.color,
                      group.rotation,
                    )}
                  >
                    {/* Decorative shapes */}
                    <div className="absolute right-4 top-4 size-10 rotate-12 rounded-full border-4 border-black bg-white/40" />

                    <div className="relative">
                      <div className="mb-4 text-6xl">{group.emoji}</div>
                      <h3 className="font-display text-2xl font-black uppercase leading-tight tracking-tight">
                        {group.title}
                      </h3>
                      <p className="mt-3 rounded-xl border-[3px] border-black bg-white/80 p-3 text-sm font-black uppercase leading-snug">
                        {group.studentSpeak}
                      </p>
                      <ul className="mt-6 space-y-2">
                        {group.items.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm font-bold">
                            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-[3px] border-black bg-white">
                              <Check className="size-3" />
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* For Students Section */}
        <section
          id="for-you"
          className="relative overflow-hidden px-5 py-20 sm:px-8 sm:py-28"
          style={{
            backgroundImage: "radial-gradient(rgba(0,0,0,0.13) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
              <Reveal>
                <div>
                  <span className="inline-flex rotate-[-2deg] items-center gap-2 rounded-xl border-4 border-black bg-[#60A5FA] px-4 py-2 font-black uppercase shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                    <GraduationCap className="size-5" />
                    Built for students
                  </span>
                  <h2 className="mt-8 font-display text-4xl font-black leading-[1.05] sm:text-5xl">
                    Finally, an app that{" "}
                    <span className="relative inline-block">
                      <span className="relative z-10">GETS YOU</span>
                      <span className="absolute bottom-1 left-0 right-0 h-4 rotate-[-1deg] bg-[#FFE66D]" />
                    </span>
                    <br />
                    <span className="inline-block rotate-[-1deg] bg-[#A855F7] px-3 py-1 text-white">
                      not your wallet
                    </span>
                  </h2>
                  <p className="mt-6 max-w-xl text-lg font-bold leading-relaxed sm:text-xl">
                    We're students too. We know you're broke, busy, and tired of paying for apps
                    that don't actually help you learn.
                  </p>

                  <div className="mt-10 grid gap-5 sm:grid-cols-2">
                    {[
                      {
                        emoji: "💸",
                        title: "Actually free",
                        description:
                          "No trial. No premium tier. No 'just $9.99/month'. Zero dollars, forever.",
                        color: "bg-[#FFE66D]",
                      },
                      {
                        emoji: "📱",
                        title: "Works anywhere",
                        description:
                          "Study on your laptop in the library, phone on the bus, tablet in bed. Everything syncs.",
                        color: "bg-[#60A5FA]",
                      },
                      {
                        emoji: "⚡",
                        title: "Save time",
                        description:
                          "AI-powered flashcard creation means you spend 5 minutes instead of 2 hours making cards.",
                        color: "bg-[#34D399]",
                      },
                      {
                        emoji: "🔒",
                        title: "Your privacy matters",
                        description:
                          "No tracking, no selling your data, no creepy ads. Your study habits are nobody's business.",
                        color: "bg-[#FF6B6B]",
                      },
                    ].map((item, index) => (
                      <div
                        key={item.title}
                        className={cn(
                          "rounded-2xl border-4 border-black bg-white p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[9px_9px_0px_0px_rgba(0,0,0,1)]",
                          index % 2 === 0 ? "rotate-[-1deg]" : "rotate-[1deg]",
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-11 place-items-center rounded-xl border-4 border-black text-2xl",
                            item.color,
                          )}
                        >
                          {item.emoji}
                        </span>
                        <h3 className="mt-3 font-display text-lg font-black uppercase leading-tight">
                          {item.title}
                        </h3>
                        <p className="mt-2 text-sm font-bold leading-snug">{item.description}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={openApp}
                    className="mt-10 rotate-[-1deg] rounded-2xl border-4 border-black bg-[#FF6B6B] px-8 py-4 text-lg font-black text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
                  >
                    Start studying smarter
                    <ArrowRight className="ml-2 inline size-5 stroke-[3]" />
                  </button>
                </div>
              </Reveal>

              <Reveal delay={100} className="relative">
                <div className="space-y-6">
                  {[
                    {
                      icon: Coffee,
                      title: "Late night study mode",
                      tagline: "When coffee isn't enough",
                      description:
                        "Focus timer, dark mode, and spaced repetition that actually works. Because pulling all-nighters isn't a sustainable strategy.",
                      color: "bg-[#FFE66D]",
                      rotation: "rotate-[1deg]",
                    },
                    {
                      icon: Moon,
                      title: "Before bed review",
                      tagline: "5 minutes, big impact",
                      description:
                        "Quick review before sleep helps memory consolidation. Science says so, and it actually works.",
                      color: "bg-[#A855F7]",
                      rotation: "rotate-[-2deg]",
                    },
                    {
                      icon: Trophy,
                      title: "Exam prep mode",
                      tagline: "When it's crunch time",
                      description:
                        "Timed practice exams, weak spot analysis, and cram mode. Everything you need when the test is tomorrow.",
                      color: "bg-[#34D399]",
                      rotation: "rotate-[1deg]",
                    },
                  ].map((item) => (
                    <article
                      key={item.title}
                      className={cn(
                        "rounded-3xl border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]",
                        item.rotation,
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "grid size-12 shrink-0 place-items-center rounded-xl border-4 border-black",
                            item.color,
                          )}
                        >
                          <item.icon className="size-6 stroke-[3]" />
                        </span>
                        <div>
                          <p className="font-display text-lg font-black leading-tight">
                            {item.title}
                          </p>
                          <p className="text-sm font-bold opacity-70">{item.tagline}</p>
                        </div>
                      </div>
                      <p className="mt-4 text-sm font-bold leading-snug">{item.description}</p>
                    </article>
                  ))}
                </div>

                <span className="absolute -top-5 right-0 hidden rotate-[7deg] rounded-xl border-4 border-black bg-[#FF6B6B] px-4 py-2 text-sm font-black text-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] sm:inline-block">
                  STUDY ANYWHERE ✈️
                </span>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Privacy Section - Simplified for brutalist style */}
        <section
          id="privacy"
          className="border-y-4 border-black bg-[#34D399] px-5 py-20 sm:px-8 sm:py-32"
        >
          <Reveal className="mx-auto max-w-6xl">
            <div className="text-center">
              <span className="inline-block rotate-[-2deg] rounded-2xl border-4 border-black bg-white px-6 py-3 font-black uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <ShieldCheck className="mr-2 inline size-6" />
                Privacy That Doesn't Suck
              </span>
              <h2 className="mt-8 font-display text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                What you study is{" "}
                <span className="inline-block rotate-[1deg] bg-black px-4 py-2 text-white">
                  NOBODY'S BUSINESS
                </span>
                <span className="inline-block ml-2">🔒</span>
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg font-bold sm:text-xl">
                We literally{" "}
                <span className="relative inline-block">
                  <span className="relative z-10">can't see your stuff</span>
                  <span className="absolute bottom-0 left-0 right-0 h-3 bg-[#FFE66D]" />
                </span>{" "}
                even if we wanted to. Everything stays on your device.
              </p>

              <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
                {[
                  { icon: Check, text: "No account needed", sub: "Just open & study" },
                  { icon: Check, text: "Works offline", sub: "Bad WiFi? No problem" },
                  { icon: Check, text: "Your data, your device", sub: "100% local storage" },
                  { icon: Check, text: "Easy backups", sub: "One file = everything" },
                ].map((item, i) => (
                  <Reveal key={item.text} delay={i * 60}>
                    <div className="rounded-2xl border-4 border-black bg-white p-6 text-left shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                      <div className="mb-2 grid size-10 place-items-center rounded-full border-[3px] border-black bg-black">
                        <item.icon className="size-5 text-white" />
                      </div>
                      <p className="font-display text-xl font-black">{item.text}</p>
                      <p className="mt-1 text-sm font-bold opacity-70">{item.sub}</p>
                    </div>
                  </Reveal>
                ))}
              </div>

              <Reveal delay={300}>
                <div className="mt-12 rounded-3xl border-4 border-black bg-white p-8 text-left shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-start gap-4">
                    <div className="grid size-16 shrink-0 place-items-center rounded-2xl border-4 border-black bg-[#FFE66D]">
                      <FileJson className="size-8" />
                    </div>
                    <div className="flex-1">
                      <p className="font-display text-2xl font-black">my-study-backup.json</p>
                      <p className="mt-1 font-bold">724 KB • Everything you need</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {["Flashcards", "Notebooks", "Progress", "Streaks"].map((item) => (
                          <span
                            key={item}
                            className="rounded-lg border-[3px] border-black bg-[#FFFBF5] px-3 py-1 text-sm font-bold"
                          >
                            ✓ {item}
                          </span>
                        ))}
                      </div>
                      <p className="mt-4 text-sm font-bold opacity-70">
                        <span className="font-black">Fun fact:</span> The entire app is smaller than
                        one TikTok video 📱
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </Reveal>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#FF6B6B] via-[#A855F7] to-[#FFE66D] px-5 py-24 sm:px-8 sm:py-32">
          {/* Decorative shapes */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-[5%] top-[10%] size-40 rotate-12 rounded-3xl border-4 border-black bg-white/20" />
            <div className="absolute right-[10%] top-[20%] size-32 rotate-[-20deg] rounded-full border-4 border-black bg-white/20" />
            <div className="absolute bottom-[15%] left-[15%] size-36 rotate-[30deg] border-4 border-black bg-white/20" />
            <div className="absolute bottom-[25%] right-[8%] size-28 rotate-[-15deg] rounded-2xl border-4 border-black bg-white/20" />
          </div>

          <Reveal className="relative mx-auto max-w-4xl text-center">
            <span className="inline-block rotate-[2deg] rounded-2xl border-4 border-black bg-white px-6 py-3 font-black uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <Sparkles className="mr-2 inline size-6" />
              Ready to Level Up?
            </span>
            <h2 className="mt-8 font-display text-[clamp(2.5rem,6vw,5rem)] font-black leading-[0.95]">
              Time to{" "}
              <span className="inline-block rotate-[-2deg] bg-black px-4 py-2 text-white">
                ACTUALLY
              </span>
              <br />
              <span className="inline-block rotate-[1deg] border-4 border-black bg-white px-4 py-2 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                study smarter
              </span>
              <span className="inline-block ml-2">🚀</span>
            </h2>
            <p className="mx-auto mt-8 max-w-2xl text-xl font-bold">
              Join 10,000+ students who stopped wasting time.
              <br />
              <span className="text-2xl font-black">Free forever • Works offline • No BS</span>
            </p>
            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                onClick={openApp}
                className="group rotate-[-1deg] rounded-2xl border-4 border-black bg-white px-10 py-5 font-black text-2xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[-6px] hover:translate-y-[-6px] hover:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]"
              >
                GET STARTED FREE
                <ArrowUpRight className="ml-2 inline size-8" />
              </button>
            </div>
            <p className="mt-8 text-base font-bold">
              No download • No credit card • No account •{" "}
              <span className="relative inline-block">
                <span className="relative z-10 font-black">Start in 30 seconds</span>
                <span className="absolute bottom-0 left-0 right-0 h-3 bg-white" />
              </span>
            </p>
          </Reveal>
        </section>
      </main>

      <footer className="border-t-4 border-black bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.2fr_1.8fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="grid size-14 place-items-center rounded-2xl border-4 border-black bg-gradient-to-br from-[#FF6B6B] to-[#A855F7] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Logo className="size-8" />
              </span>
              <span className="font-display text-2xl font-black tracking-tight">Knowly</span>
            </Link>
            <p className="mt-4 max-w-xs font-bold leading-snug">
              Study smarter, not harder. Free forever, works offline, respects your privacy.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rotate-[-1deg] rounded-xl border-[3px] border-black bg-[#34D399] px-4 py-2 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="size-2 rounded-full bg-black" />
              100% FREE & LOCAL
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <p className="font-display text-sm font-black uppercase">Learn More</p>
              <ul className="mt-4 space-y-2 font-bold">
                {NAV_LINKS.map(([href, label]) => (
                  <li key={href}>
                    <a
                      href={href}
                      className="transition-all hover:translate-x-1 hover:text-[#FF6B6B]"
                    >
                      → {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-display text-sm font-black uppercase">Features</p>
              <ul className="mt-4 space-y-2 font-bold">
                <li>→ AI flashcards</li>
                <li>→ Smart reviews</li>
                <li>→ Notebooks</li>
                <li>→ Progress tracking</li>
              </ul>
            </div>
            <div>
              <p className="font-display text-sm font-black uppercase">Get Started</p>
              <ul className="mt-4 space-y-2 font-bold">
                <li>
                  <button
                    type="button"
                    onClick={openApp}
                    className="transition-all hover:translate-x-1 hover:text-[#FF6B6B]"
                  >
                    → Try it free
                  </button>
                </li>
                <li>
                  <Link
                    to="/privacy"
                    className="transition-all hover:translate-x-1 hover:text-[#FF6B6B]"
                  >
                    → Privacy policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="transition-all hover:translate-x-1 hover:text-[#FF6B6B]"
                  >
                    → Terms of use
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t-4 border-black bg-[#FFE66D] px-5 py-6 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 text-sm font-black sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Knowly. Made with 💜 for students.</span>
            <span>NO ACCOUNT • NO TRACKING • YOUR DATA STAYS YOURS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
