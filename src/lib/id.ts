/**
 * Small, collision-resistant id generator.
 *
 * `Math.random().toString(36)` was used across the app for deck, question,
 * session and template ids — those collide surprisingly easily and are not
 * stable identifiers. Prefer `crypto.randomUUID()` where the platform allows
 * it, falling back to a time + random string in non-secure contexts.
 */
export function createId(prefix?: string): string {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}-${uuid}` : uuid;
}
