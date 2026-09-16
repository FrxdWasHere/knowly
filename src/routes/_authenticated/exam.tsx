import { createFileRoute } from "@tanstack/react-router";
import { AppPage } from "@/components/app-page";
import { QuizEngine } from "@/components/quiz/quiz-engine";

export const Route = createFileRoute("/_authenticated/exam")({
  head: () => ({
    meta: [
      { title: "Exam Simulator — Timed Mixed-Deck Mock Exams | Knowly" },
      {
        name: "description",
        content:
          "Sit a timed mock exam mixing every deck, with no feedback until you finish and a fully graded report — computed offline in your browser.",
      },
      { property: "og:title", content: "Exam Simulator — Knowly" },
      {
        property: "og:description",
        content: "Timed mock exams across all decks with a graded report.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <QuizEngine exam />
    </AppPage>
  ),
});
