export interface SidebarGroupPreference {
  id: string;
  label: string;
  visible: boolean;
}

export const DEFAULT_SIDEBAR_GROUPS: SidebarGroupPreference[] = [
  { id: "Home", label: "Home", visible: true },
  { id: "Study cycle", label: "Study & practice", visible: true },
  { id: "Courses", label: "Courses", visible: true },
  { id: "Modules", label: "Modules", visible: true },
  { id: "Decks & cards", label: "Decks & cards", visible: true },
  { id: "Build & import", label: "Create & import", visible: true },
  { id: "Notes", label: "Notes", visible: true },
  { id: "Progress", label: "Progress", visible: true },
  { id: "System", label: "Settings & backup", visible: true },
];

export function normalizeSidebarGroups(value: unknown): SidebarGroupPreference[] {
  if (!Array.isArray(value)) return DEFAULT_SIDEBAR_GROUPS.map((group) => ({ ...group }));
  const stored = new Map<string, Partial<SidebarGroupPreference>>(
    value
      .filter((item): item is SidebarGroupPreference =>
        Boolean(item && typeof item === "object" && typeof item.id === "string"),
      )
      .map((item) => [item.id, item]),
  );
  const known = new Set(DEFAULT_SIDEBAR_GROUPS.map((group) => group.id));
  const result: SidebarGroupPreference[] = [];
  const seen = new Set<string>();
  for (const [id, item] of stored) {
    if (!known.has(id) || seen.has(id)) continue;
    const fallback = DEFAULT_SIDEBAR_GROUPS.find((group) => group.id === id)!;
    result.push({
      id,
      label:
        typeof item.label === "string" && item.label.trim()
          ? item.label.trim().slice(0, 32)
          : fallback.label,
      visible: typeof item.visible === "boolean" ? item.visible : true,
    });
    seen.add(id);
  }
  for (const group of DEFAULT_SIDEBAR_GROUPS) {
    if (!seen.has(group.id)) result.push({ ...group });
  }
  return result;
}
