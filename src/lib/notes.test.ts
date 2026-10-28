import { describe, expect, it } from "vitest";
import {
  cloneElement,
  elementBounds,
  hitElement,
  moveElement,
  pointInPolygon,
  resizeElementToBounds,
} from "./notes/render";
import { collectNotebookText } from "./notes/study";
import {
  clampTemplateOpacity,
  emptyPage,
  textFromPage,
  type NoteElement,
  type NotePage,
  type StrokeElement,
} from "./notes/types";

const stroke: StrokeElement = {
  id: "stroke-1",
  type: "stroke",
  tool: "pen",
  points: [10, 20, 0.5, 40, 60, 0.5],
  color: "#111111",
  width: 4,
  opacity: 1,
};

const page = (elements: NoteElement[], searchText = ""): NotePage => ({
  id: "page-1",
  notebookId: "notebook-1",
  template: "lined",
  width: 794,
  height: 1123,
  elements,
  searchText,
  createdAt: 1,
  updatedAt: 1,
});

describe("note geometry", () => {
  it("computes bounds for strokes and boxed elements", () => {
    expect(elementBounds(stroke)).toEqual({ x: 10, y: 20, width: 30, height: 40 });
    expect(
      elementBounds({
        id: "text-1",
        type: "text",
        x: 100,
        y: 200,
        width: 220,
        height: 80,
        text: "Hello",
        fontSize: 18,
        color: "#111111",
      }),
    ).toEqual({ x: 100, y: 200, width: 220, height: 80 });
  });

  it("hit-tests strokes along their path and boxes within tolerance", () => {
    expect(hitElement(stroke, 25, 40)).toBe(true);
    expect(hitElement(stroke, 200, 200)).toBe(false);
    const sticky: NoteElement = {
      id: "sticky-1",
      type: "sticky",
      x: 50,
      y: 50,
      width: 120,
      height: 90,
      text: "Remember",
      color: "#fef3a5",
    };
    expect(hitElement(sticky, 169, 139, 0)).toBe(true);
    expect(hitElement(sticky, 175, 145, 6)).toBe(true);
    expect(hitElement(sticky, 175, 145, 4)).toBe(false);
  });

  it("moves strokes by shifting every point and boxes by x/y", () => {
    const moved = moveElement(stroke, 5, -5);
    expect(moved.type).toBe("stroke");
    if (moved.type === "stroke") {
      expect(moved.points.slice(0, 6)).toEqual([15, 15, 0.5, 45, 55, 0.5]);
    }
    const shape: NoteElement = {
      id: "shape-1",
      type: "shape",
      shape: "rect",
      x: 10,
      y: 20,
      width: 30,
      height: 40,
      stroke: "#111111",
      strokeWidth: 2,
    };
    expect(moveElement(shape, 3, 4)).toMatchObject({ x: 13, y: 24 });
  });

  it("normalizes reversed line and arrow bounds", () => {
    const line: NoteElement = {
      id: "line-1",
      type: "shape",
      shape: "arrow",
      x: 120,
      y: 140,
      width: -70,
      height: -60,
      stroke: "#111111",
      strokeWidth: 2,
    };
    expect(elementBounds(line)).toEqual({ x: 50, y: 80, width: 70, height: 60 });
    expect(hitElement(line, 60, 90, 2)).toBe(true);
    expect(hitElement(line, 130, 150, 0)).toBe(false);
    expect(hitElement(line, 85, 110, 0)).toBe(true);
    expect(hitElement(line, 50, 150, 0)).toBe(false);
  });

  it("resizes boxes and scales every point in a stroke", () => {
    const target = { x: 20, y: 30, width: 60, height: 80 };
    expect(resizeElementToBounds(stroke, elementBounds(stroke), target)).toMatchObject({
      points: [20, 30, 0.5, 80, 110, 0.5],
    });
    const box: NoteElement = {
      id: "box-1",
      type: "image",
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      src: "data:image/png;base64,",
    };
    expect(resizeElementToBounds(box, elementBounds(box), target)).toMatchObject(target);
  });

  it("clones an element with a new id and independent stroke points", () => {
    const clone = cloneElement(stroke);
    expect(clone.id).not.toBe(stroke.id);
    expect(clone).not.toBe(stroke);
    if (clone.type === "stroke") {
      expect(clone.points).not.toBe(stroke.points);
      expect(clone.points).toEqual(stroke.points);
    }
  });

  it("uses ray casting for lasso selection", () => {
    const polygon = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    expect(pointInPolygon(50, 50, polygon)).toBe(true);
    expect(pointInPolygon(150, 50, polygon)).toBe(false);
  });
});

describe("notebook text extraction", () => {
  it("collects typed, sticky, tape and extracted PDF text", () => {
    const notePage = page(
      [
        {
          id: "text-1",
          type: "text",
          x: 10,
          y: 10,
          width: 200,
          height: 40,
          text: "Osmosis is diffusion of water.",
          fontSize: 18,
          color: "#111111",
        },
        {
          id: "sticky-1",
          type: "sticky",
          x: 20,
          y: 100,
          width: 150,
          height: 120,
          text: "Review active transport.",
          color: "#fef3a5",
        },
        {
          id: "tape-1",
          type: "tape",
          x: 20,
          y: 250,
          width: 120,
          height: 44,
          color: "#f8d477",
          revealed: false,
          label: "Exam clue",
        },
      ],
      "Membrane proteins move laterally.",
    );
    const text = textFromPage(notePage);
    expect(text).toContain("Osmosis");
    expect(text).toContain("Review active transport");
    expect(text).toContain("Exam clue");
    expect(text).toContain("Membrane proteins");
    expect(collectNotebookText([notePage])).toContain("--- Page 1 ---");
  });

  it("omits pages that contain no text", () => {
    expect(collectNotebookText([page([stroke])])).toBe("");
  });
});

describe("emptyPage", () => {
  it("creates a page with the requested template and size", () => {
    const created = emptyPage("nb-1", "grid", 816, 1056);
    expect(created.notebookId).toBe("nb-1");
    expect(created.template).toBe("grid");
    expect(created.width).toBe(816);
    expect(created.height).toBe(1056);
    expect(created.elements).toEqual([]);
    expect(created.id).toMatch(/^pg_/);
  });
});

describe("page pattern", () => {
  it("clamps pattern strength and defaults to pure black", () => {
    expect(clampTemplateOpacity(undefined)).toBe(100);
    expect(clampTemplateOpacity(-20)).toBe(0);
    expect(clampTemplateOpacity(42.6)).toBe(43);
    expect(clampTemplateOpacity(100)).toBe(100);
    expect(clampTemplateOpacity(180)).toBe(100);
    expect(clampTemplateOpacity(Number.NaN)).toBe(100);
    expect(emptyPage("nb-1", "grid", 794, 1123).templateOpacity).toBe(100);
  });
});
