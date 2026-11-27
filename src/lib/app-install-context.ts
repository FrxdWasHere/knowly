import { createContext, useContext } from "react";

export type AppInstallContextValue = {
  canInstall: boolean;
  installed: boolean;
  isIos: boolean;
  install: () => Promise<void>;
};

export const AppInstallContext = createContext<AppInstallContextValue | null>(null);

export function useAppInstall() {
  const context = useContext(AppInstallContext);
  if (!context) throw new Error("useAppInstall must be used within AppInstallProvider");
  return context;
}
