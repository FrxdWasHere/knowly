import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/store/auth-context";

export const Route = createFileRoute("/auth/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reset password — Knowly" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { configured, loading, user, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await updatePassword(password);
      setMessage("Your password has been updated.");
      setPassword("");
      await navigate({ to: "/dashboard" });
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Could not update your password. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="panel w-full max-w-md space-y-5 p-6 sm:p-8">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Choose a new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {user
              ? `Updating the password for ${user.email ?? "your account"}.`
              : "Use the reset link from your email to continue."}
          </p>
        </div>
        {loading ? (
          <div className="grid min-h-24 place-items-center">
            <div className="size-7 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : !configured ? (
          <p role="alert" className="text-sm text-destructive">
            Supabase isn’t configured for this build.
          </p>
        ) : user ? (
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="text-sm text-success">
                {message}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              <KeyRound /> {busy ? "Updating…" : "Update password"}
            </Button>
          </form>
        ) : (
          <p role="alert" className="text-sm text-muted-foreground">
            This reset link is invalid or expired. Request a new one from the sign-in page.
          </p>
        )}
      </section>
    </main>
  );
}
