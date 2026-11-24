import { describe, expect, it } from "vitest";
import {
  createReadingHighlightAnchor,
  locateReadingHighlight,
  normalizeReadingText,
} from "@/lib/reading-highlights";

describe("reading highlight anchors", () => {
  it("normalizes selected text and retains its nearby context", () => {
    const anchor = createReadingHighlightAnchor(
      "A foundation was introduced.\n",
      "  active   recall ",
      "\nhelps learners remember.",
    );

    expect(anchor).toEqual({
      quote: "active recall",
      prefix: "A foundation was introduced.",
      suffix: "helps learners remember.",
      startOffset: "A foundation was introduced.".length,
    });
  });

  it("reanchors a passage after surrounding text changes and distinguishes repeats", () => {
    const anchor = createReadingHighlightAnchor(
      "The first use is brief. Important idea appears here. The section ends.",
      "Important idea",
      "",
    );
    expect(anchor).not.toBeNull();

    const changed = "New introduction. Important idea remains here. The section ends.";
    expect(locateReadingHighlight(changed, anchor!)).toEqual({
      start: changed.indexOf("Important idea"),
      end: changed.indexOf("Important idea") + "Important idea".length,
    });

    const repeated = "Important idea appears once. Later, Important idea appears again.";
    const repeatedAnchor = createReadingHighlightAnchor(
      "Later, ",
      "Important idea",
      " appears again.",
    );
    expect(locateReadingHighlight(repeated, repeatedAnchor!)).toEqual({
      start: repeated.lastIndexOf("Important idea"),
      end: repeated.lastIndexOf("Important idea") + "Important idea".length,
    });
  });

  it("keeps an unmatched annotation stored without attaching it to unrelated text", () => {
    const anchor = createReadingHighlightAnchor(
      "Previously, ",
      "fragile concept",
      " was explained.",
    );
    expect(locateReadingHighlight("A different passage about photosynthesis.", anchor!)).toBeNull();
    expect(normalizeReadingText("  spaced\n text   stays readable  ")).toBe(
      "spaced text stays readable",
    );
  });
});
