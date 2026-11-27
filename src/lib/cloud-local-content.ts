import type { AppState } from "@/lib/types";
import * as storage from "@/lib/storage";

export const MODULE_PRINT_PAGES_PREFIX = "knowly.module-print-pages.v1.";
const RESTORE_POINTS_KEY = "studyforge.snapshots.v1";

export interface RestorePoint {
  id: string;
  label: string;
  createdAt: number;
  deckCount: number;
  cardCount: number;
  data: AppState;
}

export interface CloudLocalContent {
  restorePoints: RestorePoint[];
  modulePrintPages: Record<string, string[]>;
}

function isRestorePoint(value: unknown): value is RestorePoint {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const point = value as Partial<RestorePoint>;
  return (
    typeof point.id === "string" &&
    typeof point.label === "string" &&
    typeof point.createdAt === "number" &&
    typeof point.deckCount === "number" &&
    typeof point.cardCount === "number" &&
    Boolean(point.data && typeof point.data === "object" && Array.isArray(point.data.decks))
  );
}

function isModulePrintPages(value: unknown): value is Record<string, string[]> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (pages) => Array.isArray(pages) && pages.every((page) => typeof page === "string"),
    )
  );
}

function localStorageKeys(): string[] {
  try {
    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key) keys.push(key);
    }
    return keys;
  } catch {
    return [];
  }
}

function readLocalStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

const changeListeners = new Set<() => void>();

export function subscribeCloudLocalContent(listener: () => void): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

export function notifyCloudLocalContentChanged(): void {
  for (const listener of changeListeners) listener();
}

export function loadRestorePoints(): RestorePoint[] {
  try {
    const raw = localStorage.getItem(RESTORE_POINTS_KEY);
    return raw ? (JSON.parse(raw) as RestorePoint[]) : [];
  } catch {
    return [];
  }
}

export function saveRestorePoints(restorePoints: RestorePoint[]): void {
  localStorage.setItem(RESTORE_POINTS_KEY, JSON.stringify(restorePoints));
  notifyCloudLocalContentChanged();
}

export async function exportCloudLocalContent(): Promise<CloudLocalContent> {
  const keys = [...new Set([...(await storage.keys()), ...localStorageKeys()])];
  const pageKeys = keys.filter((key) => key.startsWith(MODULE_PRINT_PAGES_PREFIX));
  const pageEntries = await Promise.all(
    pageKeys.map(async (key) => {
      const raw = (await storage.getItem(key)) ?? readLocalStorageItem(key);
      if (raw === null) return null;
      const pages: unknown = JSON.parse(raw);
      if (!Array.isArray(pages) || !pages.every((page) => typeof page === "string")) {
        throw new Error(`Saved module print pages are invalid (${key}).`);
      }
      return [key.slice(MODULE_PRINT_PAGES_PREFIX.length), pages] as const;
    }),
  );
  const restorePointsRaw = localStorage.getItem(RESTORE_POINTS_KEY);
  const restorePoints: unknown = restorePointsRaw ? JSON.parse(restorePointsRaw) : [];
  if (!Array.isArray(restorePoints) || !restorePoints.every(isRestorePoint)) {
    throw new Error("Saved restore points are invalid.");
  }

  return {
    restorePoints: restorePoints as RestorePoint[],
    modulePrintPages: Object.fromEntries(
      pageEntries.filter((entry): entry is readonly [string, string[]] => entry !== null),
    ),
  };
}

export async function replaceCloudLocalContent(content: CloudLocalContent): Promise<void> {
  if (
    !Array.isArray(content.restorePoints) ||
    !content.restorePoints.every(isRestorePoint) ||
    !isModulePrintPages(content.modulePrintPages)
  ) {
    throw new Error("The cloud copy contains invalid saved content.");
  }

  localStorage.setItem(RESTORE_POINTS_KEY, JSON.stringify(content.restorePoints));

  const keys = [...new Set([...(await storage.keys()), ...localStorageKeys()])];
  const existingPageKeys = keys.filter((key) => key.startsWith(MODULE_PRINT_PAGES_PREFIX));
  const fallbackKeys = new Set(localStorageKeys());
  await Promise.all(existingPageKeys.map((key) => storage.removeItem(key)));
  for (const key of existingPageKeys) {
    if (fallbackKeys.has(key)) localStorage.removeItem(key);
  }
  await Promise.all(
    Object.entries(content.modulePrintPages).map(([moduleId, pages]) =>
      storage.setItem(`${MODULE_PRINT_PAGES_PREFIX}${moduleId}`, JSON.stringify(pages)),
    ),
  );
  notifyCloudLocalContentChanged();
}
