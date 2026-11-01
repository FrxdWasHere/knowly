import { createFileRoute } from "@tanstack/react-router";
import { AppPage } from "@/components/app-page";
import { ImportRedirect } from "@/components/import-redirect";

export const Route = createFileRoute("/_authenticated/courses/import")({
  head: () => ({
    meta: [
      { title: "Import a Course — Add an AI-Made Course | Knowly" },
      {
        name: "description",
        content:
          "Paste or upload AI-generated course JSON. Knowly validates modules, lessons, markdown blocks, checkpoints, quizzes and the final exam before creating the course.",
      },
    ],
  }),
  component: () => (
    <AppPage>
      <ImportRedirect kind="course" />
    </AppPage>
  ),
});
