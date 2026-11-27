import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, type ReactNode } from "react";
import { useKnowly } from "@/store/knowly";
import { AppShell, type SharedDeckTool } from "./app-shell";

export function AppPage({ children }: { children: ReactNode }) {
  const { state, hydrated } = useKnowly();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (router) => router.location.pathname });
  const search = useRouterState({ select: (router) => router.location.searchStr });
  const sharedDeckId = useMemo(() => {
    const pathDeckId = pathname.match(/^\/(?:study|arena|decks)\/([^/]+)/)?.[1];
    const searchParams = new URLSearchParams(search);
    const deckId = pathDeckId ?? searchParams.get("deckId") ?? searchParams.get("deck");
    return deckId?.startsWith("shared-") ? deckId : undefined;
  }, [pathname, search]);

  useEffect(() => {
    if (hydrated && !state.onboardingComplete && !sharedDeckId) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      navigate({ to: "/onboarding", search: { returnTo }, replace: true });
    }
  }, [hydrated, state.onboardingComplete, sharedDeckId, navigate]);

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (!sharedDeckId) return <AppShell>{children}</AppShell>;

  const openTool = (tool: SharedDeckTool) => {
    switch (tool) {
      case "details":
        void navigate({ to: "/decks/$deckId", params: { deckId: sharedDeckId } });
        break;
      case "study":
        void navigate({
          to: "/study/$deckId",
          params: { deckId: sharedDeckId },
          search: { part: undefined, stageId: undefined, activityId: undefined },
        });
        break;
      case "arena":
        void navigate({ to: "/arena/$deckId", params: { deckId: sharedDeckId } });
        break;
      case "review":
        void navigate({ to: "/review", search: { deck: sharedDeckId } });
        break;
      case "weak-spots":
        void navigate({ to: "/review", search: { deck: sharedDeckId, mode: "weak" } });
        break;
      case "cram":
        void navigate({ to: "/cram", search: { deckId: sharedDeckId } });
        break;
      case "quiz":
        void navigate({ to: "/quiz", search: { deckId: sharedDeckId } });
        break;
      case "exam":
        void navigate({ to: "/exam", search: { deckId: sharedDeckId } });
        break;
      case "print":
        void navigate({ to: "/print", search: { deckId: sharedDeckId } });
        break;
      case "cards":
        void navigate({ to: "/cards", search: { deckId: sharedDeckId } });
        break;
    }
  };

  return (
    <AppShell sharedView={{ kind: "deck", deckId: sharedDeckId, onNavigate: openTool }}>
      {children}
    </AppShell>
  );
}
