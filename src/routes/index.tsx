import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ArrowRight, BarChart3, BookOpen, BrainCircuit, Check, ChevronRight,
  FileJson, Flame, GripVertical, HardDrive, Layers3, ListChecks, LockKeyhole, MousePointer2,
  Shuffle, Sparkles, Swords, Trophy, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKnowly } from "@/store/knowly";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Knowly — AI Flashcards done right." },
      { name: "description", content: "A focused study workspace for decks, quizzes, interactive questions, and progress — all in your browser." },
      { property: "og:title", content: "Knowly — AI Flashcards done right." },
      { property: "og:description", content: "A focused study workspace for decks, quizzes, interactive questions, and progress — all in your browser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const workflow = [
  { icon: Wand2, n: "01", title: "Forge the prompt", body: "Choose your subject, level, focus, and question mix. Knowly turns those choices into a precise generation brief." },
  { icon: Sparkles, n: "02", title: "Use your preferred AI", body: "Run the prompt in ChatGPT, Gemini, Claude, a local model, or whichever tool you already trust." },
  { icon: FileJson, n: "03", title: "Bring the deck back", body: "Paste or upload the result. Knowly checks every field and explains anything that needs attention." },
  { icon: BrainCircuit, n: "04", title: "Practise with intent", body: "Move between flashcards, focused quizzes, interactive questions, and time-pressured arena rounds." },
];

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
      <div className="ocean-premium grid min-h-screen place-items-center bg-background">
        <Flame className="anim-float size-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="ocean-premium min-h-screen overflow-hidden bg-background text-foreground">
      <header className="relative z-20 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Flame className="size-5" /></span>
            <span className="font-display text-xl font-bold">Knowly</span>
          </Link>
          <nav aria-label="Primary navigation" className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#workflow" className="transition-colors hover:text-foreground">How it works</a>
            <a href="#practice" className="transition-colors hover:text-foreground">Practice</a>
            <a href="#progress" className="transition-colors hover:text-foreground">Progress</a>
          </nav>
          <Button variant="ghost" onClick={openApp}>Open app <ChevronRight /></Button>
        </div>
      </header>

      <main>
        <section className="relative px-5 pb-28 pt-20 text-center sm:px-8 sm:pt-28">
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--primary),transparent)] opacity-60" />
          <div className="relative mx-auto max-w-6xl">
            <p className="anim-fade-up text-s font-semibold uppercase text-primary">The focused study workspace, built with local in mind.</p>
           <h1 className="anim-fade-up mx-auto mt-7 max-w-5xl text-balance font-display text-5xl font-bold leading-[1.02] sm:text-7xl lg:text-8xl [animation-delay:60ms]">
            Just like Gizmo,<br />
            <span className="font-medium text-muted-foreground text-5xl sm:text-6xl lg:text-7xl">
            but better in every way.
            </span>
          </h1>
            <p className="anim-fade-up mx-auto mt-7 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground [animation-delay:120ms]">
              Turn material from any subject into structured decks, then study with flashcards, interactive questions, focused quizzes, and progress you can actually use.
            </p>
            <div className="anim-fade-up mt-10 flex flex-col justify-center gap-3 sm:flex-row [animation-delay:180ms]">
              <Button size="lg" className="press h-12 px-7" onClick={openApp}>Open Knowly <ArrowRight /></Button>
              <Button size="lg" variant="outline" className="press h-12 px-7" onClick={() => navigate({ to: "/import" })}><FileJson /> Import JSON</Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Everything stays in this browser. Export a JSON backup whenever you want a copy.</p>

            <div className="relative mx-auto mt-20 max-w-5xl text-left">
              <div className="absolute inset-x-16 inset-y-0 translate-y-8 rounded-lg border border-border bg-surface/30" />
              <div className="absolute inset-x-8 inset-y-0 translate-y-4 rounded-lg border border-border bg-surface/60" />
              <div className="relative overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-forge)]">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 rounded-full bg-success" /> Study session in progress</div>
                  <span className="font-mono text-xs text-primary">12 / 20</span>
                </div>
                <div className="grid min-h-[380px] md:grid-cols-[220px_1fr]">
                  <div className="hidden border-r border-border p-5 md:block">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Cell biology</p>
                    <div className="mt-6 space-y-2">
                      {["Active recall", "Concept links", "Weak topics", "Session report"].map((item, i) => <div key={item} className={`rounded-md px-3 py-2 text-sm ${i === 0 ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>{item}</div>)}
                    </div>
                  </div>
                  <div className="flex flex-col justify-between p-7 sm:p-10">
                    <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase text-primary">Ordering</span><span className="text-xs text-muted-foreground">Drag into the correct sequence</span></div>
                    <div className="mx-auto my-8 w-full max-w-xl">
                      <h2 className="text-xl font-semibold sm:text-2xl">Arrange the stages of mitosis in order.</h2>
                      <div className="mt-7 space-y-2">
                        {["Prophase", "Metaphase", "Anaphase", "Telophase"].map((item, i) => <div key={item} className="flex items-center gap-4 rounded-md border border-border bg-background/50 p-4"><GripVertical className="size-4 text-muted-foreground" /><span className="grid size-6 place-items-center rounded bg-secondary text-xs text-primary">{i + 1}</span><span className="font-medium">{item}</span></div>)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-5 text-xs text-muted-foreground"><span>Biology · Cell division</span><span className="flex items-center gap-2"><Trophy className="size-4 text-primary" /> +20 XP</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="workflow" className="border-y border-border bg-surface/40 px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
              <div><p className="text-xs font-semibold uppercase text-primary">A controlled workflow</p><h2 className="mt-4 text-4xl font-bold sm:text-5xl">Your material.<br />Your model. Your deck.</h2></div>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">Knowly does not hide an AI model behind the interface. It gives you a rigorous format, while you keep control over the tool, source material, privacy, and output.</p>
            </div>
            <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
              {workflow.map((item) => <article key={item.n} className="group bg-background p-6 sm:p-8"><div className="flex items-center justify-between"><item.icon className="size-5 text-primary" /><span className="font-mono text-xs text-muted-foreground">{item.n}</span></div><h3 className="mt-12 text-xl font-semibold">{item.title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p></article>)}
            </div>
          </div>
        </section>

        <section id="practice" className="px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-semibold uppercase text-primary">More than flip cards</p>
            <h2 className="mt-4 max-w-3xl text-4xl font-bold sm:text-5xl">Practice changes shape to match the knowledge.</h2>
            <div className="mt-14 grid gap-4 lg:grid-cols-12">
              <article className="panel flex min-h-[420px] flex-col justify-between p-7 lg:col-span-7 sm:p-10">
                <div><span className="inline-flex size-11 items-center justify-center rounded-md bg-secondary text-primary"><Layers3 /></span><h3 className="mt-6 text-3xl font-bold">One deck, several ways to learn.</h3><p className="mt-4 max-w-xl leading-7 text-muted-foreground">Review at your own pace, test a filtered topic set, or enter the Arena when you want time pressure, lives, combos, and earned XP.</p></div>
                <div className="mt-10 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-md border border-border bg-background/40 p-4"><BookOpen className="mx-auto mb-2 size-5 text-primary" />Study</div><div className="rounded-md border border-border bg-background/40 p-4"><ListChecks className="mx-auto mb-2 size-5 text-primary" />Quiz</div><div className="rounded-md border border-border bg-background/40 p-4"><Swords className="mx-auto mb-2 size-5 text-primary" />Arena</div></div>
              </article>
              <article className="panel p-7 lg:col-span-5 sm:p-10"><Shuffle className="size-7 text-primary" /><h3 className="mt-6 text-2xl font-bold">Ordering</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">Rebuild timelines, processes, arguments, and sequences from a shuffled set.</p><div className="mt-8 space-y-2">{["Define the question", "Recall the sequence", "Check the logic"].map((x,i)=><div key={x} className="flex items-center gap-3 rounded-md border border-border bg-background/35 p-3 text-sm"><GripVertical className="size-4 text-muted-foreground" /><span className="text-primary">0{i+1}</span>{x}</div>)}</div></article>
              <article className="panel p-7 lg:col-span-5 sm:p-10"><MousePointer2 className="size-7 text-primary" /><h3 className="mt-6 text-2xl font-bold">Matching</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">Connect terms, definitions, people, dates, causes, and effects without relying on recognition alone.</p><div className="mt-8 grid grid-cols-2 gap-2 text-xs"><span className="rounded-md border border-primary/40 bg-primary/10 p-3">Mitochondria</span><span className="rounded-md border border-border p-3 text-muted-foreground">Energy production</span><span className="rounded-md border border-border p-3">Ribosome</span><span className="rounded-md border border-border p-3 text-muted-foreground">Protein synthesis</span></div></article>
              <article className="panel p-7 lg:col-span-7 sm:p-10"><div className="grid gap-8 sm:grid-cols-2 sm:items-center"><div><BrainCircuit className="size-7 text-primary" /><h3 className="mt-6 text-2xl font-bold">Word bank</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">Complete multiple blanks from a shared answer set, with distractors that demand careful recall.</p></div><div className="rounded-md border border-border bg-background/40 p-5 text-sm leading-8">The <span className="border-b border-primary px-2 text-primary">cell membrane</span> controls movement into and out of the <span className="border-b border-primary px-2 text-primary">cell</span>.</div></div></article>
            </div>
          </div>
        </section>

        <section id="progress" className="border-y border-border bg-surface/40 px-5 py-24 sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
            <div><p className="text-xs font-semibold uppercase text-primary">Useful feedback loops</p><h2 className="mt-4 text-4xl font-bold sm:text-5xl">See the gaps before the exam does.</h2><p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">Accuracy trends, concept heatmaps, weak-topic detection, session history, and streaks turn practice into a plan—not just another score.</p><ul className="mt-8 space-y-3 text-sm">{["Concept-level accuracy and weak-topic signals", "Quiz reports you can review and share", "Mastery, bookmarks, notes, levels, and achievements"].map(x=><li key={x} className="flex gap-3"><Check className="mt-0.5 size-4 text-primary" />{x}</li>)}</ul></div>
            <div className="panel p-6 sm:p-8"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Weekly accuracy</p><p className="mt-1 text-3xl font-bold">84%</p></div><BarChart3 className="size-7 text-primary" /></div><div className="mt-10 flex h-44 items-end gap-3">{[42,58,51,72,64,82,88].map((h,i)=><div key={i} className="flex flex-1 flex-col justify-end gap-2"><div className="rounded-t bg-primary/70 transition-all" style={{height:`${h}%`}}/><span className="text-center text-[10px] text-muted-foreground">{"MTWTFSS"[i]}</span></div>)}</div><div className="mt-8 grid grid-cols-2 gap-3"><div className="rounded-md border border-border bg-background/35 p-4"><p className="text-xs text-muted-foreground">Current streak</p><p className="mt-1 text-xl font-bold">12 days</p></div><div className="rounded-md border border-border bg-background/35 p-4"><p className="text-xs text-muted-foreground">Mastered</p><p className="mt-1 text-xl font-bold">148 cards</p></div></div></div>
          </div>
        </section>

        <section className="px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
              <div className="bg-background p-8"><HardDrive className="size-6 text-primary" /><h3 className="mt-6 text-xl font-bold">Stays on this device</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">Decks, settings, notes, results, XP, and progress live in your browser. Move them with a JSON export.</p></div>
              <div className="bg-background p-8"><LockKeyhole className="size-6 text-primary" /><h3 className="mt-6 text-xl font-bold">Private by design</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">Nothing is uploaded to an account. Clearing this browser’s storage is the only way the library disappears — keep a JSON backup if that matters.</p></div>
              <div className="bg-background p-8"><Wand2 className="size-6 text-primary" /><h3 className="mt-6 text-xl font-bold">No locked-in model</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">Knowly never stores an AI key. You choose where prompts run and inspect every deck before importing.</p></div>
            </div>
          </div>
        </section>

        <section className="border-t border-border px-5 py-24 text-center sm:px-8">
          <div className="mx-auto max-w-3xl"><Flame className="mx-auto size-8 text-primary" /><h2 className="mt-7 text-4xl font-bold sm:text-6xl">Make the next study session count.</h2><p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-muted-foreground">Start with a blank workspace or bring an existing deck as JSON. It all stays on this device until you export it.</p><div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><Button size="lg" className="h-12 px-7" onClick={openApp}>Get started <ArrowRight /></Button><Button size="lg" variant="outline" className="h-12 px-7" onClick={() => navigate({to:"/import"})}>Import a deck</Button></div></div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface/30">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8"><div className="flex items-center gap-3"><Flame className="size-4 text-primary" /><span className="font-display font-bold">Knowly</span><span className="text-xs text-muted-foreground">Built by students, for students.</span></div><div className="flex gap-6 text-sm text-muted-foreground"><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link><Link to="/terms" className="hover:text-foreground">Terms of Service</Link></div></div>
      </footer>
    </div>
  );
}