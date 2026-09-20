import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  Check,
  Flame,
  Minus,
  Plus,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useKnowly } from "@/store/knowly";
import { dayKey } from "@/lib/answers";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({
    meta: [
      { title: "Goals & Streaks — Keep the Flame Alive | Knowly" },
      {
        name: "description",
        content:
          "Track your daily question goal, study streak and milestone progress on a full activity calendar — all computed offline from your own history.",
      },
      { property: "og:title", content: "Goals & Streaks — Knowly" },
      {
        property: "og:description",
        content: "Daily goal tracker, streak calendar and milestone rewards.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <GoalsPage />
    </AppPage>
  ),
});

const DAY_MS = 86_400_000;

const GOAL_PRESETS = [5, 10, 20, 30, 50, 100];

const STREAK_MILESTONES = [
  { days: 7, label: "Week Warrior" },
  { days: 14, label: "Fortnight Fire" },
  { days: 30, label: "Month Master" },
  { days: 60, label: "Unstoppable" },
  { days: 100, label: "Centurion" },
  { days: 365, label: "Year Round" },
];

const LIFETIME_MILESTONES = [
  { n: 100, label: "First hundred" },
  { n: 500, label: "Five hundred" },
  { n: 1_000, label: "Kilo-answer" },
  { n: 5_000, label: "Answer machine" },
  { n: 10_000, label: "Ten thousand" },
];

function heatLevel(count: number, goal: number): number {
  if (count <= 0) return 0;
  if (count >= goal * 2) return 4;
  if (count >= goal) return 3;
  if (count >= goal * 0.5) return 2;
  return 1;
}

const HEAT_STYLE: Record<number, string> = {
  0: "bg-secondary",
  1: "bg-primary/25",
  2: "bg-primary/50",
  3: "bg-primary/75",
  4: "bg-primary",
};

function GoalsPage() {
  const { state, updateSettings } = useKnowly();
  const { progress, settings } = state;
  const [draftGoal, setDraftGoal] = useState<number | null>(null);
  const goal = draftGoal ?? settings.dailyGoal;

  const todayCount = progress.studyDays[dayKey()] ?? 0;
  const goalPct = Math.min(100, (todayCount / Math.max(1, goal)) * 100);
  const goalMet = todayCount >= goal;

  const stats = useMemo(() => {
    const now = Date.now();
    const days = Object.entries(progress.studyDays);
    const totalActive = days.filter(([, c]) => c > 0);
    const bestDay = totalActive.reduce(
      (best, [k, c]) => (c > (best?.c ?? 0) ? { k, c } : best),
      null as { k: string; c: number } | null,
    );
    const last7 = Array.from({ length: 7 }, (_, i) => progress.studyDays[dayKey(now - i * DAY_MS)] ?? 0);
    const last30 = Array.from({ length: 30 }, (_, i) => progress.studyDays[dayKey(now - i * DAY_MS)] ?? 0);
    return {
      totalActiveDays: totalActive.length,
      bestDay,
      last7Total: last7.reduce((a, b) => a + b, 0),
      last30Active: last30.filter((c) => c > 0).length,
      avgActive:
        totalActive.length === 0
          ? 0
          : Math.round(totalActive.reduce((acc, [, c]) => acc + c, 0) / totalActive.length),
    };
  }, [progress.studyDays]);

  const heat = useMemo(() => {
    const weeks = 18;
    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const todayDow = new Date(todayUtc).getUTCDay(); // 0 = Sunday
    const end = todayUtc + (6 - todayDow) * DAY_MS; // end of current week column
    const start = end - (weeks * 7 - 1) * DAY_MS;
    const columns: { key: string; count: number; isFuture: boolean; isToday: boolean }[][] = [];
    for (let w = 0; w < weeks; w++) {
      const col: { key: string; count: number; isFuture: boolean; isToday: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const ts = start + (w * 7 + d) * DAY_MS;
        const key = dayKey(ts);
        col.push({
          key,
          count: progress.studyDays[key] ?? 0,
          isFuture: ts > todayUtc,
          isToday: ts === todayUtc,
        });
      }
      columns.push(col);
    }
    return columns;
  }, [progress.studyDays]);

  const R = 54;
  const CIRC = 2 * Math.PI * R;

  return (
    <div>
      <PageHeader
        title="Goals & Streaks"
        description="Set the bar for each day, watch your streak grow, and see every study day of the last four months at a glance — all from data kept in this browser."
        action={
          <Button asChild variant="outline">
            <Link to="/review">
              <CalendarCheck /> Daily Review
            </Link>
          </Button>
        }
      />

      {/* Hero: today's ring + streak numbers */}
      <section className="mb-6 grid gap-4 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
        <div className="panel flex items-center gap-6 p-6">
          <div className="relative size-32 shrink-0">
            <svg viewBox="0 0 128 128" className="size-full -rotate-90">
              <circle cx="64" cy="64" r={R} fill="none" strokeWidth="10" className="stroke-secondary" />
              <circle
                cx="64"
                cy="64"
                r={R}
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - goalPct / 100)}
                className={cn(
                  "transition-all duration-700 ease-out",
                  goalMet ? "stroke-success" : "stroke-primary",
                )}
              />
            </svg>
            <div className="absolute inset-0 grid place-content-center text-center">
              <p className="font-display text-2xl font-bold leading-none">{todayCount}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">/ {goal} today</p>
            </div>
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold">
              {goalMet ? "Goal smashed" : "Today's goal"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {goalMet
                ? `${todayCount - goal} question${todayCount - goal === 1 ? "" : "s"} beyond target — streak safe.`
                : `${Math.max(0, goal - todayCount)} more question${goal - todayCount === 1 ? "" : "s"} to keep today on plan.`}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {GOAL_PRESETS.map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    setDraftGoal(null);
                    updateSettings({ dailyGoal: g });
                  }}
                  className={cn(
                    "press rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                    settings.dailyGoal === g
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Lower daily goal"
                onClick={() => {
                  setDraftGoal(null);
                  updateSettings({ dailyGoal: Math.max(1, settings.dailyGoal - 5) });
                }}
              >
                <Minus /> 5
              </Button>
              <input
                type="number"
                min={1}
                max={999}
                value={goal}
                onChange={(e) => setDraftGoal(Math.max(1, Math.min(999, Number(e.target.value) || 1)))}
                onBlur={() => {
                  if (draftGoal != null) updateSettings({ dailyGoal: draftGoal });
                  setDraftGoal(null);
                }}
                aria-label="Daily goal in questions"
                className="w-16 rounded-md border border-border bg-surface px-2 py-1 text-center text-sm"
              />
              <Button
                variant="ghost"
                size="sm"
                aria-label="Raise daily goal"
                onClick={() => {
                  setDraftGoal(null);
                  updateSettings({ dailyGoal: settings.dailyGoal + 5 });
                }}
              >
                <Plus /> 5
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-rows-2">
          <div className="panel p-5">
            <Flame className="size-4 text-primary" />
            <p className="mt-3 font-display text-2xl font-bold">{progress.streak}</p>
            <p className="mt-1 text-xs text-muted-foreground">Current streak (days)</p>
          </div>
          <div className="panel p-5">
            <Trophy className="size-4 text-primary" />
            <p className="mt-3 font-display text-2xl font-bold">{progress.longestStreak}</p>
            <p className="mt-1 text-xs text-muted-foreground">Longest streak (days)</p>
          </div>
          <div className="panel p-5">
            <Target className="size-4 text-primary" />
            <p className="mt-3 font-display text-2xl font-bold">{stats.bestDay ? stats.bestDay.c : 0}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              Best day{stats.bestDay ? ` · ${stats.bestDay.k}` : ""}
            </p>
          </div>
          <div className="panel p-5">
            <TrendingUp className="size-4 text-primary" />
            <p className="mt-3 font-display text-2xl font-bold">{stats.avgActive}</p>
            <p className="mt-1 text-xs text-muted-foreground">Avg / active day</p>
          </div>
          <div className="panel col-span-2 p-5 md:col-span-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                Last 7 days: <strong className="text-foreground">{stats.last7Total}</strong> questions
              </span>
              <span>
                Active days in last 30: <strong className="text-foreground">{stats.last30Active}</strong>
              </span>
              <span>
                Total study days: <strong className="text-foreground">{stats.totalActiveDays}</strong>
              </span>
              <span>
                Lifetime answers: <strong className="text-foreground">{progress.totalAnswered.toLocaleString()}</strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Heatmap */}
      <section className="panel mb-6 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Activity calendar</h2>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            less
            {[0, 1, 2, 3, 4].map((lvl) => (
              <span key={lvl} className={cn("size-3 rounded-sm", HEAT_STYLE[lvl])} />
            ))}
            more
          </div>
        </div>
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-1">
            {heat.map((col, i) => (
              <div key={i} className="flex flex-col gap-1">
                {col.map((cell) => (
                  <span
                    key={cell.key}
                    title={`${cell.key}: ${cell.count} question${cell.count === 1 ? "" : "s"}`}
                    className={cn(
                      "size-3.5 rounded-sm transition-colors",
                      cell.isFuture ? "bg-transparent" : HEAT_STYLE[heatLevel(cell.count, settings.dailyGoal)],
                      cell.isToday && "ring-1 ring-primary ring-offset-1 ring-offset-background",
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Shades scale with your daily goal — a dark square means at least one full target met.
        </p>
      </section>

      {/* Milestones */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Flame className="size-4 text-primary" /> Streak milestones
          </h2>
          <ul className="mt-4 space-y-3">
            {STREAK_MILESTONES.map((m) => {
              const achieved = progress.longestStreak >= m.days;
              const pct = Math.min(100, (progress.streak / m.days) * 100);
              return (
                <li key={m.days} className="rounded-lg border border-border px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{m.label}</p>
                      <p className="text-[11px] text-muted-foreground">{m.days} day streak</p>
                    </div>
                    {achieved ? (
                      <Badge className="gap-1 bg-success/15 text-success hover:bg-success/15">
                        <Check className="size-3" /> Earned
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {progress.streak}/{m.days}
                      </span>
                    )}
                  </div>
                  {!achieved && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-700"
                        style={{ width: `${Math.max(3, pct)}%` }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Zap className="size-4 text-primary" /> Answer milestones
          </h2>
          <ul className="mt-4 space-y-3">
            {LIFETIME_MILESTONES.map((m) => {
              const achieved = progress.totalAnswered >= m.n;
              const pct = (progress.totalAnswered / m.n) * 100;
              return (
                <li key={m.n} className="rounded-lg border border-border px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{m.label}</p>
                      <p className="text-[11px] text-muted-foreground">{m.n.toLocaleString()} answers</p>
                    </div>
                    {achieved ? (
                      <Badge className="gap-1 bg-success/15 text-success hover:bg-success/15">
                        <Check className="size-3" /> Earned
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {progress.totalAnswered.toLocaleString()}/{m.n.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {!achieved && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-700"
                        style={{ width: `${Math.max(3, pct)}%` }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
