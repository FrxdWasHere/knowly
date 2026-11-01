import { describe, expect, it } from "vitest";
import { DEFAULT_SIDEBAR_GROUPS, normalizeSidebarGroups } from "./sidebar-preferences";

const ids = (groups: { id: string }[]) => groups.map((group) => group.id);

describe("normalizeSidebarGroups", () => {
  it("returns the default order when nothing is stored", () => {
    expect(ids(normalizeSidebarGroups(undefined))).toEqual(ids(DEFAULT_SIDEBAR_GROUPS));
  });

  it("keeps the order the user picked", () => {
    const custom = [...DEFAULT_SIDEBAR_GROUPS].reverse();
    expect(ids(normalizeSidebarGroups(custom.map((group) => ({ ...group }))))).toEqual(ids(custom));
  });

  it("slots a newly shipped section into its default position", () => {
    const legacy = DEFAULT_SIDEBAR_GROUPS.filter((group) => group.id !== "Content");
    const result = normalizeSidebarGroups(legacy.map((group) => ({ ...group })));
    expect(ids(result).slice(0, 3)).toEqual(["Home", "Content", "Decks & cards"]);
  });

  it("keeps renamed labels and visibility", () => {
    const saved = DEFAULT_SIDEBAR_GROUPS.map((group) => ({
      ...group,
      label: group.id === "Study cycle" ? "Practice" : group.label,
      visible: group.id !== "Notes",
    }));
    const result = normalizeSidebarGroups(saved);
    expect(result.find((group) => group.id === "Study cycle")?.label).toBe("Practice");
    expect(result.find((group) => group.id === "Notes")?.visible).toBe(false);
  });

  it("drops unknown and duplicate sections", () => {
    const saved = [
      { id: "Home", label: "Home", visible: true },
      { id: "Gone", label: "Removed section", visible: true },
      { id: "Home", label: "Home again", visible: true },
    ];
    const result = normalizeSidebarGroups(saved);
    expect(ids(result)).not.toContain("Gone");
    expect(ids(result).filter((id) => id === "Home")).toHaveLength(1);
    expect(result).toHaveLength(DEFAULT_SIDEBAR_GROUPS.length);
  });
});
