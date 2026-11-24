import { describe, expect, it } from "vitest";
import { describeLengthBudget } from "./length-detail";

describe("shared length/detail summary", () => {
  it("uses language that fits courses, modules, and learning paths", () => {
    const summary = describeLengthBudget(50);

    expect(summary).toContain("balanced coverage");
    expect(summary).toContain("detailed explanations");
    expect(summary).toContain("application practice");
    expect(summary).not.toContain("stages");
  });
});
