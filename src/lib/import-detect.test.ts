import { describe, expect, it } from "vitest";
import { detectImportKind } from "./import-detect";

describe("detectImportKind", () => {
  it("recognises a full backup", () => {
    expect(detectImportKind({ version: 5, decks: [], courses: [] })).toBe("backup");
  });

  it("recognises a notebook bundle", () => {
    expect(detectImportKind({ format: "knowly-notebook", notebook: {}, pages: [] })).toBe(
      "notebook",
    );
  });

  it("recognises courses, including the wrapped form", () => {
    const course = { title: "Biology", modules: [{ title: "One", lessons: [{ title: "a" }] }] };
    expect(detectImportKind(course)).toBe("course");
    expect(detectImportKind({ course })).toBe("course");
  });

  it("recognises modules", () => {
    const module = { title: "Mitosis", blocks: [{ type: "markdown" }], questions: [] };
    expect(detectImportKind(module)).toBe("module");
  });

  it("separates decks from question packs by their title", () => {
    const questions = [{ type: "flashcard", question: "Q", answer: "A" }];
    expect(detectImportKind({ title: "Cells", questions })).toBe("deck");
    expect(detectImportKind({ deckTitle: "Cells", questions })).toBe("questions");
    expect(detectImportKind({ questions })).toBe("questions");
    expect(detectImportKind(questions)).toBe("questions");
  });

  it("ignores anything it can't place", () => {
    expect(detectImportKind("hello")).toBeNull();
    expect(detectImportKind({ hello: "world" })).toBeNull();
    expect(detectImportKind([1, 2, 3])).toBeNull();
  });
});
