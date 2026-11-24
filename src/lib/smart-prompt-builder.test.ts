import { describe, expect, it } from "vitest";
import { buildSmartPrompt } from "./smart-prompt-builder";

describe("Smart Mode deck prompts", () => {
  it("uses the shared length budget and learner-pinned Learning Path structure", () => {
    const prompt = buildSmartPrompt({
      content_type: "deck",
      title: "Cell biology",
      subject: "Biology",
      material: "Cells contain membranes, nuclei, and organelles.",
      suggestions: {
        topics: ["Membranes", "Organelles"],
        learningObjectives: ["Explain how cell structures support cell functions."],
      },
      autoConfigure: true,
      lengthPreset: "longer",
      lengthSliderValue: 90,
      questionTypes: ["short-answer"],
      difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
      isSTEM: false,
      needsEquations: false,
      needsGraphs: false,
      learningPath: {
        stageCount: 2,
        customStages: [
          {
            title: "Cell structures and their roles",
            purpose: "concept-exposure",
            concepts: ["Membranes", "Organelles"],
            activityTypes: ["concept-introduction"],
          },
          {
            title: "Apply structure-function relationships",
            purpose: "application",
          },
        ],
      },
    });

    expect(prompt).toContain("LENGTH & DETAIL — Longer (90/100)");
    expect(prompt).toContain("Plan exactly 2 stages");
    expect(prompt).toContain("Cell structures and their roles");
    expect(prompt).toContain("Apply structure-function relationships");
    expect(prompt).toContain('"lengthPreset": "shorter" | "short" | "regular" | "long" | "longer"');
  });
});
