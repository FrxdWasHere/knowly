import { createFileRoute } from "@tanstack/react-router";
import { Keyboard } from "lucide-react";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/shortcuts")({
  head: () => ({
    meta: [
      { title: "Keyboard Shortcuts & Help — Knowly" },
      {
        name: "description",
        content:
          "Every keyboard shortcut in Knowly in one place, plus quick answers about reviews, decks, imports and where your data lives. Works fully offline.",
      },
      { property: "og:title", content: "Keyboard Shortcuts & Help — Knowly" },
      {
        property: "og:description",
        content: "Every shortcut and quick answer in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppPage>
      <ShortcutsPage />
    </AppPage>
  ),
});

const GROUPS: { title: string; items: { keys: string[]; what: string }[] }[] = [
  {
    title: "Anywhere in the app",
    items: [
      { keys: ["Ctrl", "K"], what: "Open the jump-to menu (Cmd K on Mac)" },
      { keys: ["Esc"], what: "Close the jump-to menu or any open dialog" },
      { keys: ["Tab"], what: "Move to the next control" },
      { keys: ["Shift", "Tab"], what: "Move to the previous control" },
    ],
  },
  {
    title: "Jump-to menu",
    items: [
      { keys: ["↑", "↓"], what: "Move through the results" },
      { keys: ["Enter"], what: "Open the highlighted page, deck or action" },
      { keys: ["Type"], what: "Filter pages, decks and actions as you type" },
    ],
  },
  {
    title: "Reviewing and quizzing",
    items: [
      { keys: ["Space"], what: "Reveal the answer on a flashcard" },
      { keys: ["1"], what: "Grade: Again" },
      { keys: ["2"], what: "Grade: Hard" },
      { keys: ["3"], what: "Grade: Good" },
      { keys: ["4"], what: "Grade: Easy" },
      { keys: ["Enter"], what: "Submit a typed answer" },
    ],
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Where is my data stored?",
    a: "Everything lives in this browser on this device. Nothing is uploaded anywhere, and the app works with no internet connection.",
  },
  {
    q: "How do I move my library to another device?",
    a: "Take a snapshot on the Snapshots page and download it, then load that file on the other device.",
  },
  {
    q: "What are trouble cards?",
    a: "Cards you keep forgetting after repeated attempts. The Trouble Cards page lets you set the miss count and pause, reset or rewrite those cards.",
  },
  {
    q: "Why do some cards never show up in reviews?",
    a: "They may be paused. Paused cards stay out of reviews and due counts until you unpause them on the Trouble Cards page.",
  },
  {
    q: "Can I reorganise decks without re-importing?",
    a: "Yes. Merge & Split lets you combine decks or break one deck into smaller ones by tag or size.",
  },
];

function ShortcutsPage() {
  return (
    <div>
      <PageHeader
        title="Shortcuts & Help"
        description="Every shortcut in the app, plus quick answers to the questions that come up most."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {GROUPS.map((group) => (
          <section key={group.title} className="rounded-xl border border-border bg-card/70 p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
              <Keyboard className="size-4 text-primary" />
              {group.title}
            </h2>
            <ul className="space-y-3">
              {group.items.map((item) => (
                <li key={item.what} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-foreground/85">{item.what}</span>
                  <span className="flex shrink-0 gap-1">
                    {item.keys.map((k) => (
                      <kbd
                        key={k}
                        className="rounded border border-border bg-surface px-1.5 py-0.5 text-[11px] font-semibold"
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-10 rounded-xl border border-border bg-card/50 p-6">
        <h2 className="font-display text-lg font-semibold">Quick answers</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-lg border border-border/70 p-4">
              <p className="font-medium">{item.q}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-2">
          <Badge variant="secondary">Offline</Badge>
          <span className="text-xs text-muted-foreground">
            No accounts, no syncing, no network calls — ever.
          </span>
        </div>
      </section>
    </div>
  );
}
