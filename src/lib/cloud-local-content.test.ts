import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as storage from "@/lib/storage";
import { DEFAULT_STATE } from "@/lib/defaults";
import {
  exportCloudLocalContent,
  MODULE_PRINT_PAGES_PREFIX,
  replaceCloudLocalContent,
  subscribeCloudLocalContent,
  type RestorePoint,
} from "./cloud-local-content";

vi.mock("@/lib/storage", () => ({
  keys: vi.fn(),
  getItem: vi.fn(),
  removeItem: vi.fn(),
  setItem: vi.fn(),
}));

const localValues = new Map<string, string>();
const localStorageMock = {
  get length() {
    return localValues.size;
  },
  key: (index: number) => [...localValues.keys()][index] ?? null,
  getItem: (key: string) => localValues.get(key) ?? null,
  setItem: (key: string, value: string) => localValues.set(key, value),
  removeItem: (key: string) => localValues.delete(key),
};

const restorePoint: RestorePoint = {
  id: "restore-1",
  label: "1 decks · 2 cards",
  createdAt: 123,
  deckCount: 1,
  cardCount: 2,
  data: { ...DEFAULT_STATE, decks: [] },
};

describe("cloud local content", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", localStorageMock);
    localValues.clear();
    vi.mocked(storage.keys).mockResolvedValue([`${MODULE_PRINT_PAGES_PREFIX}module-1`]);
    vi.mocked(storage.getItem).mockResolvedValue(JSON.stringify(["Extra page"]));
    vi.mocked(storage.removeItem).mockResolvedValue(undefined);
    vi.mocked(storage.setItem).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("exports restore points and module print pages as cloud content", async () => {
    localValues.set("studyforge.snapshots.v1", JSON.stringify([restorePoint]));

    await expect(exportCloudLocalContent()).resolves.toEqual({
      restorePoints: [restorePoint],
      modulePrintPages: { "module-1": ["Extra page"] },
    });
  });

  it("exports module pages saved through the localStorage fallback", async () => {
    vi.mocked(storage.keys).mockResolvedValue([]);
    vi.mocked(storage.getItem).mockResolvedValue(null);
    localValues.set(`${MODULE_PRINT_PAGES_PREFIX}module-2`, JSON.stringify(["Fallback page"]));

    await expect(exportCloudLocalContent()).resolves.toMatchObject({
      modulePrintPages: { "module-2": ["Fallback page"] },
    });
  });

  it("replaces device copies and notifies the sync subscriber", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCloudLocalContent(listener);

    await replaceCloudLocalContent({
      restorePoints: [restorePoint],
      modulePrintPages: { "module-2": ["Cloud page"] },
    });

    expect(localValues.get("studyforge.snapshots.v1")).toBe(JSON.stringify([restorePoint]));
    expect(storage.removeItem).toHaveBeenCalledWith(`${MODULE_PRINT_PAGES_PREFIX}module-1`);
    expect(storage.setItem).toHaveBeenCalledWith(
      `${MODULE_PRINT_PAGES_PREFIX}module-2`,
      JSON.stringify(["Cloud page"]),
    );
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });
});
