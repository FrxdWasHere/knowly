import { describe, expect, it } from "vitest";
import { createReadingHighlightPlugin } from "@/components/module-markdown";
import type { ReadingHighlight } from "@/lib/types";

describe("Module Markdown highlights", () => {
  it("restores an anchored selection across inline formatting", () => {
    const highlight: ReadingHighlight = {
      id: "highlight-1",
      documentType: "module",
      documentId: "module-1",
      locationId: "block-1",
      quote: "a concept",
      prefix: "Revisit",
      suffix: "slowly.",
      startOffset: 8,
      createdAt: 1,
    };
    const tree = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [
            { type: "text", value: "Revisit " },
            {
              type: "element",
              tagName: "em",
              properties: {},
              children: [{ type: "text", value: "a concept" }],
            },
            { type: "text", value: " slowly." },
          ],
        },
      ],
    };

    createReadingHighlightPlugin([highlight])()(tree);

    const serialized = JSON.stringify(tree);
    expect(serialized).toContain('"dataReadingHighlightId":"highlight-1"');
    expect(serialized).toContain('"value":"a concept"');
  });
});
