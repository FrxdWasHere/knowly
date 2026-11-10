/**
 * Avatar image storage using IndexedDB.
 * Stores user profile images separately from the main state to avoid quota issues.
 * Falls back to localStorage for environments without IndexedDB.
 */

const DB_NAME = "knowly-assets";
const DB_VERSION = 1;
const STORE = "assets";
const AVATAR_KEY = "avatar";
const FALLBACK_KEY = "knowly.avatar.v1";

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

/**
 * Returns the stored avatar image data URL, or null.
 */
export async function loadAvatar(): Promise<string | null> {
  if (!hasIndexedDb()) return readFallback();
  try {
    const db = await openDb();
    const value = await new Promise<string | null>((resolve, reject) => {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).get(AVATAR_KEY);
      request.onsuccess = () => resolve((request.result as string | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (value) return value;

    // One-time migration from the legacy fallback key.
    const fallback = readFallback();
    if (fallback) {
      await saveAvatar(fallback);
      writeFallback(null);
      return fallback;
    }
    return null;
  } catch {
    return readFallback();
  }
}

/**
 * Persists (or clears, when null) the avatar image.
 */
export async function saveAvatar(dataUrl: string | null): Promise<void> {
  if (!hasIndexedDb()) {
    writeFallback(dataUrl);
    return;
  }
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const store = db.transaction(STORE, "readwrite").objectStore(STORE);
      const request = dataUrl ? store.put(dataUrl, AVATAR_KEY) : store.delete(AVATAR_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch {
    writeFallback(dataUrl);
  }
}

/**
 * Convert a File to a data URL, validating that it's a reasonable image size.
 */
export async function fileToAvatarDataUrl(file: File): Promise<string> {
  // Max 2 MB for avatar (much smaller than wallpaper)
  const MAX_SIZE = 2 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error(`Avatar image must be smaller than 2 MB (yours is ${(file.size / 1024 / 1024).toFixed(1)} MB)`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Validate it's an image by checking data URL prefix
      if (!result.startsWith("data:image/")) {
        reject(new Error("File must be an image"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
