import { Math as DocxMath } from "docx";
import { describe, expect, it } from "vitest";
import { latexToDocxMath } from "./docx-math";

describe("latexToDocxMath", () => {
  it.each([
    ["x^2 + y_1", "scripted expressions"],
    ["\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}", "fractions and roots"],
    ["\\begin{matrix}a&b\\\\c&d\\end{matrix}", "matrices"],
  ])("converts %s into a Word equation with %s", (source) => {
    expect(latexToDocxMath(source)).toBeInstanceOf(DocxMath);
  });

  it("surfaces unsupported or malformed LaTeX instead of silently exporting source text", () => {
    expect(() => latexToDocxMath("\\notARealLatexCommand{x}")).toThrow();
  });
});
