import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SharedResourceView } from "@/components/share/shared-resource-view";
import { clearDevSharePreview, getDevSharePreview } from "@/lib/dev-share-preview";

export const Route = createFileRoute("/share-preview/$previewId")({
  head: () => ({
    meta: [
      { title: "Share preview — Knowly" },
      {
        name: "description",
        content: "Preview how a resource appears to someone viewing its share link.",
      },
    ],
  }),
  component: SharePreviewPage,
});

function SharePreviewPage() {
  const { previewId } = Route.useParams();
  const resource = getDevSharePreview(previewId);

  if (resource) {
    return (
      <SharedResourceView
        resource={resource}
        shareId={previewId}
        previewMode
        onExitPreview={() => {
          clearDevSharePreview(previewId);
          window.history.back();
        }}
      />
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-7 text-center shadow-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <BookOpen className="size-5" />
        </div>
        <h1 className="mt-4 font-display text-xl font-semibold">This preview has expired</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Share previews only live in this development session. Reopen the content and start a new
          preview.
        </p>
        <Button asChild className="mt-5">
          <Link to="/dashboard">Back to Knowly</Link>
        </Button>
      </section>
    </main>
  );
}
