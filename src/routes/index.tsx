import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  LockKeyhole,
  Menu,
  NotebookPen,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { InstallAppButton } from "@/components/app-install";
import { CopyrightNotice } from "@/components/copyright-notice";
import { LandingDeveloperHatch } from "@/components/landing-developer-hatch";
import { useAuth } from "@/store/auth-context";
import { useKnowly } from "@/store/knowly";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Knowly — A study app that gets you. Free forever." },
      {
        name: "description",
        content:
          "A free study workspace for your notes, flashcards, and reviews. Create an online account to sync across devices, or keep your study space local. Free forever.",
      },
      { property: "og:title", content: "Knowly — A study app that gets you. Free forever." },
      {
        property: "og:description",
        content:
          "Sync your study library across devices with a free Knowly account, or keep it local. Free forever, with no subscription.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const NAV_LINKS = [
  ["#how-it-works", "How it works"],
  ["#what-you-get", "What you get"],
  ["#privacy", "Privacy"],
] as const;

const STUDY_TOOLS = [
  {
    icon: Sparkles,
    title: "Make the materials, not busywork.",
    description:
      "Turn notes and PDFs into flashcards, or bring in the decks you already have. Spend your time learning, not formatting.",
    tone: "bg-[#FFE66D]",
    surface: "bg-[#FFE66D]/25",
    wash: "hover:bg-[#FFE66D]/40",
  },
  {
    icon: Target,
    title: "Know what to study next.",
    description:
      "Smart reviews help you revisit the tricky stuff before it disappears from your memory. No guessing, no guilt trip.",
    tone: "bg-[#34D399]",
    surface: "bg-[#34D399]/20",
    wash: "hover:bg-[#34D399]/35",
  },
  {
    icon: NotebookPen,
    title: "Keep your study life in one place.",
    description:
      "Notes, decks, courses, and progress belong together. Your study setup should make sense to you—not another app company.",
    tone: "bg-[#A855F7]",
    surface: "bg-[#A855F7]/15",
    wash: "hover:bg-[#A855F7]/30",
  },
] as const;

function Landing() {
  const navigate = useNavigate();
  const { state, hydrated } = useKnowly();
  const { loading: authLoading, user } = useAuth();
  const [hatchTaps, setHatchTaps] = useState(0);
  const [hatchOpen, setHatchOpen] = useState(false);

  const tapPreviewControl = () => {
    if (hatchTaps >= 6) {
      setHatchTaps(0);
      setHatchOpen(true);
    } else {
      setHatchTaps((count) => count + 1);
    }
  };

  const openApp = () => {
    if (authLoading) return;
    if (!hydrated || (!user && !state.onboardingComplete)) {
      void navigate({ to: "/login" });
      return;
    }
    void navigate({ to: state.onboardingComplete ? "/dashboard" : "/onboarding" });
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#FFFBF5] text-black dark:bg-background dark:text-foreground">
      <header className="sticky top-0 z-40 border-b-2 border-black bg-[#FFFBF5] dark:border-border dark:bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-8 sm:py-3">
          <Link
            to="/"
            className="flex min-w-0 shrink-0 items-center gap-2"
            aria-label="Knowly home"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl border-2 border-black bg-gradient-to-br from-[#FF6B6B] to-[#A855F7] shadow-[3px_3px_0_0_#000] sm:size-10">
              <Logo className="size-6" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight sm:text-xl">Knowly</span>
          </Link>

          <nav
            aria-label="Sections"
            className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex"
          >
            {NAV_LINKS.map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-black/75 transition-colors hover:bg-[#FFE66D] hover:text-black dark:text-foreground/75 dark:hover:text-black"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
            <InstallAppButton className="hidden lg:inline-flex" />
            <Link
              to="/login"
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:bg-[#FFE66D] md:inline-flex"
            >
              Sign in
            </Link>
            <button
              type="button"
              onClick={openApp}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border-2 border-black bg-[#FF6B6B] px-3 py-2 text-sm font-bold text-black shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000] sm:gap-2 sm:px-4"
            >
              Try Knowly
              <ArrowUpRight className="size-4" />
            </button>
            <details
              className="relative md:hidden"
              onClick={(event) => {
                if (event.target instanceof Element && event.target.closest("a")) {
                  event.currentTarget.open = false;
                }
              }}
            >
              <summary
                aria-label="Open site navigation"
                className="grid size-9 cursor-pointer list-none place-items-center rounded-lg border-2 border-black bg-white shadow-[2px_2px_0_0_#000] [&::-webkit-details-marker]:hidden dark:bg-surface"
              >
                <Menu className="size-4" />
              </summary>
              <nav
                aria-label="Mobile sections"
                className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border-2 border-black bg-[#FFFBF5] p-2 text-black shadow-[4px_4px_0_0_#000] dark:border-border dark:bg-surface dark:text-foreground"
              >
                {NAV_LINKS.map(([href, label]) => (
                  <a
                    key={href}
                    href={href}
                    className="block rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-[#FFE66D] hover:text-black"
                  >
                    {label}
                  </a>
                ))}
                <Link
                  to="/login"
                  className="mt-1 block rounded-lg border-t border-black/15 px-3 py-2.5 text-sm font-semibold hover:bg-[#FFE66D] dark:border-border"
                >
                  Sign in
                </Link>
              </nav>
            </details>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden border-b-2 border-black px-5 py-12 sm:px-8 sm:py-20 dark:border-border">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
          >
            <div
              className="absolute inset-0 opacity-35 motion-safe:anim-grid-drift"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px), radial-gradient(rgba(168,85,247,0.2) 1px, transparent 1px)",
                backgroundSize: "44px 44px, 88px 88px",
              }}
            />
            <div className="absolute -left-20 top-16 size-56 rounded-full border-2 border-black/10 bg-[#FFE66D]/45 motion-safe:anim-float" />
            <div className="absolute -right-16 top-8 size-64 rotate-12 rounded-[2.5rem] border-2 border-black/10 bg-[#FF6B6B]/20 motion-safe:anim-float-fast" />
            <div className="absolute bottom-8 left-[42%] size-24 rotate-12 rounded-2xl border-2 border-black/10 bg-[#34D399]/30 motion-safe:anim-float" />
          </div>
          <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:gap-14">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 rounded-md border-2 border-black bg-[#FFE66D] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-black">
                <Zap className="size-4" />
                Made by a student. For students.
              </p>
              <h1 className="mt-6 font-display text-[clamp(2.75rem,6vw,5rem)] font-bold leading-[0.98] tracking-[-0.06em]">
                A study app
                <br />
                that <span className="bg-[#FF6B6B] px-2 text-black">gets you.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-8 text-black/75 sm:text-xl dark:text-foreground/75">
                No lectures about “unlocking your potential.” Just the notes, flashcards, and
                reviews you need, in one place, built by someone who’s in this with you. Create a
                free account to sync across devices, or keep your study space local. Knowly is free
                forever either way.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={openApp}
                  className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-[#FF6B6B] px-5 py-3 font-bold text-black shadow-[4px_4px_0_0_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#000]"
                >
                  Start studying
                  <ArrowRight className="size-4" />
                </button>
                <a
                  href="#what-you-get"
                  className="rounded-lg px-4 py-3 font-semibold underline decoration-2 underline-offset-4 hover:bg-[#FFE66D]"
                >
                  Take a look around.
                </a>
              </div>
              <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-black/70 dark:text-foreground/70">
                {["Free forever.", "Free account sync.", "Works offline."].map((item) => (
                  <li key={item} className="inline-flex items-center gap-1.5">
                    <Check className="size-4 text-[#047857]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative min-w-0">
              <span
                aria-hidden="true"
                className="absolute -right-3 -top-4 z-20 grid size-12 place-items-center rounded-full border-2 border-black bg-[#34D399] motion-safe:anim-float-fast"
              >
                <Sparkles className="size-5" />
              </span>
              <span
                aria-hidden="true"
                className="absolute -bottom-4 -left-3 z-20 size-8 rotate-12 border-2 border-black bg-[#FFE66D] motion-safe:anim-float"
              />
              <div
                aria-hidden="true"
                className="absolute -inset-2 rotate-1 rounded-2xl border-2 border-black bg-[#A855F7]"
              />
              <div className="relative z-10 motion-safe:anim-float">
                <DashboardPreview onSecretTap={tapPreviewControl} />
              </div>
            </div>
          </div>
        </section>

        <section id="what-you-get" className="scroll-mt-24 px-5 py-16 sm:px-8 sm:py-24">
          <div className="relative mx-auto max-w-6xl">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 top-2 hidden sm:block"
            >
              <div className="size-16 rotate-12 border-2 border-black bg-[#60A5FA] motion-safe:anim-float-fast" />
              <div className="-mt-3 ml-10 size-7 rounded-full border-2 border-black bg-[#FF6B6B] motion-safe:anim-bounce-light" />
            </div>
            <div className="grid gap-6 border-b-2 border-black pb-8 md:grid-cols-[0.8fr_1.2fr] md:items-end dark:border-border">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#C0272D] dark:text-[#FF8A8A]">
                  The useful stuff.
                </p>
                <h2 className="mt-3 max-w-md font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                  Less app juggling. More actual studying.
                </h2>
              </div>
              <p className="max-w-xl text-base leading-7 text-black/70 sm:text-lg dark:text-foreground/70">
                You already have enough tabs open. Knowly brings the parts of studying that work
                together, without making you learn a whole new productivity religion.
              </p>
            </div>

            <div className="divide-y-2 divide-black/15 dark:divide-border">
              {STUDY_TOOLS.map((tool, index) => (
                <article
                  key={tool.title}
                  className={`group grid gap-4 rounded-xl border-l-4 border-black/20 px-4 py-7 transition-colors sm:grid-cols-[3rem_1fr_1.1fr] sm:items-start sm:gap-6 ${tool.surface} ${tool.wash}`}
                >
                  <span
                    className={`grid size-11 place-items-center rounded-lg border-2 border-black text-black transition-transform group-hover:rotate-6 group-hover:scale-110 ${tool.tone}`}
                  >
                    <tool.icon className="size-5" />
                  </span>
                  <div className="flex items-start gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#FF6B6B]/20 font-mono text-[10px] font-bold text-black/70 dark:text-foreground/70">
                      0{index + 1}
                    </span>
                    <h3 className="font-display text-lg font-bold leading-snug sm:text-xl">
                      {tool.title}
                    </h3>
                  </div>
                  <p className="max-w-xl text-sm leading-6 text-black/70 sm:text-base dark:text-foreground/70">
                    {tool.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="relative isolate scroll-mt-24 overflow-hidden border-y-2 border-black bg-white px-5 py-16 sm:px-8 sm:py-20 dark:border-border dark:bg-surface dark:text-foreground"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-16 -top-20 size-64 rounded-full border-2 border-black/10 bg-[#FFE66D]/45 motion-safe:anim-float" />
            <div className="absolute -bottom-12 left-[35%] size-40 rotate-12 border-2 border-black/10 bg-[#60A5FA]/30 motion-safe:anim-float-fast" />
          </div>
          <div className="relative z-10 mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#C0272D] dark:text-[#FF8A8A]">
                No big setup.
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Start where you are.
              </h2>
              <p className="mt-4 max-w-md leading-7 text-black/70 dark:text-foreground/70">
                Use the notes you already have. Pick the tools that help. You don’t need a perfect
                system before you can get started.
              </p>
            </div>
            <ol className="divide-y-2 divide-black/15 border-y-2 border-black dark:divide-border dark:border-border">
              {[
                {
                  title: "Bring your study stuff.",
                  description: "Add notes, PDFs, or flashcards you’ve already made.",
                  tone: "bg-[#FFE66D]",
                },
                {
                  title: "Pick what helps today.",
                  description: "Make cards, review a deck, write notes, or work through a course.",
                  tone: "bg-[#34D399]",
                },
                {
                  title: "Keep moving at your pace.",
                  description: "See what’s clicking and what could use another look.",
                  tone: "bg-[#A855F7]",
                },
              ].map((step, index) => (
                <li key={step.title} className="flex gap-5 py-5">
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-full border-2 border-black font-mono text-sm font-bold ${step.tone}`}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-display font-bold">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-black/70 dark:text-foreground/70">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="privacy"
          className="relative isolate scroll-mt-24 overflow-hidden bg-[#34D399] px-5 py-14 text-black sm:px-8 sm:py-16"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-8 -top-12 size-48 rounded-full border-2 border-black/15 bg-[#FFE66D]/35 motion-safe:anim-float" />
            <div className="absolute bottom-[-4rem] left-[28%] size-40 rotate-12 border-2 border-black/10 bg-[#A855F7]/20 motion-safe:anim-float-fast" />
          </div>
          <div className="relative z-10 mx-auto grid max-w-6xl gap-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <span className="grid size-12 place-items-center rounded-lg border-2 border-black bg-white">
              <LockKeyhole className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">
                Your study life is yours.
              </h2>
              <p className="mt-2 max-w-2xl leading-7">
                Sign in or create a free account to keep your library in sync across devices. Prefer
                a local-only study space? That works too. Your study habits are never used for ads,
                and there is no subscription.
              </p>
            </div>
            <span className="w-fit rounded-md border-2 border-black bg-white px-3 py-2 text-sm font-bold">
              No tracking. No subscription.
            </span>
          </div>
        </section>

        <section className="relative isolate overflow-hidden border-t-2 border-black bg-[#FFE66D] px-5 py-16 text-black sm:px-8 sm:py-20">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-12 -top-16 size-56 rotate-12 rounded-[2rem] border-2 border-black/15 bg-[#FF6B6B]/40 motion-safe:anim-float" />
            <div className="absolute -bottom-16 left-[40%] size-48 rounded-full border-2 border-black/10 bg-[#60A5FA]/35 motion-safe:anim-float-fast" />
            <div className="absolute right-[35%] top-8 size-12 rotate-45 border-2 border-black/15 bg-[#A855F7]/30 motion-safe:anim-bounce-light" />
          </div>
          <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#C0272D]">
                You’ve got this.
              </p>
              <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Let’s make studying a little less painful.
              </h2>
              <p className="mt-3 max-w-xl leading-7 text-black/75">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-bold underline decoration-2 underline-offset-4 hover:text-[#C0272D]"
                >
                  Sign in
                </Link>{" "}
                and pick up where you left off. New here? Create one for free. Knowly is free
                forever, with no subscription.
              </p>
            </div>
            <button
              type="button"
              onClick={openApp}
              className="inline-flex w-fit shrink-0 items-center gap-2 rounded-lg border-2 border-black bg-[#FF6B6B] px-5 py-3 font-bold text-black shadow-[4px_4px_0_0_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#000]"
            >
              Try Knowly
              <ArrowUpRight className="size-4" />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-black bg-white dark:bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg border-2 border-black bg-gradient-to-br from-[#FF6B6B] to-[#A855F7]">
              <Logo className="size-5" />
            </span>
            <div>
              <p className="font-display font-bold">Knowly</p>
              <p className="text-sm text-black/65 dark:text-foreground/65">
                Made with students in mind.
              </p>
            </div>
          </div>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
            <Link
              to="/privacy"
              className="underline underline-offset-4 hover:text-[#C0272D] dark:hover:text-[#FF8A8A]"
            >
              Privacy policy
            </Link>
            <Link
              to="/terms"
              className="underline underline-offset-4 hover:text-[#C0272D] dark:hover:text-[#FF8A8A]"
            >
              Terms of use
            </Link>
            <Link
              to="/login"
              className="underline underline-offset-4 hover:text-[#C0272D] dark:hover:text-[#FF8A8A]"
            >
              Sign in
            </Link>
          </nav>
          <CopyrightNotice className="text-sm text-black/65 dark:text-foreground/65" />
        </div>
      </footer>
      <LandingDeveloperHatch open={hatchOpen} onOpenChange={setHatchOpen} />
    </div>
  );
}

function DashboardPreview({ onSecretTap }: { onSecretTap: () => void }) {
  return (
    <div
      role="img"
      aria-label="Preview of the Knowly home screen, showing a study dashboard, review progress, and recent decks."
      className="min-w-0 overflow-hidden rounded-xl border-2 border-black bg-white text-black shadow-[8px_8px_0_0_#000] sm:rounded-2xl"
    >
      <div className="flex h-10 items-center gap-2 border-b-2 border-black px-4">
        {import.meta.env.DEV ? (
          <button
            type="button"
            aria-label="Preview window control"
            title=""
            onClick={onSecretTap}
            className="size-2.5 rounded-full border border-black bg-[#FF6B6B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        ) : (
          <span className="size-2.5 rounded-full border border-black bg-[#FF6B6B]" />
        )}
        <span className="size-2.5 rounded-full border border-black bg-[#FFE66D]" />
        <span className="size-2.5 rounded-full border border-black bg-[#34D399]" />
        <span className="ml-2 truncate text-xs font-medium text-black/70">
          knowly.app / dashboard
        </span>
      </div>
      <div className="grid min-h-[360px] sm:grid-cols-[140px_1fr]">
        <aside className="hidden border-r border-black/15 bg-[#FFFBF5] p-3 sm:block">
          <div className="mb-6 flex items-center gap-2 px-1">
            <span className="grid size-7 place-items-center rounded-md border border-black bg-[#FF6B6B]">
              <Logo className="size-4" />
            </span>
            <span className="font-display text-sm font-bold">Knowly</span>
          </div>
          <p className="px-2 text-[9px] font-bold uppercase tracking-wider text-black/70">
            Workspace
          </p>
          <div className="mt-2 space-y-1 text-[11px] font-medium">
            <p className="rounded-md border border-black/10 bg-[#FFE66D] px-2 py-1.5">Home</p>
            <p className="px-2 py-1.5 text-black/80">My decks</p>
            <p className="px-2 py-1.5 text-black/80">Courses</p>
            <p className="px-2 py-1.5 text-black/80">Notebooks</p>
            <p className="px-2 py-1.5 text-black/80">Review</p>
          </div>
          <div className="mt-7 rounded-md border border-black/15 bg-white p-2">
            <p className="text-[9px] font-bold uppercase text-black/70">Today’s goal</p>
            <p className="mt-1 text-xs font-bold">25 of 40 min</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10">
              <div className="h-full w-3/5 bg-[#34D399]" />
            </div>
          </div>
        </aside>

        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#C0272D]">
                Your learning space
              </p>
              <h2 className="mt-1 font-display text-lg font-bold tracking-tight sm:text-xl">
                Good afternoon, Alex.
              </h2>
              <p className="mt-1 text-[10px] text-black/70 sm:text-xs">
                A little progress still counts.
              </p>
            </div>
            <span className="hidden rounded-md border border-black bg-[#FFE66D] px-2 py-1 text-[10px] font-bold sm:inline-block">
              Study session
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Review due", value: "12 cards", tone: "bg-[#FFE66D]" },
              { label: "This week", value: "3.5 hrs", tone: "bg-[#34D399]" },
              { label: "Streak", value: "4 days", tone: "bg-[#60A5FA]" },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`min-w-0 rounded-md border border-black p-2 ${stat.tone}`}
              >
                <p className="truncate text-[8px] font-semibold text-black/80 sm:text-[9px]">
                  {stat.label}
                </p>
                <p className="mt-1 truncate text-[10px] font-bold sm:text-xs">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold">Pick up where you left off.</h3>
              <span className="text-[9px] text-black/70">View all</span>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {[
                {
                  icon: BookOpen,
                  subject: "Biology",
                  deck: "Cell structure",
                  progress: "8 of 20 cards",
                  width: "w-2/5",
                },
                {
                  icon: NotebookPen,
                  subject: "History",
                  deck: "Industrial Revolution",
                  progress: "12 of 18 cards",
                  width: "w-2/3",
                },
              ].map((deck) => (
                <div key={deck.deck} className="min-w-0 rounded-md border border-black/20 p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 shrink-0 place-items-center rounded bg-[#FFFBF5]">
                      <deck.icon className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[8px] font-semibold uppercase tracking-wide text-black/70">
                        {deck.subject}
                      </p>
                      <p className="truncate text-[10px] font-bold">{deck.deck}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-[8px] text-black/70">
                    <span>{deck.progress}</span>
                    <span>Keep going</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/10">
                    <div className={`h-full bg-[#A855F7] ${deck.width}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-md border border-black/15 bg-[#FFFBF5] p-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded bg-[#FF6B6B]">
              <Target className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold">A quick review is ready.</p>
              <p className="text-[9px] text-black/70">12 cards are waiting when you are.</p>
            </div>
            <ArrowRight className="size-3.5 shrink-0" />
          </div>
        </div>
      </div>
      <p className="border-t border-black/15 px-4 py-2 text-center text-[10px] text-black/70">
        A peek at your Knowly home screen.
      </p>
    </div>
  );
}
