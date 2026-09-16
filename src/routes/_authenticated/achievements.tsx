import { createFileRoute } from "@tanstack/react-router";
import * as LucideIcons from "lucide-react";
import { Lock, Trophy, Award, type LucideIcon } from "lucide-react";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { ACHIEVEMENTS } from "@/lib/gamification";
import { useKnowly } from "@/store/knowly";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements — Unlock Study Milestones | Knowly" },
      {
        name: "description",
        content:
          "See every Knowly achievement, what unlocks it, and how close you are to earning the next milestone badge.",
      },
      { property: "og:title", content: "Achievements — Knowly" },
      {
        property: "og:description",
        content: "Track unlocked and locked study milestones earned entirely offline.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <AchievementsPage />
    </AppPage>
  ),
});

function AchievementsPage() {
  const { state } = useKnowly();
  const unlocked = state.progress.unlockedAchievements;
  const iconFor = (name: string): LucideIcon =>
    ((LucideIcons as unknown as Record<string, LucideIcon>)[name] ?? Award);

  return (
    <div>
      <PageHeader
        title="Achievements"
        description={`${unlocked.length} of ${ACHIEVEMENTS.length} unlocked.`}
        action={
          <Badge variant="secondary" className="gap-1.5">
            <Trophy className="size-3.5" />
            {Math.round((unlocked.length / ACHIEVEMENTS.length) * 100)}% complete
          </Badge>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const has = unlocked.includes(a.id);
          return (
            <article
              key={a.id}
              className={cn(
                "panel flex gap-4 p-5 transition-colors",
                has ? "border-primary/40" : "opacity-70",
              )}
            >
              <div
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-xl text-lg",
                  has ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
                )}
              >
                {has ? (
                  (() => {
                    const Icon = iconFor(a.icon);
                    return <Icon className="size-5" />;
                  })()
                ) : (
                  <Lock className="size-4" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold">{a.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                {has && (
                  <Badge variant="outline" className="mt-2 text-[10px] text-primary">
                    Unlocked
                  </Badge>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}