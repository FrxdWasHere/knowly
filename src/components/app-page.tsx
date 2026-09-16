import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useKnowly } from "@/store/knowly";
import { AppShell } from "./app-shell";

export function AppPage({ children }: { children: ReactNode }) {
  const { state, hydrated } = useKnowly();
  const navigate = useNavigate();

  useEffect(() => {
    if (hydrated && !state.onboardingComplete) navigate({ to: "/onboarding" });
  }, [hydrated, state.onboardingComplete, navigate]);

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}