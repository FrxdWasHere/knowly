import type { SharedResource } from "@/lib/share-content";
import { isDeveloperModeUnlocked } from "@/lib/developer-mode";
import { createId } from "@/lib/id";

const previews = new Map<string, { resource: SharedResource; expiresAt: number }>();

export function registerDevSharePreview(resource: SharedResource): string | null {
  if (!isDeveloperModeUnlocked()) return null;
  const id = createId("share-preview");
  previews.set(id, { resource, expiresAt: Date.now() + 15 * 60_000 });
  return id;
}

export function getDevSharePreview(id: string): SharedResource | undefined {
  if (!isDeveloperModeUnlocked()) return undefined;
  const preview = previews.get(id);
  if (!preview || preview.expiresAt <= Date.now()) {
    previews.delete(id);
    return undefined;
  }
  return preview.resource;
}

export function clearDevSharePreview(id: string): void {
  previews.delete(id);
}
