import { describe, expect, it } from "vitest";

import { CUSTOM_WIDGET_STARTER } from "../core/examples";
import { parseCustomWidgetClipboard, parseCustomWidgetClipboardDetailed } from "../core/import";

describe("parseCustomWidgetClipboard", () => {
  it("accepts the canonical raw JSON export", () => {
    expect(parseCustomWidgetClipboard(JSON.stringify(CUSTOM_WIDGET_STARTER))?.$schema).toBe("homarr-custom-widget-v2");
  });

  it("combines widget.json and widget.jsx blocks", () => {
    const manifest = { ...CUSTOM_WIDGET_STARTER, template: "__HOMARR_TEMPLATE__" };
    const result = parseCustomWidgetClipboard(
      `\`\`\`json\n${JSON.stringify(manifest)}\n\`\`\`\n\`\`\`jsx\n<Text>{options.title}</Text>\n\`\`\``,
    );
    expect(result?.template).toBe("<Text>{options.title}</Text>");
  });

  it("rejects removed display types and old exports", () => {
    expect(
      parseCustomWidgetClipboard(JSON.stringify({ displayType: "raw", displayConfig: { type: "raw" } })),
    ).toBeNull();
  });

  it("returns an actionable validation issue for invalid AI output", () => {
    expect(parseCustomWidgetClipboardDetailed(JSON.stringify({ $schema: "homarr-custom-widget-v2" }))).toEqual({
      success: false,
      error: expect.stringMatching(/name|sources/u),
    });
  });
});
