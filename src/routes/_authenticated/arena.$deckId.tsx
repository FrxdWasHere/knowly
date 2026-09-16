import { createFileRoute } from "@tanstack/react-router";
import { AppPage } from "@/components/app-page";
import { DeckArena } from "@/components/arena/deck-arena";

export const Route = createFileRoute("/_authenticated/arena/$deckId")({
  head: () => ({
    meta: [
      { title: "Deck Arena — Interactive XP Duel | Knowly" },
      {
        name: "description",
        content:
          "Play your deck as a fast interactive round: gain XP for correct answers, lose XP and lives for misses, and bank whatever survives into your profile.",
      },
      { property: "og:title", content: "Deck Arena — Knowly" },
      {
        property: "og:description",
        content: "Combo multipliers, lives and timed rounds — an offline XP duel against your deck.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { deckId } = Route.useParams();
  return (
    <AppPage>
      <DeckArena deckId={deckId} />
    </AppPage>
  );
}