import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Cloud,
  CloudDownload,
  CloudUpload,
  FileDown,
  LogOut,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/store/auth-context";
import { useCloudSync } from "@/store/cloud-sync-context";
import { useKnowly } from "@/store/knowly";

export const Route = createFileRoute("/account")({
  ssr: false,
  head: () => ({ meta: [{ title: "Account & sync — Knowly" }] }),
  component: AccountPage,
});

type Confirmation = "upload" | "restore" | null;

function AccountPage() {
  const { configured, loading: authLoading, user, signOut } = useAuth();
  const {
    status,
    hasCloudCopy,
    updatedAt,
    error,
    notice,
    uploadThisDevice,
    restoreFromCloud,
    downloadCloudBackup,
    retry,
  } = useCloudSync();
  const { state, exportState } = useKnowly();
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);

  const run = async (action: () => Promise<void>) => {
    setActionError("");
    setBusy(true);
    try {
      await action();
    } catch (syncError) {
      setActionError(syncError instanceof Error ? syncError.message : "The sync action failed.");
    } finally {
      setBusy(false);
      setConfirmation(null);
    }
  };

  const downloadLocalBackup = () => {
    const blob = new Blob([exportState()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `knowly-local-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-3xl content-start gap-5 px-4 py-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Knowly
      </Link>

      <section className="panel space-y-5 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl border-2 border-border bg-surface shadow-[2px_2px_0_0_var(--shadow-ink)]">
            <Cloud className="size-5 text-primary" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight">Account & cloud sync</h1>
            <p className="mt-1 break-all text-sm text-muted-foreground">
              {user
                ? `Signed in as ${user.email ?? "Email account"}`
                : "Manage your Knowly account and cloud copy."}
            </p>
          </div>
        </div>

        {authLoading || status === "checking" ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
            <span className="size-5 animate-spin rounded-full border-2 border-border border-t-primary" />
            Checking your account and cloud copy…
          </div>
        ) : !configured ? (
          <p
            role="alert"
            className="rounded-xl border-2 border-destructive/40 bg-destructive/10 p-4 text-sm"
          >
            Supabase isn’t configured for this build.
          </p>
        ) : !user ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sign in to keep this device in step with your account.
            </p>
            <Button asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="rounded-xl border-2 border-border bg-surface-2/60 p-4">
              <p className="mb-1 text-xs text-muted-foreground">
                This device: {state.decks.length} decks · {state.courses.length} courses ·{" "}
                {state.history.length} study sessions
              </p>
              <p className="flex items-center gap-2 font-bold">
                {status === "synced" ? (
                  <CheckCircle2 className="size-4 text-success" />
                ) : status === "error" ? (
                  <AlertTriangle className="size-4 text-destructive" />
                ) : (
                  <RefreshCw className="size-4 animate-spin text-muted-foreground" />
                )}
                {status === "synced"
                  ? "This device is in sync"
                  : status === "syncing"
                    ? "Syncing…"
                    : status === "error"
                      ? "Sync needs attention"
                      : "Waiting for the cloud copy…"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {status === "synced"
                  ? "Decks, courses, modules, progress, study history, settings, notebooks, wallpapers and your profile photo all save to your account automatically."
                  : status === "syncing"
                    ? "Keep this page open until the operation finishes."
                    : status === "error"
                      ? "Use Retry, or check your connection. A local recovery copy is saved before anything is replaced."
                      : "Knowly is reading the copy stored in your account."}
              </p>
              {updatedAt && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Cloud copy last updated: {new Date(updatedAt).toLocaleString()}
                </p>
              )}
              {notice && status === "synced" && (
                <p className="mt-2 text-xs font-medium text-primary" role="status">
                  {notice}
                </p>
              )}
            </div>

            {(error || actionError) && (
              <p
                role="alert"
                className="rounded-xl border-2 border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {actionError || error}
              </p>
            )}

            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex flex-wrap gap-3">
                {status === "error" && (
                  <Button variant="outline" onClick={retry} disabled={busy}>
                    <RefreshCw /> Retry
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setConfirmation("restore")}
                  disabled={busy}
                >
                  <CloudDownload /> Load cloud copy
                </Button>
                <Button variant="outline" onClick={() => setConfirmation("upload")} disabled={busy}>
                  <CloudUpload /> Sync this device up
                </Button>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                This device follows your account automatically. Use “Sync this device up” only when
                you want the library on this device to replace the cloud copy. “Load cloud copy”
                replaces this device with the copy stored in your account. A recovery backup is
                saved locally before either.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button variant="ghost" onClick={downloadLocalBackup}>
                <FileDown /> Save this device’s backup
              </Button>
              {hasCloudCopy && (
                <Button variant="ghost" onClick={downloadCloudBackup}>
                  <FileDown /> Save cloud backup
                </Button>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <Button
                variant="ghost"
                onClick={() => void run(signOut)}
                disabled={busy}
                className="text-muted-foreground"
              >
                <LogOut /> Sign out
              </Button>
            </div>
          </>
        )}
      </section>

      <AlertDialog
        open={confirmation !== null}
        onOpenChange={(open) => !open && setConfirmation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmation === "upload" ? "Replace the cloud copy?" : "Load the cloud copy?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation === "upload"
                ? "Everything stored under your account will be replaced with the decks, courses, notes and settings from this device."
                : "Everything on this device will be replaced with the copy stored under your account. Your current device data is saved as a recovery backup first."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                void run(confirmation === "upload" ? uploadThisDevice : restoreFromCloud)
              }
            >
              {confirmation === "upload" ? "Replace cloud copy" : "Load cloud copy"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
