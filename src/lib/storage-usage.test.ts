import { describe, expect, it } from "vitest";
import { estimateStorageUsage, formatBytes, localStorageBytes } from "./storage-usage";

describe("formatBytes", () => {
  it("formats bytes, KB, MB and GB", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(1024 * 1024 * 3.5)).toBe("3.5 MB");
    expect(formatBytes(1024 * 1024 * 1024 * 2)).toBe("2.00 GB");
  });
});

describe("localStorageBytes", () => {
  it("reports nothing without a browser window", () => {
    expect(localStorageBytes()).toBe(0);
  });
});

describe("estimateStorageUsage", () => {
  it("resolves to a finite estimate even without a storage API", async () => {
    const usage = await estimateStorageUsage();
    expect(Number.isFinite(usage.usedBytes)).toBe(true);
    expect(usage.quotaBytes === null || Number.isFinite(usage.quotaBytes)).toBe(true);
  });
});
