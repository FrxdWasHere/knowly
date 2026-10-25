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
import { Button } from "@/components/ui/button";
import { SrsDashboardWidget } from "@/components/srs/srs-dashboard-widget";
import { SrsDueChip } from "@/components/srs/srs-status-badge";
import { collectDue } from "@/lib/srs";
import { useKnowly } from "@/store/knowly";
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

function Widget({
  id,
  title,
  icon: Icon,
  children,
  className,
  onHide,
}: {
  id: string;
  title: string;
  icon: React.ElementType;
  children: ReactNode;
  className?: string;
  onHide: (id: string) => void;
}) {
  return (
    <section className={cn("panel group relative p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Icon className="size-4 text-primary" />
          {title}
        </h2>
        <button
          aria-label={`Hide ${title} widget`}
          onClick={() => onHide(id)}
          className="grid min-h-[44px] min-w-[44px] place-items-center opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        >
          <EyeOff className="size-3.5 text-muted-foreground hover:text-foreground" />
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

  const hello = `${settings.avatarEmoji} ${greeting()}, ${settings.displayName || "there"}`;
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
        <div className="panel grid gap-4 p-8 sm:grid-cols-2 lg:grid-cols-3">
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
              className="rounded-xl border border-border bg-surface-2/50 p-5 transition-colors hover:border-primary/60"
            >
              <c.icon className="size-5 text-primary" />
              <p className="mt-3 font-semibold">{c.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.body}</p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={hello}
        description={[
          contextLine,
          settings.studyReason ? `Studying for ${settings.studyReason.toLowerCase()}` : "",
          goalMet
            ? `Daily goal of ${settings.dailyGoal} done — nice work.`
            : `${Math.max(0, settings.dailyGoal - todayCount)} questions to hit today's goal.`,
        ]
          .filter(Boolean)
          .join(" · ")}
        action={
          hidden.length ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSettings({ hiddenWidgets: [] })}
            >
              <RotateCcw /> Reset layout
            </Button>
          ) : dueNow ? (
            <Button className="anim-glow" asChild>
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
          )
        }
      />

      <div className="grid grid-flow-row-dense gap-4 md:grid-cols-2 xl:grid-cols-12">
        {show("srs") && decks.length > 0 && (
          <Widget
            id="srs"
            title="Review schedule"
            icon={Brain}
            onHide={hide}
            className="md:col-span-2 xl:col-span-12"
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
            className="md:col-span-2 xl:col-span-8"
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
                <Button asChild className="min-h-[44px]">
                  <Link to="/study/$deckId" params={{ deckId: recentDeck.id }}>
                    Study
                  </Link>
                </Button>
                <Button variant="outline" asChild className="min-h-[44px]">
                  <Link to="/quiz">Quiz</Link>
                </Button>
              </div>
            </div>
            {settings.showProgressBars && (
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
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
            className="xl:col-span-4"
          >
            <p className="font-display text-3xl font-bold">
              {todayCount}
              <span className="text-base text-muted-foreground"> / {settings.dailyGoal}</span>
            </p>
            {settings.showProgressBars && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-success" style={{ width: `${goalPct}%` }} />
              </div>
            )}
            <p className={cn("mt-2 text-xs", goalMet ? "text-success" : "text-muted-foreground")}>
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
            className="md:col-span-2 xl:col-span-8"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {subjectRows.map((s) => (
                <Link
                  key={s.subject}
                  to="/decks"
                  search={{ q: s.subject }}
                  className="rounded-lg border border-border p-3 transition-colors hover:border-primary/60"
                >
                  <p className="text-sm font-medium">{s.subject}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.deckCount
                      ? `${s.deckCount} deck${s.deckCount === 1 ? "" : "s"} · ${s.mastered}/${s.total} mastered`
                      : "No decks yet — build one"}
                  </p>
                  {settings.showProgressBars && s.total > 0 && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
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
          <Widget id="level" title="Level & XP" icon={Zap} onHide={hide} className="xl:col-span-4">
            <div className="flex items-baseline gap-2">
              <span className="ocean-text font-display text-3xl font-bold">Lv {level}</span>
              <span className="text-xs text-muted-foreground">
                {intoLevel}/{needed} XP
              </span>
            </div>
            {settings.showProgressBars && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
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
            className="xl:col-span-4"
          >
            <p className="font-display text-3xl font-bold">{progress.streak} days</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Longest {progress.longestStreak} · {formatDuration(progress.studyTimeMs)} studied
            </p>
          </Widget>
        )}

        {show("due") && (
          <Widget id="due" title="Cards due" icon={Clock} onHide={hide} className="xl:col-span-4">
            <p className="font-display text-3xl font-bold">{dueNow}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              due now · {unmastered} still unmastered · {accuracy}% lifetime accuracy
            </p>
            {dueNow > 0 && (
              <Link to="/review" className="mt-2 inline-block text-xs text-primary hover:underline">
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
            className="md:col-span-2 xl:col-span-8"
          >
            {history.length ? (
              <ul className="space-y-2">
                {history.slice(0, 5).map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between rounded-lg bg-surface-2/60 px-3 py-2 text-sm"
                  >
                    <span className="truncate">
                      <span className="font-medium capitalize">{h.mode}</span> ·{" "}
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
            className="xl:col-span-4"
          >
            {weak.length ? (
              <ul className="space-y-2 text-sm">
                {weak.map((w) => (
                  <li key={w.concept} className="flex items-center justify-between gap-2">
                    <span className="truncate">{w.concept}</span>
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
            className="md:col-span-2 xl:col-span-8"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {[...decks]
                .sort((a, b) => (b.lastStudiedAt ?? b.createdAt) - (a.lastStudiedAt ?? a.createdAt))
                .slice(0, 4)
                .map((d) => (
                  <Link
                    key={d.id}
                    to="/decks/$deckId"
                    params={{ deckId: d.id }}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/60"
                  >
                    <span className="size-9 shrink-0 rounded-lg" style={{ background: d.color }} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{d.title}</span>
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
            className="xl:col-span-4"
          >
            <p className="font-display text-3xl font-bold">
              {unlocked.length}
              <span className="text-base text-muted-foreground"> / {ACHIEVEMENTS.length}</span>
            </p>
            <Link
              to="/achievements"
              className="mt-2 inline-block text-xs text-primary hover:underline"
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
            className="md:col-span-2 xl:col-span-4"
          >
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Answered</dt>
                <dd className="font-semibold">{progress.totalAnswered}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Correct</dt>
                <dd className="font-semibold text-success">{progress.totalCorrect}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Quizzes</dt>
                <dd className="font-semibold">{progress.quizzesCompleted}</dd>
              </div>
              <div>
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
