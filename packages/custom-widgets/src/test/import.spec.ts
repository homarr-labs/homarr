import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CUSTOM_WIDGET_STARTER } from "../core/examples";
import {
  parseCustomWidgetAiResponse,
  parseCustomWidgetClipboard,
  parseCustomWidgetClipboardDetailed,
} from "../core/import";

describe("Custom Widget imports", () => {
  it("accepts the canonical raw JSON export", () => {
    expect(parseCustomWidgetClipboard(JSON.stringify(CUSTOM_WIDGET_STARTER))?.$schema).toBe("homarr-custom-widget-v2");
  });

  it("combines one widget.json block and one widget.jsx block", () => {
    const manifest = { ...CUSTOM_WIDGET_STARTER, template: "__HOMARR_TEMPLATE__" };
    const result = parseCustomWidgetAiResponse(
      `\`\`\`json\n${JSON.stringify(manifest)}\n\`\`\`\n\`\`\`jsx\n<Text>{options.title}</Text>\n\`\`\``,
    );
    expect(result).toMatchObject({ success: true, widget: { template: "<Text>{options.title}</Text>" } });
  });

  it("normalizes common AI parameter objects but keeps strict imports strict", () => {
    const request = {
      id: "detail",
      sourceId: "default",
      kind: "query",
      method: "GET",
      pathTemplate: "/pokemon/{name}",
      parameters: { name: { type: "string" } },
      auth: "inherit",
      minimumBoardPermission: "view",
      trigger: "manual",
    };
    const manifest = { ...CUSTOM_WIDGET_STARTER, requests: [request], template: "__HOMARR_TEMPLATE__" };
    expect(parseCustomWidgetClipboardDetailed(JSON.stringify(manifest)).success).toBe(false);
    const result = parseCustomWidgetAiResponse(
      `\`\`\`json\n${JSON.stringify(manifest)}\n\`\`\`\n\`\`\`jsx\n<Text>Pokemon</Text>\n\`\`\``,
    );
    expect(result).toMatchObject({
      success: true,
      widget: { requests: [{ parameters: { name: "string" } }] },
      warnings: [{ code: "NORMALIZED_PARAMETER_TYPE" }],
    });
  });

  it("returns multiple actionable issues for the supplied malformed Pokemon response", async () => {
    const response = await readFile(resolve(import.meta.dirname, "fixtures/pokedex-ai-response.md"), "utf8");
    const result = parseCustomWidgetAiResponse(response);
    expect(result).toMatchObject({ success: false });
    if (result.success) throw new Error("Expected malformed response to fail");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_JSON" }),
        expect.objectContaining({ code: "INVALID_JSON_ESCAPE" }),
        expect.objectContaining({ code: "AI_JSX_BLOCK_REQUIRED" }),
        expect.objectContaining({ code: "REMOVED_LOCAL_STATE" }),
      ]),
    );
  });

  it("rejects removed fields, legacy displays, and missing JSX fences explicitly", () => {
    expect(
      parseCustomWidgetClipboard(JSON.stringify({ displayType: "raw", displayConfig: { type: "raw" } })),
    ).toBeNull();
    const result = parseCustomWidgetAiResponse(
      `\`\`\`json\n${JSON.stringify({ ...CUSTOM_WIDGET_STARTER, stateSchema: {} })}\n\`\`\``,
    );
    expect(result).toMatchObject({ success: false });
    if (result.success) throw new Error("Expected removed state to fail");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "REMOVED_LOCAL_STATE" }),
        expect.objectContaining({ code: "AI_JSX_BLOCK_REQUIRED" }),
      ]),
    );
  });

  it("returns all useful schema issues instead of a nullable failure", () => {
    const result = parseCustomWidgetClipboardDetailed(JSON.stringify({ $schema: "homarr-custom-widget-v2" }));
    expect(result).toMatchObject({ success: false });
    if (result.success) throw new Error("Expected invalid widget to fail");
    expect(result.issues.length).toBeGreaterThan(1);
    expect(result.issues.some((issue) => issue.path?.includes("name"))).toBe(true);
  });
});
