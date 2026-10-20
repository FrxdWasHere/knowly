/**
 * Best-effort, read-only view of how much local storage the app is using.
 * Used by Settings to warn before a full browser quota silently stops saves.
 */

export interface StorageUsage {
  /** approximate bytes used by this origin (localStorage + IndexedDB) */
  usedBytes: number;
  /** total budget if the browser reports one */
  quotaBytes: number | null;
  /** 0–100, or null when the quota is unknown */
  percent: number | null;
}

/** Rough size (UTF-16) of everything currently in `localStorage`. */
export function localStorageBytes(): number {
  if (typeof window === "undefined") return 0;
  let total = 0;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key == null) continue;
      total += (key.length + (window.localStorage.getItem(key)?.length ?? 0)) * 2;
    }
  } catch {
    /* storage disabled — treat as empty */
  }
  return total;
}

/**
 * Uses `navigator.storage.estimate()` where available (it also accounts for
 * IndexedDB, where wallpapers live). Falls back to a `localStorage`-only
 * estimate with no quota when the API is missing.
 */
export async function estimateStorageUsage(): Promise<StorageUsage> {
  const fallback: StorageUsage = {
    usedBytes: localStorageBytes(),
    quotaBytes: null,
    percent: null,
  };
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return fallback;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    const usedBytes = usage ?? fallback.usedBytes;
    const quotaBytes = quota ?? null;
    return {
      usedBytes,
      quotaBytes,
      percent:
        quotaBytes && quotaBytes > 0
          ? Math.min(100, Math.round((usedBytes / quotaBytes) * 100))
          : null,
    };
  } catch {
    return fallback;
  }
}

/** Human-readable byte size, e.g. `1.4 MB`. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
