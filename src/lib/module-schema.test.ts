import { describe, expect, it } from "vitest";
import { SAMPLE_MODULE_JSON, serializeModuleJson, validateModuleJson } from "./module-schema";

describe("module AI-selected highlights", () => {
  it("preserves selected passages through validation and module JSON export", () => {
    const result = validateModuleJson(SAMPLE_MODULE_JSON);
    expect(result.ok).toBe(true);

    const highlightedBlocks = result.module?.blocks.filter((item) => item.highlightedText?.length);
    expect(highlightedBlocks?.map((block) => block.highlightedText)).toEqual([
      ["Chloroplasts capture light"],
      ["light energy absorbed by chlorophyll"],
    ]);

    const exported = JSON.parse(serializeModuleJson(result.module!)) as {
      blocks: { highlightedText?: string[] }[];
    };
    expect(
      exported.blocks.filter((item) => item.highlightedText).map((block) => block.highlightedText),
    ).toEqual([["Chloroplasts capture light"], ["light energy absorbed by chlorophyll"]]);
  });
});
