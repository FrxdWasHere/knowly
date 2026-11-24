import { describe, expect, it } from "vitest";
import { defaultCoursePrintOptions } from "@/components/print/course-paper";
import { resolveDocxDesign, resolveDocxExamAppearance } from "./docx-paper-design";
import { examOptionLabel, examQuestionLabel, EXAM_THEMES, THEME_PALETTES } from "./exam-print";

describe("resolveDocxExamAppearance", () => {
  it("carries theme-specific interior typography and layout into Word exports", () => {
    const designs = EXAM_THEMES.map((theme) =>
      resolveDocxDesign({ theme: theme.id, style: "design" }),
    );

    expect(designs).toHaveLength(35);
    expect(designs.every((design) => design.bodyFont && design.headingFont)).toBe(true);
    expect(new Set(designs.map((design) => design.headingFont)).size).toBeGreaterThan(4);
    expect(new Set(designs.map((design) => design.tableStyle)).size).toBeGreaterThan(4);
    expect(new Set(designs.map((design) => design.headingRule)).size).toBeGreaterThan(2);
  });

  it("uses the quiz theme, palette, print style, font and font size", () => {
    const appearance = resolveDocxExamAppearance(
      {
        theme: "blueprint",
        palette: "sky",
        printStyle: "design",
        fontFamily: "serif",
        fontSize: "large",
      },
      defaultCoursePrintOptions,
    );

    expect(appearance.design.theme).toBe("blueprint");
    expect(appearance.design.paletteId).toBe("sky");
    expect(appearance.design.style).toBe("design");
    expect(appearance.fontFamily).toBe("Georgia");
    expect(appearance.fontSizeHalfPoints).toBe(22);
  });

  it("resolves every supported theme and compatible palette for Word", () => {
    for (const theme of EXAM_THEMES) {
      for (const palette of THEME_PALETTES[theme.id]) {
        const appearance = resolveDocxExamAppearance(
          {
            theme: theme.id,
            palette,
            printStyle: "design",
            fontFamily: "default",
            fontSize: "normal",
          },
          defaultCoursePrintOptions,
        );

        expect(appearance.design.theme).toBe(theme.id);
        expect(appearance.design.paletteId).toBe(palette);
      }
    }
  });

  it("falls back to the shared paper defaults for older quiz settings", () => {
    const appearance = resolveDocxExamAppearance(
      {
        fontFamily: "default",
        fontSize: "normal",
      },
      { theme: "workbook", palette: "theme", printStyle: "friendly" },
    );

    expect(appearance.design.theme).toBe("workbook");
    expect(appearance.design.style).toBe("friendly");
    expect(appearance.fontFamily).toBe("Calibri");
    expect(appearance.fontSizeHalfPoints).toBe(20);
  });

  it.each([
    ["small", 18],
    ["normal", 20],
    ["large", 22],
  ] as const)("maps %s text to a consistent Word half-point size", (fontSize, wordSize) => {
    const appearance = resolveDocxExamAppearance(
      {
        fontFamily: "default",
        fontSize,
      },
      defaultCoursePrintOptions,
    );

    expect(appearance.fontSizeHalfPoints).toBe(wordSize);
  });

  it.each([
    ["classic", "Times New Roman"],
    ["serif", "Georgia"],
    ["sans", "Arial"],
    ["rounded", "Trebuchet MS"],
    ["mono", "Courier New"],
    ["handwritten", "Comic Sans MS"],
  ] as const)("maps the %s font selection to a Word font", (fontFamily, wordFont) => {
    const appearance = resolveDocxExamAppearance(
      {
        fontFamily,
        fontSize: "normal",
      },
      defaultCoursePrintOptions,
    );

    expect(appearance.fontFamily).toBe(wordFont);
  });

  it("uses the same number and option label formats as the paper preview", () => {
    expect(examQuestionLabel(0, "dot")).toBe("1.");
    expect(examQuestionLabel(0, "q")).toBe("Q1.");
    expect(examQuestionLabel(0, "paren")).toBe("(1)");
    expect(examOptionLabel(0, "upper")).toBe("A");
    expect(examOptionLabel(0, "lower")).toBe("a");
  });
});
