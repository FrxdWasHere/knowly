import { describe, expect, it } from "vitest";
import { EXAM_THEMES } from "@/lib/exam-print";
import {
  DOCUMENT_THEME_DESIGNS,
  documentHighlightContrast,
  documentThemeContrast,
  getDocumentHighlight,
} from "@/lib/document-themes";

describe("document theme designs", () => {
  it("defines a distinct interior design for every existing theme", () => {
    const themeIds = EXAM_THEMES.map((theme) => theme.id);
    const designIds = Object.keys(DOCUMENT_THEME_DESIGNS);
    const signatures = themeIds.map((id) => {
      const design = DOCUMENT_THEME_DESIGNS[id];
      return [
        design.screenPage,
        design.screenSurface,
        design.bodyFont,
        design.headingFont,
        design.titleRule,
        design.headingMarker,
        design.calloutRadius,
        design.quoteStyle,
        design.tableStyle,
        design.pagePattern,
      ].join("|");
    });

    expect(designIds.sort()).toEqual(themeIds.sort());
    expect(new Set(signatures).size).toBe(themeIds.length);
  });

  it("uses readable, theme-derived highlight colors for all themes", () => {
    const backgrounds = EXAM_THEMES.map((theme) => getDocumentHighlight(theme.id).background);

    expect(new Set(backgrounds).size).toBe(EXAM_THEMES.length);
    for (const theme of EXAM_THEMES) {
      expect(documentHighlightContrast(theme.id)).toBeGreaterThanOrEqual(4.5);
      expect(documentThemeContrast(theme.id, "screen")).toBeGreaterThanOrEqual(4.5);
      expect(documentThemeContrast(theme.id, "paper")).toBeGreaterThanOrEqual(4.5);
    }
  });
});
