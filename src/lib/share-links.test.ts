import { describe, expect, it } from "vitest";
import {
  isValidCustomShareSlug,
  isValidShareIdentifier,
  normalizeCustomShareSlug,
} from "./share-links";

describe("custom share URLs", () => {
  it("normalizes custom slugs and accepts URL-safe slug formats", () => {
    expect(normalizeCustomShareSlug("  Biology-Review  ")).toBe("biology-review");
    expect(isValidCustomShareSlug("biology-review")).toBe(true);
    expect(isValidCustomShareSlug("bio2")).toBe(true);
    expect(isValidCustomShareSlug("ab")).toBe(false);
    expect(isValidCustomShareSlug("-biology")).toBe(false);
    expect(isValidCustomShareSlug("biology-")).toBe(false);
    expect(isValidCustomShareSlug("biology review")).toBe(false);
    expect(isValidCustomShareSlug("a".repeat(41))).toBe(false);
  });

  it("continues accepting opaque tokens and only accepts short aliases as identifiers", () => {
    expect(isValidShareIdentifier("a".repeat(43))).toBe(true);
    expect(isValidShareIdentifier("biology-review")).toBe(true);
    expect(isValidShareIdentifier("a".repeat(42))).toBe(false);
  });
});
