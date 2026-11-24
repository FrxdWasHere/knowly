import { describe, expect, it } from "vitest";
import { SAMPLE_MODULE_JSON, serializeModuleJson, validateModuleJson } from "./module-schema";

describe("module AI-selected highlights", () => {
  it("preserves selected passages through validation and module JSON export", () => {
    const result = validateModuleJson(SAMPLE_MODULE_JSON);
    expect(result.ok).toBe(true);

    const block = result.module?.blocks.find((item) => item.highlightedText?.length);
    expect(block?.highlightedText).toEqual(["Chloroplasts capture light"]);

    const exported = JSON.parse(serializeModuleJson(result.module!)) as {
      blocks: { highlightedText?: string[] }[];
    };
    expect(exported.blocks.find((item) => item.highlightedText)?.highlightedText).toEqual([
      "Chloroplasts capture light",
    ]);
  });
});
