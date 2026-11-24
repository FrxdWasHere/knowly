import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  Chrome,
  Eye,
  EyeOff,
  Layers,
  Lock,
  Mail,
  NotebookPen,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/store/auth-context";
import { useKnowly } from "@/store/knowly";
import { useAvatarUrl } from "@/lib/use-avatar-url";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — Knowly" }] }),
  component: LoginPage,
});

type Mode = "signin" | "signup" | "reset";

const MODE_COPY: Record<Mode, { title: string; subtitle: string; submit: string }> = {
  signin: {
    title: "Welcome back",
    subtitle: "Sign in and your decks, notebooks and progress are waiting.",
    submit: "Sign in",
  },
  signup: {
    title: "Create your Knowly",
    subtitle: "One account for every deck, notebook and study streak.",
    submit: "Create account",
  },
  reset: {
    title: "Reset your password",
    subtitle: "We’ll email you a link to choose a new password.",
    submit: "Send reset link",
  },
};

const HIGHLIGHTS = [
  {
    icon: Layers,
    tint: "bg-block-lemon",
    title: "Your whole library",
    body: "Decks, courses, modules, papers and notebooks come with you.",
  },
  {
    icon: Sparkles,
    tint: "bg-block-mint",
    title: "Everything in step",
    body: "Study on one device, open another and carry on from the same place.",
  },
  {
    icon: ShieldCheck,
    tint: "bg-block-sky",
    title: "Kept to yourself",
    body: "Your account holds the copy. Nothing is shared, sold or tracked.",
  },
];

function LoginPage() {
  const {
    configured,
    loading,
    user,
    error: sessionError,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    signOut,
  } = useAuth();
  const { state, hydrated } = useKnowly();
  const navigate = useNavigate();
  const isAuthenticated = Boolean(user);
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const avatarUrl = useAvatarUrl(state.settings.avatarImage);

  useEffect(() => {
    if (!loading && hydrated && isAuthenticated) {
      void navigate({
        to: state.onboardingComplete ? "/dashboard" : "/onboarding",
        replace: true,
      });
    }
  }, [loading, hydrated, isAuthenticated, state.onboardingComplete, navigate]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    setMessage("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
      } else if (mode === "signup") {
        const signedIn = await signUpWithEmail(email, password);
        setMessage(
          signedIn
            ? "Your account is ready. You are signed in."
            : "Check your email for a confirmation link, then return here to sign in.",
        );
      } else {
        await sendPasswordReset(email);
        setMessage("If an account exists for that address, a password-reset link is on its way.");
      }
    } catch (authError) {
      setError(
        authError instanceof Error ? authError.message : "Authentication failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const googleSignIn = async () => {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (authError) {
      setError(
        authError instanceof Error ? authError.message : "Google sign-in failed. Try again.",
      );
      setBusy(false);
    }
  };

  const signOutHere = async () => {
    setError("");
    setBusy(true);
    try {
      await signOut();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Could not sign out. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const copy = MODE_COPY[mode];
  const localAccountOption = (
    <div className="space-y-2 border-t-2 border-border pt-4">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={() =>
          void navigate({ to: state.onboardingComplete ? "/dashboard" : "/onboarding" })
        }
      >
        Continue with a local account <ArrowRight />
      </Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">
        No email or password needed. Your library stays on this device. You can set up login later
        from Account &amp; sync.
      </p>
    </div>
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 dot-grid-soft opacity-70" />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 size-72 rotate-12 rounded-[2.5rem] border-[3px] border-border bg-block-lemon/60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -right-16 size-80 -rotate-12 rounded-[3rem] border-[3px] border-border bg-block-sky/60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_75%)]"
      />

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:py-14">
        {/* Story side — desktop only, so the form is the first thing on a phone. */}
        <section className="hidden lg:block">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl border-[3px] border-border bg-surface shadow-[3px_3px_0_0_var(--shadow-ink)]">
              <Logo className="size-8 rounded-lg" />
            </span>
            <div>
              <p className="font-display text-xl font-bold leading-none tracking-tight">Knowly</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Study forge
              </p>
            </div>
          </div>

          <span className="anim-pop mt-10 inline-flex items-center gap-2 rounded-full border-2 border-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground shadow-[2px_2px_0_0_var(--shadow-ink)]">
            <Sparkles className="size-3.5 text-primary" />
            Your account, your library
          </span>

          <h1 className="mt-5 font-display text-[clamp(2rem,3.4vw,2.9rem)] font-bold leading-[1.06] tracking-tight">
            Pick up exactly where you left off.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
            Knowly already writes the prompts, checks what comes back and keeps the numbers. Sign in
            so the work you do here follows you.
          </p>

          <ul className="stagger mt-8 grid gap-3">
            {HIGHLIGHTS.map((item) => (
              <li
                key={item.title}
                className="hover-lift flex items-start gap-3 rounded-2xl border-[3px] border-border bg-surface p-4 shadow-[3px_3px_0_0_var(--shadow-ink)]"
              >
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl border-2 border-border text-ink",
                    item.tint,
                  )}
                >
                  <item.icon className="size-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="relative mt-10 h-32">
            <div
              aria-hidden
              className="absolute left-0 top-2 w-64 -rotate-2 rounded-xl border-[3px] border-border bg-block-lemon px-4 py-3 text-ink shadow-[4px_4px_0_0_var(--shadow-ink)]"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-70">
                Cell biology · 42 cards
              </p>
              <p className="mt-1.5 text-sm font-bold leading-snug">
                Which organelle releases energy from glucose?
              </p>
            </div>
            <div
              aria-hidden
              className="absolute left-36 top-16 w-56 rotate-2 rounded-xl border-[3px] border-border bg-surface px-4 py-3 shadow-[4px_4px_0_0_var(--shadow-ink)]"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Answer
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-primary">
                <Check className="size-4" /> The mitochondrion
              </p>
            </div>
          </div>
        </section>

        {/* Account side */}
        <section className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="grid size-11 place-items-center rounded-xl border-[3px] border-border bg-surface shadow-[3px_3px_0_0_var(--shadow-ink)]">
              <Logo className="size-7 rounded-lg" />
            </span>
            <div>
              <p className="font-display text-lg font-bold leading-none tracking-tight">Knowly</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Study forge
              </p>
            </div>
          </div>

          <div className="anim-fade-up panel overflow-hidden">
            <div className="border-b-[3px] border-border bg-surface-2/60 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <Lock className="size-3" />
                Account
              </div>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">{copy.title}</h2>
              <p className="mt-1 text-[13px] leading-5 text-muted-foreground">{copy.subtitle}</p>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              {!configured ? (
                <>
                  <div
                    role="alert"
                    className="rounded-xl border-2 border-destructive/40 bg-destructive/10 p-4 text-sm"
                  >
                    Supabase isn’t configured for this build. Add the Vite Supabase URL and
                    publishable key to the app environment, then restart or redeploy.
                  </div>
                  {localAccountOption}
                </>
              ) : loading ? (
                <div className="grid min-h-40 place-items-center" aria-label="Checking sign-in">
                  <div className="size-7 animate-spin rounded-full border-2 border-border border-t-primary" />
                </div>
              ) : user ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl border-2 border-border bg-surface-2/60 p-3">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        className="size-11 shrink-0 rounded-lg border-2 border-border object-cover"
                      />
                    ) : (
                      <span className="grid size-11 shrink-0 place-items-center rounded-lg border-2 border-border bg-block-lemon text-xl text-ink">
                        {state.settings.avatarEmoji || "🌊"}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {state.settings.displayName || "Signed in"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email ?? "Google account"}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Button asChild size="lg" className="w-full">
                      <Link to={state.onboardingComplete ? "/dashboard" : "/onboarding"}>
                        Continue to Knowly <ArrowRight />
                      </Link>
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button asChild variant="outline" className="w-full">
                        <Link to="/account">Account & sync</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => void signOutHere()}
                        disabled={busy}
                      >
                        Sign out
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {(sessionError || error) && (
                    <p
                      role="alert"
                      className="rounded-xl border-2 border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                    >
                      {error || sessionError}
                    </p>
                  )}
                  {message && (
                    <p
                      role="status"
                      className="rounded-xl border-2 border-success/40 bg-success/10 p-3 text-sm"
                    >
                      {message}
                    </p>
                  )}

                  <div
                    role="tablist"
                    aria-label="Account action"
                    className="grid grid-cols-2 gap-1 rounded-xl border-2 border-border bg-surface-2/60 p-1"
                  >
                    {(["signin", "signup"] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={mode === value}
                        onClick={() => switchMode(value)}
                        className={cn(
                          "press rounded-lg px-3 py-2 text-sm font-bold transition-colors",
                          mode === value
                            ? "bg-surface text-foreground shadow-[2px_2px_0_0_var(--shadow-ink)]"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {value === "signin" ? "Sign in" : "Create account"}
                      </button>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={() => void googleSignIn()}
                    disabled={busy}
                  >
                    <Chrome /> Continue with Google
                  </Button>

                  <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <span className="h-[2px] flex-1 bg-border" />
                    or with email
                    <span className="h-[2px] flex-1 bg-border" />
                  </div>

                  <form onSubmit={(event) => void submit(event)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="auth-email">Email</Label>
                      <Input
                        id="auth-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@school.edu"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </div>
                    {mode !== "reset" && (
                      <div className="space-y-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <Label htmlFor="auth-password">Password</Label>
                          {mode === "signin" && (
                            <button
                              type="button"
                              className="text-xs font-semibold text-primary hover:underline"
                              onClick={() => switchMode("reset")}
                            >
                              Forgot password?
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            id="auth-password"
                            type={showPassword ? "text" : "password"}
                            autoComplete={mode === "signup" ? "new-password" : "current-password"}
                            required
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="pr-11"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((shown) => !shown)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            aria-pressed={showPassword}
                            className="press absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    <Button type="submit" size="lg" className="w-full" disabled={busy}>
                      {mode === "reset" ? <Mail /> : <Lock />}
                      {busy ? "Please wait…" : copy.submit}
                      {!busy && mode !== "reset" && <ArrowRight />}
                    </Button>
                  </form>

                  {mode === "reset" && (
                    <button
                      type="button"
                      className="w-full text-center text-sm font-bold text-primary hover:underline"
                      onClick={() => switchMode("signin")}
                    >
                      Back to sign in
                    </button>
                  )}

                  {localAccountOption}

                  <div className="flex items-start gap-2 border-t-2 border-border pt-4 text-[11px] leading-5 text-muted-foreground">
                    <NotebookPen className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      Your account keeps a private copy of your library so your next device picks up
                      where this one stopped. You can manage or remove it anytime from Account &
                      sync.
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="mt-5 text-center text-[11px] text-muted-foreground">
            <Link to="/privacy" className="font-semibold hover:text-foreground hover:underline">
              Privacy
            </Link>
            <span className="px-2 opacity-50">·</span>
            <Link to="/terms" className="font-semibold hover:text-foreground hover:underline">
              Terms
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
