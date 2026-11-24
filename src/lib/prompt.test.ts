import { describe, expect, it } from "vitest";
import { deckSizeLine, deckSizeTarget } from "./prompt";

describe("deck size prompt", () => {
  it("uses the requested count without a cap or material-based override", () => {
    const material = Array.from({ length: 10_000 }, () => "word").join(" ");

    expect(deckSizeTarget(false, 12_345, material)).toBe(12_345);
    expect(deckSizeLine(false, 12_345, material)).toContain("Write exactly 12345 cards");
  });

  it("suggests a material-based count only when count is automatic", () => {
    expect(deckSizeTarget(true, 200, "one two three")).toBe(1);
    expect(deckSizeLine(true, 200, "one two three")).toContain("do not force a minimum");
  });
});
