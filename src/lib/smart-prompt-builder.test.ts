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

describe("Smart Mode module prompts", () => {
  it("uses the textbook builder with the shared length/detail budget", () => {
    const prompt = buildSmartPrompt({
      content_type: "module",
      title: "Cell biology",
      subject: "Biology",
      material: "[Source: lecture.txt]\nCells contain specialized organelles.",
      suggestions: {
        topics: ["Cell structure", "Organelles"],
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
    });

    expect(prompt).toContain("SMART MODE");
    expect(prompt).toContain("professionally written textbook chapter");
    expect(prompt).toContain("Cell structure");
    expect(prompt).toContain("LENGTH & DETAIL — Longer (90/100)");
    expect(prompt).toContain("[Source: lecture.txt]");
  });
});

describe("Smart Mode course prompts", () => {
  it("uses the course program builder with editable suggestions and shared length/detail", () => {
    const prompt = buildSmartPrompt({
      content_type: "course",
      title: "",
      subject: "",
      material: "[Source: syllabus.pdf]\nCell structures and transport.",
      suggestions: {
        title: "Cell biology foundations",
        subject: "Biology",
        description: "A course on cell structures and membrane transport.",
        topics: ["Cell structure", "Membrane transport"],
        learningObjectives: ["Explain how cell structures support their functions."],
      },
      autoConfigure: true,
      lengthPreset: "long",
      lengthSliderValue: 70,
      questionTypes: ["short-answer"],
      difficultyDistribution: { easy: 20, medium: 55, hard: 25 },
      isSTEM: false,
      needsEquations: false,
      needsGraphs: false,
      includeAssessments: false,
    });

    expect(prompt).toContain("SMART MODE");
    expect(prompt).toContain("Cell biology foundations");
    expect(prompt).toContain("Cell structure\nMembrane transport");
    expect(prompt).toContain("LENGTH & DETAIL — Long (70/100)");
    expect(prompt).toContain("Course size: choose the number of units, lessons");
    expect(prompt).toContain("[Source: syllabus.pdf]");
    expect(prompt).toContain('Do not include "quiz" or "finalExam" anywhere');
  });
});
