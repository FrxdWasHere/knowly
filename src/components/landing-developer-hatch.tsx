import { useState, type FormEvent } from "react";
import { KeyRound, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { loadSampleNotebook } from "@/lib/sample-notes";
import { buildSampleProfile } from "@/lib/sample-profile";
import { unlockDeveloperMode } from "@/lib/developer-mode";
import { useAuth } from "@/store/auth-context";
import { useKnowly } from "@/store/knowly";

export function LandingDeveloperHatch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, importState, updateSettings } = useKnowly();
  const { user, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [confirmLoad, setConfirmLoad] = useState(false);
  const hatchPassword = import.meta.env.DEV
    ? import.meta.env.VITE_DEV_HATCH_PASSWORD?.trim()
    : undefined;
  const profileHasData =
    state.onboardingComplete ||
    state.decks.length > 0 ||
    state.courses.length > 0 ||
    state.modules.length > 0 ||
    state.history.length > 0 ||
    state.results.length > 0 ||
    state.journal.length > 0;

  if (!import.meta.env.DEV) return null;

  const loadSample = async () => {
    if (authLoading) {
      setError("Wait for the account status check to finish, then try again.");
      return;
    }
    if (user) {
      setError("Sign out before loading sample data so it can't replace your cloud profile.");
      return;
    }

    const sample = buildSampleProfile();
    if (!importState(JSON.stringify(sample))) {
      setError("Couldn't load the sample profile.");
      return;
    }
    updateSettings({ developerMode: true });

    try {
      await loadSampleNotebook();
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? `Profile loaded, but the sample notebook couldn't be created: ${loadError.message}`
          : "Profile loaded, but the sample notebook couldn't be created.",
      );
      return;
    }

    setConfirmLoad(false);
    onOpenChange(false);
    setPassword("");
    setError("");
    toast.success(
      `Dev profile ready — ${sample.decks.length} decks, ${sample.courses.length} courses, ${sample.modules.length} modules, and a sample notebook.`,
    );
  };

  const unlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hatchPassword) {
      setError("Set VITE_DEV_HATCH_PASSWORD in your local environment first.");
      return;
    }
    if (password !== hatchPassword) {
      setError("That passphrase didn't match.");
      return;
    }
    if (authLoading) {
      setError("Wait for the account status check to finish, then try again.");
      return;
    }
    if (user) {
      setError("Sign out before loading sample data so it can't replace your cloud profile.");
      return;
    }

    unlockDeveloperMode();
    updateSettings({ developerMode: true });
    if (profileHasData) {
      onOpenChange(false);
      setConfirmLoad(true);
      return;
    }
    void loadSample();
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          onOpenChange(nextOpen);
          if (!nextOpen) {
            setPassword("");
            setError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              The Knowly study lab
            </DialogTitle>
            <DialogDescription>
              Local development hatch. Enter your passphrase to unlock dev mode and load the sample
              workspace. Existing local study data will be protected by a confirmation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={unlock} className="space-y-3">
            <Input
              aria-label="Local developer passphrase"
              type="password"
              autoComplete="new-password"
              placeholder="Local dev passphrase"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Vite makes `VITE_` variables visible in the browser. This is a local speed bump, not
              production security.
            </p>
            <Button type="submit" className="w-full" disabled={!password.trim() || !hatchPassword}>
              <KeyRound />
              Unlock &amp; load sample profile
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmLoad} onOpenChange={setConfirmLoad}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace this local profile with the sample?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces your local decks, courses, settings, progress, and study history.
              Notebooks are stored separately and will remain. Sign out is required to prevent
              sample data from syncing to an account. Export a backup first if you need this data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my profile</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void loadSample();
              }}
            >
              Replace with sample
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
