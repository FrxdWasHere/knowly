import { useMemo, useState } from "react";
import {
  RotateCcw,
  Repeat,
  Home,
  SlidersHorizontal,
  Check,
  Copy,
  CheckCheck,
  Trophy,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDuration, TYPE_LABELS } from "@/lib/answers";
import { gradeFor } from "@/lib/gamification";
import { cn } from "@/lib/utils";
import type { AnswerRecord, QuizResult } from "@/lib/types";

export function QuizReport({
  result,
  onOverride,
  onRetry,
  onRetryIncorrect,
  onHome,
  onBackToSetup,
}: {
  result: QuizResult;
  onOverride: (index: number) => void;
  onRetry: () => void;
  onRetryIncorrect: () => void;
  onHome: () => void;
  onBackToSetup: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const wrong = result.answers.filter((a) => !a.correct);
  const skipped = result.answers.filter((a) => a.skipped);
  const answered = result.answers.length - skipped.length;
  const avgTime = result.answers.length
    ? result.answers.reduce((s, a) => s + a.timeMs, 0) / result.answers.length
    : 0;
  const fastest = result.answers.reduce((m, a) => Math.min(m, a.timeMs), Infinity);
  const slowest = result.answers.reduce((m, a) => Math.max(m, a.timeMs), 0);

  const byConcept = useMemo(() => {
    const map: Record<string, { correct: number; total: number }> = {};
    result.answers.forEach((a) => {
      const key = a.concept ?? "Uncategorized";
      const prev = map[key] ?? { correct: 0, total: 0 };
      map[key] = { correct: prev.correct + (a.correct ? 1 : 0), total: prev.total + 1 };
    });
    return Object.entries(map).sort(
      (a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total,
    );
  }, [result.answers]);

  const breakdownBy = useMemo(
    () => (key: "difficulty" | "type") => {
      const map: Record<string, { correct: number; total: number }> = {};
      result.answers.forEach((a) => {
        const k = key === "type" ? TYPE_LABELS[a.type] : a[key];
        const prev = map[k] ?? { correct: 0, total: 0 };
        map[k] = { correct: prev.correct + (a.correct ? 1 : 0), total: prev.total + 1 };
      });
      return Object.entries(map).sort(
        (a, b) => b[1].correct / b[1].total - a[1].correct / a[1].total,
      );
    },
    [result.answers],
  );

  const byDifficulty = useMemo(() => breakdownBy("difficulty"), [breakdownBy]);
  const byType = useMemo(() => breakdownBy("type"), [breakdownBy]);

  const strongest = byConcept.length ? byConcept[byConcept.length - 1] : null;
  const weakest = byConcept.length ? byConcept[0] : null;

  const verdict = useMemo(() => {
    const p = result.percentage;
    if (p === 100) return "Flawless run — every answer landed.";
    if (p >= 90) return "Excellent. This material is nearly mastered.";
    if (p >= result.config.passingScore)
      return "Solid pass. A few weak spots to shore up.";
    if (p >= 50) return "You're building. Focus the weak concepts below and retake.";
    return "Rough round. Review the deck, then come back swinging.";
  }, [result.percentage, result.config.passingScore]);

  const copyReport = async () => {
    const lines: string[] = [
      "DECKLY QUIZ REPORT",
      "======================",
      `Decks: ${result.deckTitles.join(" · ") || "Mixed decks"}`,
      `Date: ${new Date(result.createdAt).toLocaleString()}`,
      "",
      `Grade: ${gradeFor(result.percentage)} (${result.percentage}%)`,
      `Score: ${result.score}/${result.total} correct · ${skipped.length} skipped`,
      `Result: ${result.passed ? "PASSED" : "FAILED"} (target ${result.config.passingScore}%)`,
      `Duration: ${formatDuration(result.durationMs)} · Avg ${(avgTime / 1000).toFixed(1)}s/question`,
      result.xpEarned ? `XP earned: +${result.xpEarned}` : "",
      "",
      "PERFORMANCE BY CONCEPT",
      ...byConcept.map(
        ([c, s]) => `  ${c}: ${s.correct}/${s.total} (${Math.round((s.correct / s.total) * 100)}%)`,
      ),
      "",
      "BY DIFFICULTY",
      ...byDifficulty.map(
        ([d, s]) => `  ${d}: ${s.correct}/${s.total} (${Math.round((s.correct / s.total) * 100)}%)`,
      ),
      "",
      "BY QUESTION TYPE",
      ...byType.map(
        ([t, s]) => `  ${t}: ${s.correct}/${s.total} (${Math.round((s.correct / s.total) * 100)}%)`,
      ),
      "",
      "QUESTION REVIEW",
      ...result.answers.map((a, i) => {
        const status = a.skipped
          ? "SKIPPED"
          : a.correct
            ? `CORRECT${a.overridden ? " (marked as right)" : ""}`
            : "WRONG";
        return `  ${i + 1}. [${status}] ${TYPE_LABELS[a.type]} · ${a.difficulty}${a.concept ? ` · ${a.concept}` : ""} · ${(a.timeMs / 1000).toFixed(1)}s${a.given ? ` · answered "${a.given}"` : ""}`;
      }),
    ].filter((l) => l !== "");
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  const ringOffset = circumference * (1 - result.percentage / 100);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Hero: score ring + headline stats */}
      <section className="panel anim-fade-up p-8 sm:p-10">
        <div className="grid items-center gap-8 sm:grid-cols-[auto_1fr]">
          <div className="relative mx-auto size-48">
            <svg viewBox="0 0 180 180" className="size-full -rotate-90">
              <circle
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                strokeWidth="14"
                className="stroke-secondary"
              />
              <circle
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={ringOffset}
                className={cn(
                  "transition-all duration-1000",
                  result.passed ? "stroke-success" : "stroke-destructive",
                )}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <p
                  className={cn(
                    "font-display text-5xl font-black",
                    result.passed ? "text-success" : "text-destructive",
                  )}
                >
                  {gradeFor(result.percentage)}
                </p>
                <p className="font-display text-lg font-bold">{result.percentage}%</p>
              </div>
            </div>
          </div>

          <div className="text-center sm:text-left">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              {result.deckTitles.join(" · ") || "Mixed decks"}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold">
              {result.score}/{result.total} correct
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{verdict}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Badge variant={result.passed ? "default" : "destructive"}>
                {result.passed ? `Passed · target ${result.config.passingScore}%` : `Below ${result.config.passingScore}% target`}
              </Badge>
              {skipped.length > 0 && (
                <Badge variant="secondary">{skipped.length} skipped</Badge>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Time", value: formatDuration(result.durationMs) },
                { label: "Avg / Q", value: `${(avgTime / 1000).toFixed(1)}s` },
                { label: "XP earned", value: `+${result.xpEarned}` },
                { label: "Missed", value: `${wrong.length}` },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-surface-2/60 p-3 text-center">
                  <p className="font-display text-base font-bold">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Answer timeline strip */}
        <div className="mt-8">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            Answer timeline
          </p>
          <div className="flex flex-wrap gap-1">
            {result.answers.map((a, i) => (
              <div
                key={i}
                title={`Q${i + 1}: ${a.skipped ? "Skipped" : a.correct ? "Correct" : "Wrong"}`}
                className={cn(
                  "h-6 min-w-2.5 flex-1 rounded-sm",
                  a.skipped
                    ? "bg-muted-foreground/40"
                    : a.correct
                      ? a.overridden
                        ? "bg-success/50"
                        : "bg-success"
                      : "bg-destructive",
                )}
              />
            ))}
          </div>
          <div className="mt-2 flex gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-success" /> Correct</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-success/50" /> Marked right</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-destructive" /> Wrong</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-muted-foreground/40" /> Skipped</span>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button onClick={onRetry}>
            <RotateCcw /> Retake quiz
          </Button>
          <Button variant="secondary" disabled={!wrong.length} onClick={onRetryIncorrect}>
            <Repeat /> Retry missed ({wrong.length})
          </Button>
          <Button variant="outline" onClick={copyReport}>
            {copied ? <CheckCheck className="text-success" /> : <Copy />}
            {copied ? "Copied!" : "Copy report"}
          </Button>
          <Button variant="outline" onClick={onBackToSetup}>
            <SlidersHorizontal /> Change setup
          </Button>
          <Button variant="ghost" onClick={onHome}>
            <Home /> Dashboard
          </Button>
        </div>
      </section>

      {/* Insights row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {strongest && (
          <div className="panel anim-pop flex items-start gap-3 p-5">
            <Trophy className="mt-0.5 size-5 shrink-0 text-success" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Strongest concept</p>
              <p className="text-sm font-semibold">{strongest[0]}</p>
              <p className="text-xs text-muted-foreground">
                {strongest[1].correct}/{strongest[1].total} correct
              </p>
            </div>
          </div>
        )}
        {weakest && weakest[1].correct < weakest[1].total && (
          <div className="panel anim-pop flex items-start gap-3 p-5">
            <TrendingDown className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Weakest concept</p>
              <p className="text-sm font-semibold">{weakest[0]}</p>
              <p className="text-xs text-muted-foreground">
                {weakest[1].correct}/{weakest[1].total} correct — retry missed to drill it
              </p>
            </div>
          </div>
        )}
        <div className="panel anim-pop flex items-start gap-3 p-5">
          <TrendingUp className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Pace</p>
            <p className="text-sm font-semibold">
              {(fastest / 1000).toFixed(1)}s – {(slowest / 1000).toFixed(1)}s
            </p>
            <p className="text-xs text-muted-foreground">
              Fastest to slowest answer · {answered} answered
            </p>
          </div>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown title="By difficulty" rows={byDifficulty} />
        <Breakdown title="By question type" rows={byType} />
      </div>

      <section className="panel p-6">
        <h2 className="text-sm font-semibold">Performance by concept</h2>
        <div className="mt-4 space-y-3">
          {byConcept.map(([concept, s]) => {
            const pct = Math.round((s.correct / s.total) * 100);
            return (
              <div key={concept}>
                <div className="flex items-center justify-between text-xs">
                  <span>{concept}</span>
                  <span className="text-muted-foreground">
                    {s.correct}/{s.total} · {pct}%
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      pct >= 80 ? "bg-success" : pct >= 50 ? "bg-primary" : "bg-destructive",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="text-sm font-semibold">Question review</h2>
        <ul className="mt-4 space-y-3">
          {result.answers.map((a, i) => (
            <ReviewRow key={`${a.questionId}-${i}`} a={a} index={i} onOverride={onOverride} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: [string, { correct: number; total: number }][];
}) {
  return (
    <section className="panel p-6">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.map(([label, s]) => {
          const pct = Math.round((s.correct / s.total) * 100);
          return (
            <div key={label}>
              <div className="flex items-center justify-between text-xs">
                <span className="capitalize">{label}</span>
                <span className="text-muted-foreground">
                  {s.correct}/{s.total} · {pct}%
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    pct >= 80 ? "bg-success" : pct >= 50 ? "bg-primary" : "bg-destructive",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReviewRow({
  a,
  index,
  onOverride,
}: {
  a: AnswerRecord;
  index: number;
  onOverride: (index: number) => void;
}) {
  return (
    <li
      className={cn(
        "rounded-xl border p-4 text-sm",
        a.correct ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5",
      )}
    >
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="font-mono text-muted-foreground">#{index + 1}</span>
        <Badge variant="outline">{TYPE_LABELS[a.type]}</Badge>
        <Badge variant="outline" className="capitalize">
          {a.difficulty}
        </Badge>
        {a.concept && <Badge variant="secondary">{a.concept}</Badge>}
        <span className="ml-auto text-muted-foreground">{(a.timeMs / 1000).toFixed(1)}s</span>
      </div>
      <p className="mt-2">
        {a.skipped ? "Skipped" : a.correct ? "Correct" : "Incorrect"}
        {a.overridden ? " (marked as right)" : ""}
        {a.given ? ` — you answered “${a.given}”` : ""}
      </p>
      {!a.correct && !a.skipped && (
        <Button size="sm" variant="outline" className="mt-3" onClick={() => onOverride(index)}>
          <Check /> I was actually right
        </Button>
      )}
    </li>
  );
}
