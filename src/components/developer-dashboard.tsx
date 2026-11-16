import { useEffect, useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Bug,
  ClipboardCopy,
  Download,
  ExternalLink,
  Eye,
  Gauge,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { buildSampleProfile } from "@/lib/sample-profile";
import { collectDue } from "@/lib/srs";
import { estimateStorageUsage, formatBytes, type StorageUsage } from "@/lib/storage-usage";
import { cn } from "@/lib/utils";
import { useKnowly } from "@/store/knowly";

type ConfirmAction = "demo" | "quiz-checkpoints" | null;

const QUICK_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/decks", label: "Decks" },
  { to: "/generate", label: "Prompt Studio" },
  { to: "/quiz", label: "Quiz" },
  { to: "/stats", label: "Statistics" },
  { to: "/settings", label: "Settings" },
] as const;

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-background/70 p-3">
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate font-display text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

export function DeveloperDashboard() {
  const { state, hydrated, setState, updateSettings, exportState, importState } = useKnowly();
  const pathname = useRouterState({ select: (router) => router.location.pathname });
  const [open, setOpen] = useState(false);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const questionCount = useMemo(() => {
    const deckQuestions = state.decks.reduce((count, deck) => count + deck.questions.length, 0);
    const courseQuestions = state.courses.reduce((count, course) => {
      let total = course.finalExam?.questions.length ?? 0;
      for (const module of course.modules) {
        total += module.quiz?.questions.length ?? 0;
        for (const lesson of module.lessons) total += lesson.questions.length;
      }
      return count + total;
    }, 0);
    const moduleQuestions = state.modules.reduce(
      (count, module) => count + module.questions.length,
      0,
    );
    return deckQuestions + courseQuestions + moduleQuestions;
  }, [state.courses, state.decks, state.modules]);

  const bookmarkedCount = useMemo(
    () => state.decks.reduce((count, deck) => count + deck.bookmarks.length, 0),
    [state.decks],
  );
  const dueCount = useMemo(() => collectDue(state.decks).length, [state.decks]);

  const diagnostics = useMemo(
    () => ({
      appVersion: "4.1.0",
      buildMode: import.meta.env.MODE,
      stateVersion: state.version,
      hydrated,
      route: pathname,
      viewport,
      counts: {
        decks: state.decks.length,
        courses: state.courses.length,
        standaloneModules: state.modules.length,
        questions: questionCount,
        bookmarks: bookmarkedCount,
        dueCards: dueCount,
        historyEntries: state.history.length,
        quizResults: state.results.length,
        savedQuizCheckpoints: state.savedQuizSessions.length,
      },
      storage: storageUsage
        ? {
            usedBytes: storageUsage.usedBytes,
            quotaBytes: storageUsage.quotaBytes,
            percent: storageUsage.percent,
          }
        : null,
    }),
    [
      bookmarkedCount,
      dueCount,
      hydrated,
      pathname,
      questionCount,
      state.courses.length,
      state.decks.length,
      state.history.length,
      state.modules.length,
      state.results.length,
      state.savedQuizSessions.length,
      state.version,
      storageUsage,
      viewport,
    ],
  );

  useEffect(() => {
    const updateViewport = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void estimateStorageUsage().then((usage) => {
      if (active) setStorageUsage(usage);
    });
    return () => {
      active = false;
    };
  }, [open, state.decks.length, state.history.length, state.results.length]);

  const copyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
      toast.success("Redacted diagnostics copied");
    } catch (error) {
      console.error("[DeveloperDashboard] Couldn't copy diagnostics:", error);
      toast.error("Clipboard access failed. Check this browser's permissions and try again.");
    }
  };

  const downloadBackup = () => {
    try {
      const blob = new Blob([exportState()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `knowly-dev-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      toast.success("Full backup downloaded");
    } catch (error) {
      console.error("[DeveloperDashboard] Couldn't export backup:", error);
      toast.error("Couldn't export the backup");
    }
  };

  const confirmPendingAction = () => {
    if (confirmAction === "demo") {
      const sample = buildSampleProfile();
      if (!importState(JSON.stringify(sample))) {
        toast.error("Couldn't load the demo profile");
        return;
      }
      toast.success("Demo profile loaded");
      setOpen(false);
    } else if (confirmAction === "quiz-checkpoints") {
      setState((current) => ({ ...current, savedQuizSessions: [] }));
      toast.success("Saved quiz checkpoints cleared");
    }
    setConfirmAction(null);
  };

  const confirmCopy =
    confirmAction === "demo"
      ? {
          title: "Replace this profile with the demo?",
          description:
            "This overwrites all Knowly data on this device. Export a backup first if you want to keep your current profile.",
          action: "Replace with demo",
        }
      : {
          title: "Clear saved quiz checkpoints?",
          description:
            "This removes every resumable quiz checkpoint. Completed results and study progress are not affected.",
          action: "Clear checkpoints",
        };

  return (
    <>
      <button
        type="button"
        aria-label="Open developer dashboard"
        title="Developer dashboard"
        onClick={() => setOpen(true)}
        className="press fixed bottom-4 right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-full border-[2px] border-border bg-surface px-3.5 py-2 text-xs font-bold shadow-[3px_3px_0_0_var(--shadow-ink)] transition-colors hover:bg-block-lemon hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Bug className="size-4 text-primary" />
        DEV
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="fixed inset-y-0 right-0 left-auto top-0 flex h-dvh max-h-dvh w-full max-w-[34rem] translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-l-2xl rounded-r-none border-y-0 border-r-0 p-0 sm:w-[34rem]">
          <DialogHeader className="shrink-0 border-b border-border bg-card/80 p-5 pr-14">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Bug className="size-4" />
              </span>
              <DialogTitle>Developer Dashboard</DialogTitle>
              <Badge variant="outline" className="ml-auto">
                DEV MODE
              </Badge>
            </div>
            <DialogDescription>
              Local-only tools for inspecting, testing, and resetting this workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
            <section aria-labelledby="dev-runtime-heading">
              <div className="mb-2 flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                <h2 id="dev-runtime-heading" className="text-sm font-semibold">
                  Runtime snapshot
                </h2>
                <span
                  className={cn(
                    "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    hydrated ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
                  )}
                >
                  {hydrated ? "READY" : "HYDRATING"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Metric label="App state" value={`v${state.version}`} />
                <Metric label="Route" value={pathname || "/"} />
                <Metric label="Viewport" value={`${viewport.width} × ${viewport.height}`} />
                <Metric label="Decks" value={state.decks.length} />
                <Metric label="Questions" value={questionCount} />
                <Metric label="Bookmarks" value={bookmarkedCount} />
                <Metric label="Due cards" value={dueCount} />
                <Metric label="Quiz results" value={state.results.length} />
                <Metric label="Resume points" value={state.savedQuizSessions.length} />
              </div>
            </section>

            <section
              aria-labelledby="dev-storage-heading"
              className="rounded-2xl border border-border p-3"
            >
              <div className="flex items-center gap-2">
                <HardDrive className="size-4 text-primary" />
                <h2 id="dev-storage-heading" className="text-sm font-semibold">
                  Storage
                </h2>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-8"
                  onClick={() => {
                    setStorageUsage(null);
                    void estimateStorageUsage().then(setStorageUsage);
                  }}
                >
                  <RefreshCw className="size-3.5" />
                  Refresh
                </Button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {storageUsage
                  ? `${formatBytes(storageUsage.usedBytes)} used${
                      storageUsage.quotaBytes ? ` of ${formatBytes(storageUsage.quotaBytes)}` : ""
                    }`
                  : "Open the panel to measure this browser's local storage."}
              </p>
              {storageUsage?.percent != null && (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${storageUsage.percent}%` }}
                  />
                </div>
              )}
            </section>

            <section aria-labelledby="dev-tools-heading">
              <div className="mb-2 flex items-center gap-2">
                <Gauge className="size-4 text-primary" />
                <h2 id="dev-tools-heading" className="text-sm font-semibold">
                  Developer tools
                </h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={copyDiagnostics}
                >
                  <ClipboardCopy />
                  Copy redacted diagnostics
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={downloadBackup}
                >
                  <Download />
                  Export full backup
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => updateSettings({ highContrast: !state.settings.highContrast })}
                >
                  <Eye />
                  {state.settings.highContrast ? "Disable" : "Enable"} high contrast
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => updateSettings({ reducedMotion: !state.settings.reducedMotion })}
                >
                  <ShieldCheck />
                  {state.settings.reducedMotion ? "Disable" : "Enable"} reduced motion
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw />
                  Reload app
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start text-destructive hover:text-destructive"
                  onClick={() => setConfirmAction("quiz-checkpoints")}
                >
                  <Trash2 />
                  Clear quiz checkpoints
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start sm:col-span-2"
                  onClick={() => setConfirmAction("demo")}
                >
                  <Sparkles />
                  Load demo profile…
                </Button>
              </div>
            </section>

            <section aria-labelledby="dev-routes-heading">
              <div className="mb-2 flex items-center gap-2">
                <ExternalLink className="size-4 text-primary" />
                <h2 id="dev-routes-heading" className="text-sm font-semibold">
                  Quick route checks
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_LINKS.map((route) => (
                  <Link
                    key={route.to}
                    to={route.to}
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    {route.label}
                  </Link>
                ))}
              </div>
            </section>

            <details className="rounded-2xl border border-border p-3">
              <summary className="cursor-pointer text-sm font-semibold">
                Inspect redacted state summary
              </summary>
              <pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-background p-3 text-[10px] leading-5 text-muted-foreground">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            </details>

            <p className="flex items-center gap-2 text-[11px] leading-5 text-muted-foreground">
              <ShieldCheck className="size-3.5 shrink-0 text-success" />
              Developer mode is permanent on this device. Diagnostics exclude names, deck titles,
              question text, and other study content.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmCopy.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmCopy.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirmAction === "demo"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
              onClick={confirmPendingAction}
            >
              {confirmCopy.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
