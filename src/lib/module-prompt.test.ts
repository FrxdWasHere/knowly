import { describe, expect, it } from "vitest";
import { buildModulePrompt } from "./module-prompt";

const baseInput = {
  title: "Cell biology",
  subject: "Biology",
  description: "How cells organize and sustain life.",
  difficulty: "2",
  minutes: "25",
  objectives: "Describe the main structures in a cell.",
  topics: "Cell foundations\nOrganelles",
  material: "[Source: lecture.pdf]\nCells contain several specialized organelles.",
  extra: "",
  tone: "",
  blurbs: [],
  lengthSliderValue: 50,
};

describe("Module generation prompt", () => {
  it("uses textbook standards and consolidates named source material", () => {
    const prompt = buildModulePrompt({ ...baseInput, smartModeEnabled: true });

    expect(prompt).toContain("professionally written textbook chapter");
    expect(prompt).toContain("reconcile overlapping explanations");
    expect(prompt).toContain("## Chapter 1");
    expect(prompt).toContain("### Section 1.1");
    expect(prompt).toContain("Each section must make sense when opened on its own");
    expect(prompt).toContain("[Source: lecture.pdf]");
    expect(prompt).toContain("SMART MODE — AI-LED ANALYSIS");
    expect(prompt).toContain("Choose the title, subject, description, objectives, level");
    expect(prompt).toContain(
      "Choose the number of chapters, sections, examples, and checkpoint questions yourself",
    );
    expect(prompt).not.toContain("Describe the main structures in a cell.");
    expect(prompt).toContain("write a description that reflects the scope you choose");
    expect(prompt).toContain('"highlightedText": string[]');
    expect(prompt).toContain("select one or two especially important visible passages in");
  });

  it("scales chapters, examples, and checkpoint practice with shared length settings", () => {
    const shorter = buildModulePrompt({ ...baseInput, lengthSliderValue: 20 });
    const longer = buildModulePrompt({ ...baseInput, lengthSliderValue: 90 });

    expect(shorter).toContain("LENGTH & DETAIL — Shorter (20/100)");
    expect(shorter).toContain("2–3 chapters");
    expect(shorter).toContain("2–4 concise checkpoint questions");
    expect(longer).toContain("LENGTH & DETAIL — Longer (90/100)");
    expect(longer).toContain("5–8 chapters");
    expect(longer).toContain("8–12 concise checkpoint questions");
    expect(longer).toContain("multiple varied examples");
  });

  it("keeps the same writing standard for manually configured prompts", () => {
    const prompt = buildModulePrompt({ ...baseInput, smartModeEnabled: false });

    expect(prompt).toContain("TEXTBOOK-CHAPTER WRITING STANDARD");
    expect(prompt).not.toContain("SMART MODE\n");
    expect(prompt).toContain("Cell foundations");
  });
});
