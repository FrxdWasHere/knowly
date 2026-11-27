import { describe, expect, it } from "vitest";
import { buildCoursePrompt } from "./course-prompt";
import type { QuestionType } from "./types";

const baseInput = {
  topic: "Cell biology\nMembrane transport",
  material:
    "[Source: lecture.pdf]\nCells contain specialized organelles and exchange substances with their environment.",
  title: "Foundations of cell biology",
  subject: "Biology",
  level: "Grade 11",
  description: "Understand cell structures and how substances move across membranes.",
  objectives: "Explain the structure of a cell.\nCompare passive and active transport.",
  sectionGuidance: "Cell foundations\nMembrane transport",
  moduleCount: 4,
  lessonsPerModule: 3,
  questionsPerLesson: 4,
  types: ["multiple-choice", "short-answer"] as QuestionType[],
  distribution: { easy: 20, medium: 55, hard: 25 },
  extra: "",
  tone: "",
  includeAssessments: true,
};

describe("Course generation prompt", () => {
  it("defines a coherent program with consolidated sources and standalone textbook-style lessons", () => {
    const prompt = buildCoursePrompt({
      ...baseInput,
      sizeAuto: true,
      lengthSliderValue: 50,
      smartModeEnabled: true,
    });

    expect(prompt).toContain("complete educational program");
    expect(prompt).toContain("do not make a separate unit for each file");
    expect(prompt).toContain("substantial, coherent reference chapter");
    expect(prompt).toContain("## Section N — Section title");
    expect(prompt).toContain("[Source: lecture.pdf]");
    expect(prompt).toContain("SMART MODE — AI-LED ANALYSIS");
    expect(prompt).toContain(
      "Choose and justify the topic, title, subject, description, objectives",
    );
    expect(prompt).not.toContain("Foundations of cell biology");
    expect(prompt).not.toContain("Compare passive and active transport.");
    expect(prompt).not.toContain("Description: Understand cell structures");
    expect(prompt).toContain(
      "choose the number of units, lessons, and checkpoint questions from the actual source",
    );
    expect(prompt).toContain('"highlightedText": string[]');
    expect(prompt).toContain(
      "select one or two of the most important visible definitions, causal ideas, or takeaways",
    );
  });

  it("scales unit, lesson, and section guidance with shared length/detail settings", () => {
    const shorter = buildCoursePrompt({
      ...baseInput,
      sizeAuto: true,
      lengthSliderValue: 20,
    });
    const longer = buildCoursePrompt({
      ...baseInput,
      sizeAuto: true,
      lengthSliderValue: 90,
    });

    expect(shorter).toContain("LENGTH & DETAIL — Shorter (20/100)");
    expect(shorter).toContain("2–3 units, 1–2 lessons per unit, 1–2 meaningful sections");
    expect(longer).toContain("LENGTH & DETAIL — Longer (90/100)");
    expect(longer).toContain("6–8 units, 3–4 lessons per unit, 3–5 meaningful sections");
    expect(longer).toContain("most comprehensive appropriate program");
  });

  it("preserves manually selected unit and lesson counts while applying course standards", () => {
    const prompt = buildCoursePrompt({
      ...baseInput,
      sizeAuto: false,
      sectionsAuto: false,
      sectionsPerLesson: 2,
      lengthSliderValue: 70,
    });

    expect(prompt).toContain("Modules: exactly 4");
    expect(prompt).toContain("Lessons per module: exactly 3");
    expect(prompt).toContain("Sections per lesson: exactly 2 meaningful sections");
    expect(prompt).toContain("preserve them and scale explanation, examples, and context");
    expect(prompt).toContain("the learner's exact unit and lesson counts");
  });
});
