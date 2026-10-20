import { describe, expect, it } from "vitest";
import { createId } from "./id";

describe("createId", () => {
  it("returns unique ids", () => {
    const ids = new Set(Array.from({ length: 5000 }, () => createId()));
    expect(ids.size).toBe(5000);
  });

  it("applies an optional prefix", () => {
    expect(createId("deck")).toMatch(/^deck-/);
  });

  it("returns a non-empty string without a prefix", () => {
    expect(createId().length).toBeGreaterThan(0);
  });
});
