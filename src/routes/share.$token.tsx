import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SharedResourceView } from "@/components/share/shared-resource-view";
import { isValidShareToken, readSharedResource } from "@/lib/share-links";
import type { SharedResource } from "@/lib/share-content";
import { useAuth } from "@/store/auth-context";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; resource: SharedResource }
  | { status: "unavailable" }
  | { status: "error" };

export const Route = createFileRoute("/share/$token")({
  head: () => ({
    meta: [
      { title: "Shared learning resource — Knowly" },
      {
        name: "description",
        content: "View a learning resource shared with you on Knowly.",
      },
    ],
  }),
  component: SharedResourcePage,
});

function SharedResourcePage() {
  const { token } = Route.useParams();
  const { configured, loading: authLoading, user } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    if (!isValidShareToken(token)) {
      setState({ status: "unavailable" });
      return () => {
        active = false;
      };
    }
    if (authLoading) return;

    setState({ status: "loading" });
    void readSharedResource(token)
      .then((resource) => {
        if (!active) return;
        setState(resource ? { status: "ready", resource } : { status: "unavailable" });
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error("[Sharing] Could not load shared resource:", error);
        setState({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, [authLoading, token, user?.id]);

  if (state.status === "ready") {
    return <SharedResourceView resource={state.resource} />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-7 text-center shadow-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          {state.status === "loading" ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <BookOpen className="size-5" />
          )}
        </div>
        <h1 className="mt-4 font-display text-xl font-semibold">
          {state.status === "loading"
            ? "Opening shared resource…"
            : state.status === "error"
              ? "Could not open this resource"
              : "This link isn’t available"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {state.status === "loading"
            ? "Checking the link and its access settings."
            : state.status === "error"
              ? "There was a problem connecting to Knowly. Check your connection and try again."
              : "The link may have been removed, or access may be restricted to invited Knowly accounts. If you were invited, use the confirmed email address on your Knowly account."}
        </p>
        {state.status === "unavailable" && configured && !user && (
          <Button asChild className="mt-5">
            <Link to="/login">Sign in to check access</Link>
          </Button>
        )}
        {state.status === "error" && (
          <Button className="mt-5" variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        )}
      </section>
    </main>
  );
}
