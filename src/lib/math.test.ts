import { describe, expect, it } from "vitest";
import { hasLatex, latexHtml, splitMath } from "./math";

describe("splitMath", () => {
  it("returns plain text untouched", () => {
    const segments = splitMath("just words, no equations");
    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({
      kind: "text",
      source: "just words, no equations",
      display: false,
    });
  });

  it("splits inline $…$ and display $$…$$ segments", () => {
    const segments = splitMath("Kinetic energy is $E_k = \\frac{1}{2}mv^2$ for a moving body.");
    const math = segments.filter((s) => s.kind === "math");
    expect(math).toHaveLength(1);
    expect(math[0].display).toBe(false);
    expect(math[0].source).toBe("E_k = \\frac{1}{2}mv^2");
  });

  it("prefers display delimiters", () => {
    const segments = splitMath("$$a^2 + b^2 = c^2$$");
    expect(segments[0]).toMatchObject({ kind: "math", display: true, source: "a^2 + b^2 = c^2" });
  });

  it("supports \\(…\\) and \\[…\\] delimiters", () => {
    expect(splitMath("\\(x + 1\\)")).toContainEqual({
      kind: "math",
      display: false,
      source: "x + 1",
    });
    expect(splitMath("\\[x + 1\\]")).toContainEqual({
      kind: "math",
      display: true,
      source: "x + 1",
    });
  });

  it("treats an unterminated $ as plain text", () => {
    const segments = splitMath("that costs $5 total");
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe("text");
  });

  it("keeps escaped \\$ as literal text", () => {
    const segments = splitMath("earned \\$5 and \\$10");
    expect(segments).toHaveLength(1);
    expect(segments[0].source).toContain("\\$5");
  });
});

describe("hasLatex", () => {
  it("detects math", () => {
    expect(hasLatex("with $x^2$ inside")).toBe(true);
    expect(hasLatex("nothing here")).toBe(false);
  });
});

describe("latexHtml", () => {
  it("renders KaTeX markup locally", () => {
    const html = latexHtml("\\frac{1}{2}", false);
    expect(html).toContain("katex");
  });

  it("does not throw on malformed input", () => {
    expect(() => latexHtml("\\notacommand{", false)).not.toThrow();
  });
});
