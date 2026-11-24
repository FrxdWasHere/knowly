import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/store/auth-context";
import { useKnowly } from "@/store/knowly";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const { configured, loading, user } = useAuth();
  const { state, hydrated } = useKnowly();
  const navigate = useNavigate();
  const isAuthenticated = Boolean(user);
  const callbackError =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("error_description")
      : null;

  useEffect(() => {
    if (!loading && hydrated && isAuthenticated) {
      void navigate({
        to: state.onboardingComplete ? "/dashboard" : "/onboarding",
        replace: true,
      });
    }
  }, [loading, hydrated, isAuthenticated, state.onboardingComplete, navigate]);

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="panel w-full max-w-md space-y-3 p-6 text-center">
        <h1 className="font-display text-xl font-bold">Finishing sign-in</h1>
        {loading || (user && !hydrated) ? (
          <div className="mx-auto size-7 animate-spin rounded-full border-2 border-border border-t-primary" />
        ) : !configured ? (
          <p className="text-sm text-muted-foreground">Supabase isn’t configured for this build.</p>
        ) : callbackError ? (
          <p role="alert" className="text-sm text-destructive">
            {callbackError}
          </p>
        ) : user ? (
          <p className="text-sm text-muted-foreground">Redirecting to Knowly…</p>
        ) : (
          <>
            <p role="alert" className="text-sm text-muted-foreground">
              The sign-in link may have expired or could not be verified.
            </p>
            <Link to="/login" className="font-bold text-primary hover:underline">
              Return to sign in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
