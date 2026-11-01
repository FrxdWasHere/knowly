import { createFileRoute } from "@tanstack/react-router";
import { AppPage } from "@/components/app-page";
import { ImportRedirect } from "@/components/import-redirect";

export const Route = createFileRoute("/_authenticated/modules/import")({
  head: () => ({
    meta: [
      { title: "Import a Module — Add an AI-Made Module | Knowly" },
      {
        name: "description",
        content:
          "Paste or upload AI-generated module JSON. Knowly validates the blocks, blurbs and checkpoint questions before adding it to your module library.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <ImportRedirect kind="module" />
    </AppPage>
  ),
});
