import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AppInstallContext,
  useAppInstall,
  type AppInstallContextValue,
} from "@/lib/app-install-context";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isAppInstalled() {
  const tauriWindow = window as Window & { __TAURI_INTERNALS__?: unknown };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone) ||
    Boolean(tauriWindow.__TAURI_INTERNALS__)
  );
}

export function AppInstallProvider({ children }: { children: ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const updateInstalled = () => setInstalled(isAppInstalled());
    const userAgent = navigator.userAgent;
    setIsIos(
      /iPad|iPhone|iPod/.test(userAgent) ||
        (/Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1),
    );
    updateInstalled();

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    const displayMode = window.matchMedia("(display-mode: standalone)");
    displayMode.addEventListener("change", updateInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      displayMode.removeEventListener("change", updateInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === "accepted") setInstalled(true);
  }, [installPrompt]);

  const value = useMemo(
    () => ({ canInstall: Boolean(installPrompt), installed, isIos, install }),
    [installPrompt, installed, isIos, install],
  );

  return <AppInstallContext.Provider value={value}>{children}</AppInstallContext.Provider>;
}

export function InstallAppButton({ className }: { className?: string }) {
  const { canInstall, install } = useAppInstall();

  if (!canInstall) return null;

  const handleInstall = () => {
    void install().catch((error: unknown) => {
      console.error("[PWA] Could not open the install prompt:", error);
      toast.error("Could not open the install prompt", {
        description: "Try the install option in your browser menu instead.",
      });
    });
  };

  return (
    <Button type="button" variant="outline" size="sm" className={className} onClick={handleInstall}>
      <Download className="size-4" />
      Install app
    </Button>
  );
}
