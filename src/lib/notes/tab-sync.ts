/**
 * Multi-tab awareness for the notebook editor.
 *
 * One BroadcastChannel per app tab. Every message names the tab that sent it,
 * so a tab never reacts to its own writes, and editors are tracked per
 * notebook instead of in a single anonymous pile.
 *
 * Nothing in here writes data: a receiver is only told that another tab saved,
 * and the open editor decides what to do with that.
 */

export type SyncMessage =
  | { type: "ping"; tabId: string; notebookId: string }
  | { type: "page-updated"; tabId: string; notebookId: string; pageId: string; timestamp: number }
  | { type: "notebook-updated"; tabId: string; notebookId: string; timestamp: number };

const CHANNEL_NAME = "knowly-notes";
const TAB_ID = Math.random().toString(36).slice(2, 10);
/** A tab that has not announced itself for this long is treated as gone. */
const STALE_AFTER_MS = 8000;

let channel: BroadcastChannel | null = null;
const listeners = new Set<(message: SyncMessage) => void>();
/** notebookId → tabId → last seen at */
const activeEditors = new Map<string, Map<string, number>>();

function supported(): boolean {
  return typeof window !== "undefined" && typeof window.BroadcastChannel !== "undefined";
}

function remember(notebookId: string, tabId: string): void {
  let editors = activeEditors.get(notebookId);
  if (!editors) {
    editors = new Map<string, number>();
    activeEditors.set(notebookId, editors);
  }
  editors.set(tabId, Date.now());
}

function prune(now = Date.now()): void {
  for (const [notebookId, editors] of activeEditors) {
    for (const [tabId, seenAt] of editors) {
      if (now - seenAt > STALE_AFTER_MS) editors.delete(tabId);
    }
    if (!editors.size) activeEditors.delete(notebookId);
  }
}

function handleMessage(event: MessageEvent): void {
  const message = event.data as SyncMessage | null;
  if (!message || typeof message !== "object") return;
  // Own writes come back over the channel; ignore them.
  if (message.tabId === TAB_ID) return;
  if (typeof message.notebookId !== "string" || !message.notebookId) return;

  remember(message.notebookId, message.tabId);
  if (message.type === "ping") return;

  for (const listener of listeners) listener(message);
}

function ensureChannel(): BroadcastChannel | null {
  if (!supported()) return null;
  if (!channel) {
    channel = new window.BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener("message", handleMessage);
  }
  return channel;
}

/** Start listening for the notebook that is open and announce this tab. */
export function initTabSync(notebookId: string): void {
  const bus = ensureChannel();
  if (!bus) return;
  prune();
  remember(notebookId, TAB_ID);
  bus.postMessage({ type: "ping", tabId: TAB_ID, notebookId } satisfies SyncMessage);
}

/** How many other tabs are editing this notebook right now. */
export function getOtherEditorsCount(notebookId: string): number {
  prune();
  const editors = activeEditors.get(notebookId);
  if (!editors) return 0;
  let count = 0;
  for (const tabId of editors.keys()) {
    if (tabId !== TAB_ID) count += 1;
  }
  return count;
}

/** Changes saved elsewhere, handed to the open editor. Returns an unsubscribe. */
export function subscribeToSync(listener: (message: SyncMessage) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function broadcastPageUpdate(notebookId: string, pageId: string, timestamp: number): void {
  ensureChannel()?.postMessage({
    type: "page-updated",
    tabId: TAB_ID,
    notebookId,
    pageId,
    timestamp,
  } satisfies SyncMessage);
}

export function broadcastNotebookUpdate(notebookId: string, timestamp: number): void {
  ensureChannel()?.postMessage({
    type: "notebook-updated",
    tabId: TAB_ID,
    notebookId,
    timestamp,
  } satisfies SyncMessage);
}

/** Stop listening (the editor closed). Other notebook tabs are unaffected. */
export function closeTabSync(): void {
  listeners.clear();
  activeEditors.clear();
  channel?.close();
  channel = null;
}
