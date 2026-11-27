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
    expect(prompt).toContain("SMART MODE — AI-led source analysis");
    expect(prompt.match(/SMART MODE — AI-led source analysis/g)).toHaveLength(1);
    expect(prompt).toContain(
      "Do not copy the sample's question count, type mix, difficulty, or Learning Path size.",
    );
    expect(prompt).toContain("choose the most suitable Learning Path depth");
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
    expect(prompt).toContain("Choose the title, subject, description, objectives, level");
    expect(prompt).toContain("Choose the number and form of examples");
    expect(prompt).toContain(
      "Do not copy the sample's title, objectives, structure, question types, or counts",
    );
    expect(prompt).not.toContain("Describe the main structures in a cell.");
    expect(prompt).toContain("LENGTH & DETAIL — Longer (90/100)");
    expect(prompt).toContain("[Source: lecture.txt]");
  });
});

describe("Smart Mode course prompts", () => {
  it("lets the AI decide the course from sources instead of following local suggestions", () => {
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
    expect(prompt).toContain("Analyze the complete original source material yourself.");
    expect(prompt).toContain("choose the number of units, lessons, and checkpoint questions");
    expect(prompt).toContain(
      "Do not copy the sample's titles, objectives, structure, question types, difficulty, or counts",
    );
    expect(prompt).not.toContain("Cell biology foundations");
    expect(prompt).not.toContain("A course on cell structures and membrane transport.");
    expect(prompt).not.toContain("Explain how cell structures support their functions.");
    expect(prompt).toContain("LENGTH & DETAIL — Long (70/100)");
    expect(prompt).toContain("[Source: syllabus.pdf]");
    expect(prompt).toContain('Do not include "quiz" or "finalExam" anywhere');
    expect(prompt).not.toContain("Question mix: short-answer");
  });
});
