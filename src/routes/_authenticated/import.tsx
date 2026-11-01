import { createFileRoute } from "@tanstack/react-router";
import { AppPage } from "@/components/app-page";
import { ImportRedirect } from "@/components/import-redirect";

export const Route = createFileRoute("/_authenticated/import")({
  validateSearch: (search: Record<string, unknown>): { deck?: string } => ({
    deck: typeof search.deck === "string" ? search.deck : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Import — Bring Decks, Courses and Modules In | Knowly" },
      {
        name: "description",
        content:
          "One side panel imports every Knowly JSON file — decks, question packs, courses, modules, notebooks and full backups — after checking the schema and previewing what will land.",
      },
      { property: "og:title", content: "Import — Knowly" },
      {
        property: "og:description",
        content: "Validate and import every kind of Knowly file from one place.",
      },
    ],
  }),
  component: ImportRoute,
});

function ImportRoute() {
  const { deck } = Route.useSearch();
  return (
    <AppPage>
      <ImportRedirect deckId={deck} />
    </AppPage>
  );
}
