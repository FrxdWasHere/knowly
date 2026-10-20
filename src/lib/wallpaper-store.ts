/**
 * Wallpapers are large binary-ish data URLs. Keeping them inside the main
 * `localStorage` state blob meant a big image could exhaust the ~5 MB budget
 * and silently stop *all* progress from saving. They now live in IndexedDB,
 * with a `localStorage` fallback for environments without IndexedDB.
 */

const DB_NAME = "knowly-assets";
const DB_VERSION = 1;
const STORE = "assets";
const ASSET_KEY = "wallpaper";
const FALLBACK_KEY = "studyforge.wallpaper.v1";

const hasIndexedDb = () => typeof window !== "undefined" && typeof window.indexedDB !== "undefined";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local storage"));
  });
}

function readFallback(): string | null {
  try {
    return window.localStorage.getItem(FALLBACK_KEY);
  } catch {
    return null;
  }
}

function writeFallback(value: string | null) {
  try {
    if (value) window.localStorage.setItem(FALLBACK_KEY, value);
    else window.localStorage.removeItem(FALLBACK_KEY);
  } catch {
    /* ignore */
  }
}

/** Returns the stored wallpaper data URL, or null. */
export async function loadWallpaper(): Promise<string | null> {
  if (!hasIndexedDb()) return readFallback();
  try {
    const db = await openDb();
    const value = await new Promise<string | null>((resolve, reject) => {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).get(ASSET_KEY);
      request.onsuccess = () => resolve((request.result as string | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (value) return value;

    // One-time migration from the legacy fallback key.
    const fallback = readFallback();
    if (fallback) {
      await saveWallpaper(fallback);
      writeFallback(null);
      return fallback;
    }
    return null;
  } catch {
    return readFallback();
  }
}

/** Persists (or clears, when null) the wallpaper. */
export async function saveWallpaper(dataUrl: string | null): Promise<void> {
  if (!hasIndexedDb()) {
    writeFallback(dataUrl);
    return;
  }
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const store = db.transaction(STORE, "readwrite").objectStore(STORE);
      const request = dataUrl ? store.put(dataUrl, ASSET_KEY) : store.delete(ASSET_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch {
    writeFallback(dataUrl);
  }
}
