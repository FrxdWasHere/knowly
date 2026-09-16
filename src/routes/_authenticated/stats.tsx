import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useKnowly } from "@/store/knowly";
import { dayKey, formatDuration } from "@/lib/answers";
import { levelFromXp } from "@/lib/gamification";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/stats")({
  head: () => ({
    meta: [
      { title: "Statistics — Study Analytics & Heatmap | Knowly" },
      {
        name: "description",
        content:
          "Track accuracy, study time, streaks, XP growth, weak concepts and a 12-week activity heatmap from every study and quiz session on this device.",
      },
      { property: "og:title", content: "Statistics — Knowly" },
      {
        property: "og:description",
        content: "Deep analytics on accuracy, streaks, concepts and session history.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <StatsPage />
    </AppPage>
  ),
});

function StatsPage() {
  const { state } = useKnowly();
  const p = state.progress;
  const { level, pct, intoLevel, needed } = levelFromXp(p.lifetimeXp);
  const accuracy = p.totalAnswered ? Math.round((p.totalCorrect / p.totalAnswered) * 100) : 0;

  const heatmap = useMemo(() => {
    const days: { key: string; count: number }[] = [];
    for (let i = 83; i >= 0; i--) {
      const key = dayKey(Date.now() - i * 86400000);
      days.push({ key, count: p.studyDays[key] ?? 0 });
    }
    return days;
  }, [p.studyDays]);

  const concepts = useMemo(
    () =>
      Object.entries(p.conceptStats)
        .map(([name, s]) => ({ name, ...s, pct: Math.round((s.correct / s.total) * 100) }))
        .sort((a, b) => a.pct - b.pct),
    [p.conceptStats],
  );

  const maxCount = Math.max(1, ...heatmap.map((d) => d.count));

  const cards = [
    { label: "Questions answered", value: p.totalAnswered.toLocaleString() },
    { label: "Overall accuracy", value: `${accuracy}%` },
    { label: "Study time", value: formatDuration(p.studyTimeMs) },
    { label: "Current streak", value: `${p.streak} d` },
    { label: "Longest streak", value: `${p.longestStreak} d` },
    { label: "Quizzes completed", value: `${p.quizzesCompleted}` },
    { label: "Perfect quizzes", value: `${p.perfectQuizzes}` },
    { label: "Best combo", value: `${p.bestCombo}x` },
  ];

  return (
    <div>
      <PageHeader
        title="Statistics"
        description="Every number below is computed from sessions stored locally on this device."
        action={
          <Button variant="outline" asChild>
            <Link to="/quiz">Start a quiz</Link>
          </Button>
        }
      />

      <section className="panel mb-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Level {level}</p>
            <p className="font-display text-3xl font-bold">{p.lifetimeXp.toLocaleString()} XP</p>
          </div>
          <Badge variant="secondary">
            {intoLevel}/{needed} XP to level {level + 1}
          </Badge>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="panel p-5">
            <p className="font-display text-2xl font-bold">{c.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </section>

      <section className="panel mb-6 p-6">
        <h2 className="text-sm font-semibold">Activity — last 12 weeks</h2>
        <div className="mt-4 grid grid-flow-col grid-rows-7 gap-1">
          {heatmap.map((d) => {
            const intensity = d.count === 0 ? 0 : Math.ceil((d.count / maxCount) * 4);
            return (
              <div
                key={d.key}
                title={`${d.key}: ${d.count} answered`}
                className={cn(
                  "size-3.5 rounded-[3px]",
                  intensity === 0 && "bg-secondary",
                  intensity === 1 && "bg-primary/25",
                  intensity === 2 && "bg-primary/50",
                  intensity === 3 && "bg-primary/75",
                  intensity >= 4 && "bg-primary",
                )}
              />
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-6">
          <h2 className="text-sm font-semibold">Concepts ranked by mastery</h2>
          {concepts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Answer some questions tagged with concepts to see the breakdown.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {concepts.map((c) => (
                <div key={c.name}>
                  <div className="flex justify-between text-xs">
                    <span>{c.name}</span>
                    <span className="text-muted-foreground">
                      {c.correct}/{c.total} · {c.pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        c.pct >= 80 ? "bg-success" : c.pct >= 50 ? "bg-primary" : "bg-destructive",
                      )}
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel p-6">
          <h2 className="text-sm font-semibold">Recent sessions</h2>
          {state.history.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No sessions recorded yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {state.history.slice(0, 12).map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{h.deckTitles.join(", ") || "Mixed"}</p>
                    <p className="text-muted-foreground">
                      {new Date(h.date).toLocaleString()} · {formatDuration(h.durationMs)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-sm font-bold">{h.percentage}%</p>
                    <p className="text-muted-foreground capitalize">{h.mode}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}