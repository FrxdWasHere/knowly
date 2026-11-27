import { createFileRoute } from "@tanstack/react-router";
import { AppPage } from "@/components/app-page";
import { QuizEngine } from "@/components/quiz/quiz-engine";

export const Route = createFileRoute("/_authenticated/quiz")({
  validateSearch: (search: Record<string, unknown>) =>
    typeof search.deckId === "string" ? { deckId: search.deckId } : {},
  head: () => ({
    meta: [
      { title: "Practice Quiz — Configurable Offline Quiz Engine | Knowly" },
      {
        name: "description",
        content:
          "Configure question count, types, difficulty, timers and scoring, then run a fully offline practice quiz with instant feedback, XP and a detailed report.",
      },
      { property: "og:title", content: "Practice Quiz — Knowly" },
      {
        property: "og:description",
        content: "A deeply configurable offline quiz engine with XP, combos and analytics.",
      },
    ],
  }),
  component: PracticeQuizRoute,
});

function PracticeQuizRoute() {
  const { deckId } = Route.useSearch();
  return (
    <AppPage>
      <QuizEngine key={deckId ?? "all-decks"} initialDeckId={deckId} lockedDeckId={deckId} />
    </AppPage>
  );
}
