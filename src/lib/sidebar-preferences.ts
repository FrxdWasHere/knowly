export interface SidebarGroupPreference {
  id: string;
  label: string;
  visible: boolean;
}

/**
 * Default order: study and learning first, with related destinations grouped together.
 * The `id` is the key used by the shell; `label` is only the user-facing name.
 */
export const DEFAULT_SIDEBAR_GROUPS: SidebarGroupPreference[] = [
  { id: "Home", label: "Home", visible: true },
  { id: "Study", label: "Study", visible: true },
  { id: "Learning", label: "Learning", visible: true },
  { id: "Library", label: "Library", visible: true },
  { id: "Create", label: "Create", visible: true },
  { id: "Progress", label: "Progress", visible: true },
  { id: "Settings", label: "Settings", visible: true },
];

const LEGACY_GROUP_IDS: Record<string, string> = {
  "Study cycle": "Study",
  Courses: "Learning",
  Modules: "Learning",
  "Decks & cards": "Library",
  Notes: "Library",
  Content: "Create",
  System: "Settings",
};

export function normalizeSidebarGroups(value: unknown): SidebarGroupPreference[] {
  if (!Array.isArray(value)) return DEFAULT_SIDEBAR_GROUPS.map((group) => ({ ...group }));
  const known = new Set(DEFAULT_SIDEBAR_GROUPS.map((group) => group.id));
  const stored = new Map<string, SidebarGroupPreference>();
  for (const item of value) {
    if (!item || typeof item !== "object" || !("id" in item) || typeof item.id !== "string") {
      continue;
    }
    const id = LEGACY_GROUP_IDS[item.id] ?? item.id;
    if (!known.has(id)) continue;
    const fallback = DEFAULT_SIDEBAR_GROUPS.find((group) => group.id === id)!;
    const visible = "visible" in item && typeof item.visible === "boolean" ? item.visible : true;
    const previous = stored.get(id);
    if (previous) {
      previous.visible ||= visible;
      continue;
    }
    const label =
      id === item.id && "label" in item && typeof item.label === "string" && item.label.trim()
        ? item.label.trim().slice(0, 32)
        : fallback.label;
    stored.set(id, { id, label, visible });
  }

  const result: SidebarGroupPreference[] = [];
  const seen = new Set(stored.keys());
  result.push(...stored.values());
  // A section the user has never seen (a newly shipped group) is slotted in at
  // its default position instead of landing at the bottom of the sidebar.
  for (const group of DEFAULT_SIDEBAR_GROUPS) {
    if (seen.has(group.id)) continue;
    const anchor = DEFAULT_SIDEBAR_GROUPS.indexOf(group);
    let insertAt = 0;
    result.forEach((item, index) => {
      const defaultIndex = DEFAULT_SIDEBAR_GROUPS.findIndex((entry) => entry.id === item.id);
      if (defaultIndex !== -1 && defaultIndex < anchor) insertAt = index + 1;
    });
    result.splice(insertAt, 0, { ...group });
    seen.add(group.id);
  }
  return result;
}
