import { useSyncExternalStore } from "react";
import type { ImportKind } from "@/lib/import-detect";

export interface ImportPanelRequest {
  open: boolean;
  /** Preselect the deck that pasted questions get appended to. */
  deckId?: string;
  /** Force a format instead of letting the panel auto-detect one. */
  kind?: ImportKind;
}

const CLOSED: ImportPanelRequest = { open: false };

let current: ImportPanelRequest = CLOSED;
const listeners = new Set<() => void>();

function publish(next: ImportPanelRequest) {
  current = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => current;
const getServerSnapshot = () => CLOSED;

/** Opens the single import side panel from anywhere in the app. */
export function openImportPanel(request: Omit<ImportPanelRequest, "open"> = {}) {
  publish({ ...request, open: true });
}

export function closeImportPanel() {
  if (!current.open) return;
  publish(CLOSED);
}

export function useImportPanel() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
