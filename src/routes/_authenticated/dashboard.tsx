import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Flame,
  Zap,
  Target,
  Library,
  Trophy,
  Clock,
  TrendingDown,
  Play,
  Wand2,
  Download,
  RotateCcw,
  EyeOff,
  BarChart3,
  BookOpen,
  Brain,
  BookMarked,
  NotebookPen,
} from "lucide-react";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { MathText } from "@/components/math/math-text";
import { Button } from "@/components/ui/button";
import { SrsDashboardWidget } from "@/components/srs/srs-dashboard-widget";
import { SrsDueChip } from "@/components/srs/srs-status-badge";
import { collectDue } from "@/lib/srs";
import { useKnowly } from "@/store/knowly";
import { useAvatarUrl } from "@/lib/use-avatar-url";
import { levelFromXp, ACHIEVEMENTS } from "@/lib/gamification";
import { dayKey, formatDuration } from "@/lib/answers";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Knowly — Local-First Study Dashboard" },
      {
        name: "description",
        content:
          "Track XP, streaks, weak topics and decks in Knowly — an offline study platform for AI-generated JSON question banks.",
      },
      { property: "og:title", content: "Knowly — Local-First Study Dashboard" },
      {
        property: "og:description",
        content:
          "Track XP, streaks, weak topics and decks in Knowly — an offline study platform for AI-generated JSON question banks.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <Dashboard />
    </AppPage>
  ),
});

/** Bright brand blocks, always with black ink. Used for headline numbers. */
const BLOCK_TONES = {
  coral: "bg-block-coral",
  lemon: "bg-block-lemon",
  grape: "bg-block-grape",
  mint: "bg-block-mint",
  sky: "bg-block-sky",
  pink: "bg-block-pink",
} as const;

type BlockTone = keyof typeof BLOCK_TONES;

function Widget({
  id,
  title,
  icon: Icon,
  children,
  className,
  onHide,
  tone,
}: {
  id: string;
  title: string;
  icon: React.ElementType;
  children: ReactNode;
  className?: string;
  onHide: (id: string) => void;
  /** Paint the widget as a brand block instead of a white card. */
  tone?: BlockTone;
}) {
  return (
    <section
      className={cn(
        "group relative p-5",
        tone
          ? cn(
              "rounded-2xl border-[3px] border-border text-ink shadow-[4px_4px_0_0_var(--shadow-ink)]",
              BLOCK_TONES[tone],
            )
          : "panel",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2
          className={cn(
            "flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]",
            tone ? "text-ink/75" : "text-muted-foreground",
          )}
        >
          <Icon className={cn("size-4", tone ? "text-ink" : "text-primary")} />
          {title}
        </h2>
        <button
          aria-label={`Hide ${title} widget`}
          onClick={() => onHide(id)}
          className={cn(
            "grid min-h-[44px] min-w-[44px] place-items-center opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
            tone ? "text-ink/80 hover:text-ink" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <EyeOff className="size-3.5" />
        </button>
      </div>
      {children}
    </section>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { state, updateSettings } = useKnowly();
  const { decks, progress, history, settings } = state;
  const avatarUrl = useAvatarUrl(settings.avatarImage);
  const { level, pct, intoLevel, needed } = levelFromXp(progress.lifetimeXp);
  const hidden = settings.hiddenWidgets;
  const hide = (id: string) => updateSettings({ hiddenWidgets: [...hidden, id] });
  const show = (id: string) => !hidden.includes(id);

  const todayCount = progress.studyDays[dayKey()] ?? 0;
  const goalPct = Math.min(100, (todayCount / Math.max(1, settings.dailyGoal)) * 100);
  const recentDeck = [...decks].sort((a, b) => (b.lastStudiedAt ?? 0) - (a.lastStudiedAt ?? 0))[0];
  const dueNow = collectDue(decks).length;
  const unmastered = decks.reduce((n, d) => n + (d.questions.length - d.masteredIds.length), 0);
  const accuracy = progress.totalAnswered
    ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100)
    : 0;

  const weak = Object.entries(progress.conceptStats)
    .filter(([, v]) => v.total >= 2)
    .map(([k, v]) => ({ concept: k, acc: v.correct / v.total, total: v.total }))
    .sort((a, b) => a.acc - b.acc)
    .slice(0, 5);

  const unlocked = ACHIEVEMENTS.filter((a) => progress.unlockedAchievements.includes(a.id));

  const hello = `${greeting()}, ${settings.displayName || "there"}`;
  const goalMet = todayCount >= settings.dailyGoal;
  const subjectRows = settings.focusSubjects.map((subject) => {
    const mine = decks.filter((d) => d.subject.toLowerCase() === subject.toLowerCase());
    const total = mine.reduce((n, d) => n + d.questions.length, 0);
    const mastered = mine.reduce((n, d) => n + d.masteredIds.length, 0);
    return { subject, deckCount: mine.length, total, mastered };
  });
  const contextLine = [settings.gradeLevel, settings.school].filter(Boolean).join(" · ");

  if (!decks.length) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title={hello}
          description={
            settings.focusSubjects.length
              ? `Your forge is empty. Start with ${settings.focusSubjects.slice(0, 3).join(", ")} — copy Knowly's instructions into the AI you already use, then bring the finished questions back here.`
              : "Your forge is empty. Knowly writes the instructions for you — copy them into any AI you use, then bring the finished cards back here to make your first deck."
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              to: "/generate",
              icon: Wand2,
              title: "Prompt Forge",
              body: "Turn your notes into ready-to-use instructions for an AI.",
            },
            {
              to: "/import",
              icon: Download,
              title: "Bring in a deck",
              body: "Check the deck your AI made, then add it to your library.",
            },
            {
              to: "/format",
              icon: Library,
              title: "Deck file format",
              body: "See what a finished deck looks like.",
            },
            {
              to: "/courses/forge",
              icon: BookMarked,
              title: "Course Forge",
              body: "Build a structured course with lessons and checkpoints.",
            },
            {
              to: "/notes",
              icon: NotebookPen,
              title: "Notebooks",
              body: "Handwrite notes or annotate a PDF on this device.",
            },
          ].map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="rounded-2xl border-[3px] border-border bg-surface p-5 shadow-[3px_3px_0_0_var(--shadow-ink)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--shadow-ink)]"
            >
              <span className="grid size-10 place-items-center rounded-xl border-[2px] border-border bg-block-lemon text-ink">
                <c.icon className="size-5" />
              </span>
              <p className="mt-3 font-display font-bold">{c.title}</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{c.body}</p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="anim-fade-up mb-7 flex flex-col gap-4 border-b-[3px] border-border pb-6 lg:flex-row lg:items-end lg:justify-between lg:gap-6 lg:pb-7">
        <div className="min-w-0 flex-1 flex items-center gap-4">
          <div className="flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Your avatar"
                className="size-20 rounded-lg object-cover border-[3px] border-border shadow-[3px_3px_0_0_var(--shadow-ink)]"
              />
            ) : (
              <span className="grid size-20 place-items-center rounded-lg border-[3px] border-border bg-block-lemon text-5xl text-ink shadow-[3px_3px_0_0_var(--shadow-ink)]">
                {settings.avatarEmoji || "🌊"}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="break-words font-display text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl">
              {hello}
            </h1>
            {(() => {
              const desc = [
                contextLine,
                settings.studyReason ? `Studying for ${settings.studyReason.toLowerCase()}` : "",
                goalMet
                  ? `Daily goal of ${settings.dailyGoal} done — nice work.`
                  : `${Math.max(0, settings.dailyGoal - todayCount)} questions to hit today's goal.`,
              ]
                .filter(Boolean)
                .join(" · ");
              return desc ? (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{desc}</p>
              ) : null;
            })()}
          </div>
        </div>
        {(() => {
          const actionNode = hidden.length ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSettings({ hiddenWidgets: [] })}
            >
              <RotateCcw /> Reset layout
            </Button>
          ) : dueNow ? (
            <Button className="press" asChild>
              <Link to="/review">
                <Brain /> Review {dueNow} due
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/quiz">
                <Play /> Start a quiz
              </Link>
            </Button>
          );
          return actionNode ? (
            <div className="flex w-full min-w-0 flex-wrap items-center gap-2 lg:w-auto lg:max-w-[52%] lg:justify-end">
              {actionNode}
            </div>
          ) : null;
        })()}
      </div>

      <div className="grid grid-flow-row-dense gap-4 md:grid-cols-2 xl:grid-cols-12 stagger">
        {show("srs") && decks.length > 0 && (
          <Widget
            id="srs"
            title="Review schedule"
            icon={Brain}
            onHide={hide}
            className="md:col-span-2 xl:col-span-12 anim-fade-up"
          >
            <SrsDashboardWidget decks={decks} />
          </Widget>
        )}

        {show("continue") && recentDeck && (
          <Widget
            id="continue"
            title="Continue studying"
            icon={Play}
            onHide={hide}
            className="md:col-span-2 xl:col-span-8 anim-fade-up"
          >
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-bold">{recentDeck.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {recentDeck.masteredIds.length}/{recentDeck.questions.length} mastered ·{" "}
                  {recentDeck.subject}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button asChild className="min-h-[44px] anim-fade-up press">
                  <Link
                    to="/study/$deckId"
                    params={{ deckId: recentDeck.id }}
                    search={{ part: undefined }}
                  >
                    Study
                  </Link>
                </Button>
                <Button variant="outline" asChild className="min-h-[44px] anim-fade-up press">
                  <Link to="/quiz">Quiz</Link>
                </Button>
              </div>
            </div>
            {settings.showProgressBars && (
              <div className="mt-4 h-2.5 overflow-hidden rounded-full border-[2px] border-border bg-surface-2">
                <div
                  className="h-full rounded-full bg-primary anim-fade-up"
                  style={{
                    width: `${(recentDeck.masteredIds.length / Math.max(1, recentDeck.questions.length)) * 100}%`,
                  }}
                />
              </div>
            )}
          </Widget>
        )}

        {show("goal") && (
          <Widget
            id="goal"
            title="Today's goal"
            icon={Target}
            onHide={hide}
            className="xl:col-span-4 widget-sky anim-fade-up"
            tone="sky"
          >
            <p className="font-display text-4xl font-bold tabular-nums anim-pop">
              {todayCount}
              <span className="text-base text-ink/60"> / {settings.dailyGoal}</span>
            </p>
            {settings.showProgressBars && (
              <div className="mt-3 h-2.5 overflow-hidden rounded-full border-[2px] border-border bg-ink/15">
                <div className="h-full rounded-full bg-ink anim-fade-up" style={{ width: `${goalPct}%` }} />
              </div>
            )}
            <p className={cn("mt-2 text-xs font-bold", goalMet ? "text-ink" : "text-ink/70")}>
              {goalMet
                ? "Goal reached today 🎉"
                : `${settings.dailyGoal - todayCount} more question${settings.dailyGoal - todayCount === 1 ? "" : "s"} to go`}
            </p>
          </Widget>
        )}

        {show("subjects") && subjectRows.length > 0 && (
          <Widget
            id="subjects"
            title="Your subjects"
            icon={BookOpen}
            onHide={hide}
            className="md:col-span-2 xl:col-span-8 anim-fade-up"
          >
            <div className="grid gap-3 sm:grid-cols-2 stagger">
              {subjectRows.map((s) => (
                <Link
                  key={s.subject}
                  to="/decks"
                  search={{ q: s.subject }}
                  className="rounded-xl border-[2px] border-border bg-surface p-3 shadow-[2px_2px_0_0_var(--shadow-ink)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--shadow-ink)] anim-fade-up hover:anim-float press"
                >
                  <p className="text-sm font-bold">{s.subject}</p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    {s.deckCount
                      ? `${s.deckCount} deck${s.deckCount === 1 ? "" : "s"} · ${s.mastered}/${s.total} mastered`
                      : "No decks yet — build one"}
                  </p>
                  {settings.showProgressBars && s.total > 0 && (
                    <div className="mt-2 h-2 overflow-hidden rounded-full border-[2px] border-border bg-surface-2">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(s.mastered / s.total) * 100}%` }}
                      />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </Widget>
        )}

        {show("level") && (
          <Widget
            id="level"
            title="Level & XP"
            icon={Zap}
            onHide={hide}
            className="xl:col-span-4 widget-grape anim-fade-up"
            tone="grape"
          >
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl font-bold tabular-nums anim-pop">Lv {level}</span>
              <span className="text-xs font-bold text-ink/70">
                {intoLevel}/{needed} XP
              </span>
            </div>
            {settings.showProgressBars && (
              <div className="mt-3 h-2.5 overflow-hidden rounded-full border-[2px] border-border bg-ink/15">
                <div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
              </div>
            )}
            <p className="mt-2 text-xs font-bold text-ink/70">
              {progress.lifetimeXp.toLocaleString()} lifetime XP
            </p>
          </Widget>
        )}

        {show("streak") && (
          <Widget
            id="streak"
            title="Study streak"
            icon={Flame}
            onHide={hide}
            className="xl:col-span-4 widget-coral anim-fade-up"
            tone="coral"
          >
            <p className="font-display text-4xl font-bold tabular-nums anim-pop">{progress.streak} days</p>
            <p className="mt-2 text-xs font-bold text-ink/70">
              Longest {progress.longestStreak} · {formatDuration(progress.studyTimeMs)} studied
            </p>
          </Widget>
        )}

        {show("due") && (
          <Widget
            id="due"
            title="Cards due"
            icon={Clock}
            onHide={hide}
            className="xl:col-span-4 widget-lemon anim-fade-up"
            tone="lemon"
          >
            <p className="font-display text-4xl font-bold tabular-nums anim-pop">{dueNow}</p>
            <p className="mt-2 text-xs font-bold text-ink/70">
              due now · {unmastered} still unmastered · {accuracy}% lifetime accuracy
            </p>
            {dueNow > 0 && (
              <Link
                to="/review"
                className="mt-2 inline-block text-xs font-bold text-ink underline underline-offset-4 anim-fade-up hover:anim-float"
              >
                Start review →
              </Link>
            )}
          </Widget>
        )}

        {show("activity") && (
          <Widget
            id="activity"
            title="Recent activity"
            icon={BarChart3}
            onHide={hide}
            className="md:col-span-2 xl:col-span-8 anim-fade-up"
          >
            {history.length ? (
              <ul className="space-y-2 stagger">
                {history.slice(0, 5).map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between rounded-lg border-[2px] border-border bg-surface-2 px-3 py-2 text-sm anim-fade-up transition-all hover:shadow-[2px_2px_0_0_var(--shadow-ink)] press"
                  >
                    <span className="truncate">
                      <span className="font-bold capitalize">{h.mode}</span> ·{" "}
                      {h.deckTitles.join(", ") || "Mixed"}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {h.correct}/{h.answered} · +{h.xpEarned} XP
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No sessions yet.</p>
            )}
          </Widget>
        )}

        {show("weak") && (
          <Widget
            id="weak"
            title="Weak topics"
            icon={TrendingDown}
            onHide={hide}
            className="xl:col-span-4 widget-pink anim-fade-up"
          >
            {weak.length ? (
              <ul className="space-y-2 text-sm stagger">
                {weak.map((w) => (
                  <li key={w.concept} className="flex items-center justify-between gap-2 anim-fade-up">
                    <span className="truncate">
                      <MathText text={w.concept} />
                    </span>
                    <span className="shrink-0 text-xs text-destructive">
                      {Math.round(w.acc * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Answer more questions to surface trends.
              </p>
            )}
          </Widget>
        )}

        {show("decks") && (
          <Widget
            id="decks"
            title="Recent decks"
            icon={Library}
            onHide={hide}
            className="md:col-span-2 xl:col-span-8 anim-fade-up"
          >
            <div className="grid gap-3 sm:grid-cols-2 stagger">
              {[...decks]
                .sort((a, b) => (b.lastStudiedAt ?? b.createdAt) - (a.lastStudiedAt ?? a.createdAt))
                .slice(0, 4)
                .map((d) => (
                  <Link
                    key={d.id}
                    to="/decks/$deckId"
                    params={{ deckId: d.id }}
                    className="flex items-center gap-3 rounded-xl border-[2px] border-border bg-surface p-3 shadow-[2px_2px_0_0_var(--shadow-ink)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--shadow-ink)] anim-fade-up press"
                  >
                    <span
                      className="size-9 shrink-0 rounded-lg border-[2px] border-border"
                      style={{ background: d.color }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{d.title}</span>
                      <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        {d.questions.length} questions
                        <SrsDueChip deck={d} />
                      </span>
                    </span>
                  </Link>
                ))}
            </div>
          </Widget>
        )}

        {show("achievements") && (
          <Widget
            id="achievements"
            title="Achievements"
            icon={Trophy}
            onHide={hide}
            className="xl:col-span-4 anim-fade-up"
          >
            <p className="font-display text-3xl font-bold anim-pop">
              {unlocked.length}
              <span className="text-base text-muted-foreground"> / {ACHIEVEMENTS.length}</span>
            </p>
            <Link
              to="/achievements"
              className="mt-2 inline-block text-xs text-primary hover:underline anim-fade-up"
            >
              View all →
            </Link>
          </Widget>
        )}

        {show("stats") && (
          <Widget
            id="stats"
            title="Lifetime stats"
            icon={BarChart3}
            onHide={hide}
            className="md:col-span-2 xl:col-span-4 anim-fade-up"
          >
            <dl className="grid grid-cols-2 gap-3 text-sm stagger">
              <div className="anim-fade-up">
                <dt className="text-xs text-muted-foreground">Answered</dt>
                <dd className="font-semibold">{progress.totalAnswered}</dd>
              </div>
              <div className="anim-fade-up">
                <dt className="text-xs text-muted-foreground">Correct</dt>
                <dd className="font-semibold text-success">{progress.totalCorrect}</dd>
              </div>
              <div className="anim-fade-up">
                <dt className="text-xs text-muted-foreground">Quizzes</dt>
                <dd className="font-semibold">{progress.quizzesCompleted}</dd>
              </div>
              <div className="anim-fade-up">
                <dt className="text-xs text-muted-foreground">Best combo</dt>
                <dd className="font-semibold">{progress.bestCombo}</dd>
              </div>
            </dl>
          </Widget>
        )}
      </div>

      {hidden.length > 0 && (
        <p className="mt-6 text-xs text-muted-foreground">
          {hidden.length} widget{hidden.length === 1 ? "" : "s"} hidden ·{" "}
          <button
            className="text-primary hover:underline"
            onClick={() => updateSettings({ hiddenWidgets: [] })}
          >
            reset layout
          </button>
        </p>
      )}
    </div>
  );
}
