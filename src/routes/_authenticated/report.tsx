import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileBarChart, Printer } from "lucide-react";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useKnowly } from "@/store/knowly";
import { dayKey } from "@/lib/answers";

export const Route = createFileRoute("/_authenticated/report")({
  head: () => ({
    meta: [
      { title: "Progress Report — Your Study Summary | Knowly" },
      {
        name: "description",
        content:
          "Pick a date range and get a clean, printable summary of sessions, accuracy, XP and time studied — perfect for showing a teacher or parent. Fully offline.",
      },
      { property: "og:title", content: "Progress Report — Knowly" },
      {
        property: "og:description",
        content: "A printable study summary for any date range.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppPage>
      <ReportPage />
    </AppPage>
  ),
});

function dayStart(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isoDate(ts: number) {
  return dayKey(ts);
}

function ReportPage() {
  const { state } = useKnowly();

  const today = dayStart(Date.now());
  const [from, setFrom] = useState(isoDate(today - 29 * 86400_000));
  const [to, setTo] = useState(isoDate(today));

  const fromTs = useMemo(() => new Date(`${from}T00:00:00`).getTime(), [from]);
  const toTs = useMemo(() => new Date(`${to}T23:59:59`).getTime(), [to]);

  const sessions = useMemo(
    () =>
      state.history
        .filter((s) => s.date >= fromTs && s.date <= toTs)
        .sort((a, b) => a.date - b.date),
    [state.history, fromTs, toTs],
  );

  const totals = useMemo(() => {
    const answered = sessions.reduce((n, s) => n + s.answered, 0);
    const correct = sessions.reduce((n, s) => n + s.correct, 0);
    const xp = sessions.reduce((n, s) => n + (s.xpEarned ?? 0), 0);
    const timeMs = sessions.reduce((n, s) => n + (s.durationMs ?? 0), 0);
    return {
      answered,
      correct,
      accuracy: answered ? Math.round((correct / answered) * 100) : 0,
      xp,
      minutes: Math.round(timeMs / 60_000),
      sessions: sessions.length,
    };
  }, [sessions]);

  const perDeck = useMemo(() => {
    const map = new Map<string, { answered: number; correct: number; sessions: number }>();
    for (const s of sessions) {
      for (const title of s.deckTitles) {
        const entry = map.get(title) ?? { answered: 0, correct: 0, sessions: 0 };
        entry.answered += s.answered;
        entry.correct += s.correct;
        entry.sessions += 1;
        map.set(title, entry);
      }
    }
    return [...map.entries()].sort((a, b) => b[1].answered - a[1].answered);
  }, [sessions]);

  const daily = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of sessions)
      map.set(dayStart(s.date), (map.get(dayStart(s.date)) ?? 0) + s.answered);
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [sessions]);

  const maxDaily = Math.max(1, ...daily.map(([, n]) => n));
  const rangeDays = Math.max(1, Math.round((toTs - fromTs) / 86400_000) + 1);
  const studyDays = daily.filter(([, n]) => n > 0).length;

  const stats = [
    { label: "Sessions", value: String(totals.sessions) },
    { label: "Questions answered", value: String(totals.answered) },
    { label: "Correct", value: `${totals.correct} (${totals.accuracy}%)` },
    { label: "XP earned", value: String(totals.xp) },
    { label: "Time studied", value: `${totals.minutes} min` },
    { label: "Study days", value: `${studyDays} of ${rangeDays}` },
  ];

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title="Progress Report"
          description="Pick a date range for a clean summary of everything studied in that window — then print it or save it as a PDF."
          action={
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 size-4" /> Print report
            </Button>
          }
        />

        <div className="mb-8 flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card/70 p-5">
          <div className="grid gap-2">
            <Label htmlFor="rep-from">From</Label>
            <Input
              id="rep-from"
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rep-to">To</Label>
            <Input
              id="rep-to"
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFrom(isoDate(today - 6 * 86400_000));
                setTo(isoDate(today));
              }}
            >
              Last 7 days
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFrom(isoDate(today - 29 * 86400_000));
                setTo(isoDate(today));
              }}
            >
              Last 30 days
            </Button>
          </div>
        </div>
      </div>

      <article className="rounded-xl border border-border bg-card/70 p-6 print:border-0 print:bg-white">
        <header className="border-b border-border pb-4 print:border-black">
          <h2 className="font-display text-xl font-bold">Study Report</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {state.settings.displayName} · {new Date(fromTs).toLocaleDateString()} –{" "}
            {new Date(toTs).toLocaleDateString()}
          </p>
        </header>

        {sessions.length === 0 ? (
          <div className="py-12 text-center">
            <FileBarChart className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="font-medium">No sessions in this range</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Study a few decks and the report will fill itself in.
            </p>
          </div>
        ) : (
          <>
            <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border border-border/70 p-4 print:border-gray-300"
                >
                  <p className="font-display text-2xl font-bold">{s.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </section>

            {daily.length > 0 && (
              <section className="mt-8">
                <h3 className="text-sm font-semibold">Questions per day</h3>
                <div className="mt-3 flex h-28 items-end gap-1" aria-hidden="true">
                  {daily.map(([day, n]) => (
                    <div
                      key={day}
                      title={`${isoDate(day)}: ${n} questions`}
                      className="flex-1 rounded-t bg-primary/70 print:bg-gray-700"
                      style={{ height: `${Math.max(4, (n / maxDaily) * 100)}%` }}
                    />
                  ))}
                </div>
              </section>
            )}

            {perDeck.length > 0 && (
              <section className="mt-8">
                <h3 className="text-sm font-semibold">By deck</h3>
                <div className="overflow-x-auto">
                  <table className="mt-3 w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="pb-2">Deck</th>
                        <th className="pb-2">Sessions</th>
                        <th className="pb-2">Answered</th>
                        <th className="pb-2">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perDeck.map(([title, v]) => (
                        <tr key={title} className="border-t border-border/70 print:border-gray-300">
                          <td className="max-w-[46vw] break-words py-2 pr-3 font-medium">
                            {title}
                          </td>
                          <td className="py-2">{v.sessions}</td>
                          <td className="py-2">{v.answered}</td>
                          <td className="py-2">
                            {v.answered ? Math.round((v.correct / v.answered) * 100) : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </article>
    </div>
  );
}
