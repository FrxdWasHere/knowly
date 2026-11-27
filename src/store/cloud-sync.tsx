import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/store/auth-context";
import { useKnowly } from "@/store/knowly";
import {
  createCloudAppState,
  loadCloudAppState,
  overwriteCloudAppState,
  replaceCloudAppState,
  type CloudAppState,
  type CloudSnapshot,
} from "@/lib/cloud-app-state";
import { exportAllNotes, replaceAllNotes, subscribeNotesChanges } from "@/lib/notes/db";
import {
  exportCloudLocalContent,
  replaceCloudLocalContent,
  subscribeCloudLocalContent,
} from "@/lib/cloud-local-content";
import { saveAvatar } from "@/lib/avatar-store";
import * as storage from "@/lib/storage";
import type { AppState } from "@/lib/types";
import {
  CloudSyncContext,
  type CloudSyncContextValue,
  type CloudSyncStatus,
} from "./cloud-sync-context";

const ACTIVE_USER_KEY = "knowly.cloud-sync.active-user.v1";
const LAST_SEEN_PREFIX = "knowly.cloud-sync.last-seen.v1";
const BACKUP_PREFIX = "knowly.cloud-sync.pre-download.v1";

function serializeSnapshot(value: unknown): string {
  const normalize = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(normalize);
    if (item && typeof item === "object") {
      return Object.fromEntries(
        Object.entries(item)
          .filter(([, entry]) => entry !== undefined)
          .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
          .map(([key, entry]) => [key, normalize(entry)]),
      );
    }
    return item;
  };
  return JSON.stringify(normalize(value));
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage can be unavailable in private browsing */
  }
}

function readActiveUser() {
  return readStorage(ACTIVE_USER_KEY);
}

function readLastSeen(userId: string) {
  return readStorage(`${LAST_SEEN_PREFIX}.${userId}`);
}

/** The device's whole library: app state plus every notebook page. */
async function captureSnapshot(state: AppState): Promise<CloudSnapshot> {
  const [notes, localContent] = await Promise.all([exportAllNotes(), exportCloudLocalContent()]);
  return { ...state, ...localContent, notes };
}

/** Puts a cloud snapshot onto this device: state, stored media and notebooks. */
async function applySnapshot(
  snapshot: CloudSnapshot,
  importState: (json: string) => boolean,
): Promise<void> {
  const { notes, restorePoints, modulePrintPages, ...appState } = snapshot;
  if (!importState(JSON.stringify(appState))) {
    throw new Error("The cloud copy could not be imported because its data is invalid.");
  }
  await saveAvatar(appState.settings?.avatarImage ?? null);
  await replaceCloudLocalContent({
    restorePoints: restorePoints ?? [],
    modulePrintPages: modulePrintPages ?? {},
  });
  if (notes && Array.isArray(notes.notebooks) && Array.isArray(notes.pages)) {
    await replaceAllNotes({ notebooks: notes.notebooks, pages: notes.pages });
  }
}

export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const { configured, loading: authLoading, user } = useAuth();
  const userId = user?.id;
  const { state, hydrated, importState } = useKnowly();
  const [status, setStatus] = useState<CloudSyncStatus>(configured ? "signed-out" : "unavailable");
  const [remote, setRemote] = useState<CloudAppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [notesRevision, setNotesRevision] = useState(0);
  const [retryKey, setRetryKey] = useState(0);

  const remoteAt = useRef<string | null>(null);
  const lastUploaded = useRef("");
  const activeUser = useRef<string | null>(null);
  const initializedFor = useRef<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  // Stable handles: importing a snapshot re-renders the provider, and the
  // initial-load effect must not be cancelled half-way through that.
  const importStateRef = useRef(importState);
  importStateRef.current = importState;
  useEffect(() => subscribeNotesChanges(() => setNotesRevision((count) => count + 1)), []);
  useEffect(() => subscribeCloudLocalContent(() => setNotesRevision((count) => count + 1)), []);

  /** Records the fact that this device and the account now hold the same snapshot. */
  const markSynced = useCallback((id: string, updatedAt: string, snapshot: CloudSnapshot) => {
    activeUser.current = id;
    remoteAt.current = updatedAt;
    lastUploaded.current = serializeSnapshot(snapshot);
    writeStorage(ACTIVE_USER_KEY, id);
    writeStorage(`${LAST_SEEN_PREFIX}.${id}`, updatedAt);
    setRemote({ state: snapshot, updatedAt });
  }, []);

  const describeError = (syncError: unknown) =>
    syncError instanceof Error ? syncError.message : "The cloud operation failed.";

  useEffect(() => {
    if (!configured) {
      initializedFor.current = null;
      setStatus("unavailable");
      setRemote(null);
      remoteAt.current = null;
      activeUser.current = null;
      return;
    }
    if (authLoading || !hydrated) return;
    if (!userId) {
      initializedFor.current = null;
      setStatus("signed-out");
      setRemote(null);
      remoteAt.current = null;
      activeUser.current = null;
      setError(null);
      setNotice(null);
      return;
    }
    if (initializedFor.current === userId) return;
    initializedFor.current = userId;

    let active = true;
    setStatus("checking");
    setError(null);
    setNotice(null);

    void (async () => {
      try {
        const loaded = await loadCloudAppState(userId);
        if (!active) return;

        if (!loaded) {
          // First sync for this account: the library on this device becomes the
          // account copy, so nothing the learner already has is thrown away.
          const snapshot = await captureSnapshot(stateRef.current);
          const updatedAt = await createCloudAppState(userId, snapshot);
          if (!active) return;
          markSynced(userId, updatedAt, snapshot);
          setNotice("Cloud copy created from this device.");
          setStatus("synced");
          return;
        }

        // A device that is new to this account starts blank and adopts the
        // account copy. A device that already owns the copy keeps its newer
        // edits — unless another device wrote to the account since.
        const ownsCopy = readActiveUser() === userId;
        const lastSeen = readLastSeen(userId);
        const cloudChangedElsewhere =
          !lastSeen || Date.parse(loaded.updatedAt) > Date.parse(lastSeen);

        if (ownsCopy && !cloudChangedElsewhere) {
          const snapshot = await captureSnapshot(stateRef.current);
          if (serializeSnapshot(snapshot) === serializeSnapshot(loaded.state)) {
            if (!active) return;
            markSynced(userId, loaded.updatedAt, snapshot);
            setStatus("synced");
            return;
          }
          const updatedAt = await overwriteCloudAppState(userId, snapshot);
          if (!active) return;
          markSynced(userId, updatedAt, snapshot);
          setStatus("synced");
          return;
        }

        await saveRecoveryBackup(userId, await captureSnapshot(stateRef.current));
        await applySnapshot(loaded.state, importStateRef.current);
        if (!active) return;
        markSynced(userId, loaded.updatedAt, loaded.state);
        setNotice("Cloud copy loaded onto this device.");
        setStatus("synced");
      } catch (loadError: unknown) {
        if (!active) return;
        console.error("[Cloud sync] Could not open the account copy:", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load cloud data. Check your connection and try again.",
        );
        setStatus("error");
      }
    })();

    return () => {
      active = false;
    };
  }, [configured, authLoading, hydrated, userId, markSynced, retryKey]);

  /** Pushes local changes shortly after they happen. */
  useEffect(() => {
    if (status !== "synced" || !user || !remoteAt.current || activeUser.current !== user.id) return;

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const snapshot = await captureSnapshot(stateRef.current);
          const serialized = serializeSnapshot(snapshot);
          if (serialized === lastUploaded.current) return;

          setStatus("syncing");
          const updatedAt = await replaceCloudAppState(user.id, snapshot, remoteAt.current!);
          if (!updatedAt) {
            // Another device saved first. The account stays the source of truth.
            const latest = await loadCloudAppState(user.id);
            if (!latest) {
              setStatus("synced");
              return;
            }
            await saveRecoveryBackup(user.id, await captureSnapshot(stateRef.current));
            await applySnapshot(latest.state, importState);
            markSynced(user.id, latest.updatedAt, latest.state);
            setNotice("Cloud copy changed on another device — this device now matches it.");
            setError(null);
            setStatus("synced");
            return;
          }
          markSynced(user.id, updatedAt, snapshot);
          setError(null);
          setStatus("synced");
        } catch (syncError: unknown) {
          console.error("[Cloud sync] Could not save local changes:", syncError);
          setError(describeError(syncError));
          setStatus("error");
        }
      })();
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [state, notesRevision, status, user, importState, markSynced]);

  const uploadThisDevice = useCallback(async () => {
    if (!user) throw new Error("Sign in before syncing your library.");
    setStatus("syncing");
    setError(null);
    setNotice(null);
    try {
      const snapshot = await captureSnapshot(stateRef.current);
      const updatedAt = await overwriteCloudAppState(user.id, snapshot);
      markSynced(user.id, updatedAt, snapshot);
      setNotice("Cloud copy replaced with this device's library.");
      setStatus("synced");
    } catch (syncError: unknown) {
      console.error("[Cloud sync] Could not upload this device:", syncError);
      setError(describeError(syncError));
      setStatus("error");
      throw syncError;
    }
  }, [user, markSynced]);

  const restoreFromCloud = useCallback(async () => {
    if (!user) throw new Error("Sign in before restoring from the cloud.");
    setStatus("syncing");
    setError(null);
    setNotice(null);
    try {
      const latest = await loadCloudAppState(user.id);
      if (!latest) throw new Error("There is no cloud copy to load yet.");
      await saveRecoveryBackup(user.id, await captureSnapshot(stateRef.current));
      await applySnapshot(latest.state, importState);
      markSynced(user.id, latest.updatedAt, latest.state);
      setNotice("Cloud copy loaded onto this device.");
      setStatus("synced");
    } catch (syncError: unknown) {
      console.error("[Cloud sync] Could not load the cloud copy:", syncError);
      setError(describeError(syncError));
      setStatus("error");
      throw syncError;
    }
  }, [user, importState, markSynced]);

  const downloadCloudBackup = useCallback(() => {
    if (!remote) throw new Error("There is no cloud backup to download.");
    downloadJson(remote.state, `knowly-cloud-backup-${stamp()}.json`);
  }, [remote]);

  const retry = useCallback(() => {
    initializedFor.current = null;
    setRetryKey((count) => count + 1);
  }, []);

  const value = useMemo<CloudSyncContextValue>(
    () => ({
      status,
      hasCloudCopy: Boolean(remote),
      updatedAt: remote?.updatedAt ?? null,
      error,
      notice,
      uploadThisDevice,
      restoreFromCloud,
      downloadCloudBackup,
      retry,
    }),
    [status, remote, error, notice, uploadThisDevice, restoreFromCloud, downloadCloudBackup, retry],
  );

  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

function downloadJson(value: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Keeps a local recovery copy before this device's data is replaced. */
async function saveRecoveryBackup(userId: string, snapshot: CloudSnapshot) {
  try {
    await storage.setItem(`${BACKUP_PREFIX}.${userId}.${Date.now()}`, JSON.stringify(snapshot));
  } catch (backupError) {
    console.warn("[Cloud sync] Could not save a local recovery copy:", backupError);
  }
}
