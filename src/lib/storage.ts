/**
 * IndexedDB storage abstraction for Knowly.
 * Replaces localStorage with higher quota (~50 MB) and better reliability.
 * Falls back to localStorage for environments without IndexedDB (private browsing, older browsers).
 */

const DB_NAME = "knowly-db";
const DB_VERSION = 1;
const STORE_NAME = "data";

const hasIndexedDb = () => typeof window !== "undefined" && typeof window.indexedDB !== "undefined";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open IndexedDB"));
  });
}

/**
 * Get a value from IndexedDB, with localStorage fallback.
 */
export async function getItem(key: string): Promise<string | null> {
  if (!hasIndexedDb()) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  try {
    const db = await openDb();
    const value = await new Promise<string | null>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve((request.result as string | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return value;
  } catch (err) {
    console.warn(`[Storage] Error reading from IndexedDB (${key}):`, err);
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
}

/**
 * Set a value in IndexedDB, with localStorage fallback.
 */
export async function setItem(key: string, value: string): Promise<void> {
  if (!hasIndexedDb()) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      console.warn(`[Storage] Could not save to localStorage (${key}): quota exceeded or private mode`);
    }
    return;
  }

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch (err) {
    console.warn(`[Storage] Error writing to IndexedDB (${key}):`, err);
    try {
      window.localStorage.setItem(key, value);
    } catch {
      console.warn(`[Storage] Could not save to localStorage (${key}): quota exceeded or private mode`);
    }
  }
}

/**
 * Remove a value from IndexedDB, with localStorage fallback.
 */
export async function removeItem(key: string): Promise<void> {
  if (!hasIndexedDb()) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch (err) {
    console.warn(`[Storage] Error deleting from IndexedDB (${key}):`, err);
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Clear all items from IndexedDB, with localStorage fallback.
 */
export async function clear(): Promise<void> {
  if (!hasIndexedDb()) {
    try {
      window.localStorage.clear();
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch (err) {
    console.warn(`[Storage] Error clearing IndexedDB:`, err);
    try {
      window.localStorage.clear();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Get all keys from IndexedDB, with localStorage fallback.
 */
export async function keys(): Promise<string[]> {
  if (!hasIndexedDb()) {
    try {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) keys.push(key);
      }
      return keys;
    } catch {
      return [];
    }
  }

  try {
    const db = await openDb();
    const allKeys = await new Promise<string[]>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAllKeys();
      request.onsuccess = () => resolve((request.result as string[]) ?? []);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return allKeys;
  } catch (err) {
    console.warn(`[Storage] Error getting keys from IndexedDB:`, err);
    try {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) keys.push(key);
      }
      return keys;
    } catch {
      return [];
    }
  }
}
