import { createContext, useContext } from "react";

export type CloudSyncStatus =
  "unavailable" | "signed-out" | "checking" | "syncing" | "synced" | "error";

export interface CloudSyncContextValue {
  status: CloudSyncStatus;
  hasCloudCopy: boolean;
  updatedAt: string | null;
  error: string | null;
  /** Short, non-error status line such as "Cloud copy loaded onto this device." */
  notice: string | null;
  /** Explicitly replace the account copy with this device's data. */
  uploadThisDevice: () => Promise<void>;
  /** Explicitly replace this device with the account copy. */
  restoreFromCloud: () => Promise<void>;
  downloadCloudBackup: () => void;
  /** Re-run the account check after a failure. */
  retry: () => void;
}

export const CloudSyncContext = createContext<CloudSyncContextValue | null>(null);

export function useCloudSync() {
  const value = useContext(CloudSyncContext);
  if (!value) throw new Error("useCloudSync must be used within CloudSyncProvider");
  return value;
}
