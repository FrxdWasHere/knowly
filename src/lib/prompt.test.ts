import { describe, expect, it } from "vitest";
import { buildPrompt, deckSizeLine, deckSizeTarget } from "./prompt";

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

  it("plans an adaptive Learning Path using the selected detail budget", () => {
    const prompt = buildPrompt({
      material: "A short biology outline.",
      title: "Cells",
      subject: "Biology",
      count: 8,
      distribution: { easy: 30, medium: 50, hard: 20 },
      types: ["multiple-choice"],
      extra: "",
      lengthSliderValue: 20,
      learningPath: {
        stageCount: 2,
        customStages: [{ title: "Cell foundations", purpose: "concept-exposure" }],
      },
    });

    expect(prompt).toContain("LENGTH & DETAIL — Shorter (20/100)");
    expect(prompt).toContain("Plan exactly 2 stages");
    expect(prompt).toContain("Cell foundations");
    expect(prompt).toContain("Use only as many concepts as the material supports");
    expect(prompt).not.toContain("at least four distinct");
  });
});
