import { describe, expect, it } from "vitest";

import {
  CUSTOM_WIDGET_STARTER,
  getImportReview,
  parseCustomWidgetAiResponse,
  parseCustomWidgetClipboardDetailed,
} from "../core";

const response = (manifest: unknown, jsx = "<Text>Ready</Text>") =>
  `\`\`\`json\n${JSON.stringify(manifest, null, 2)}\n\`\`\`\n\`\`\`jsx\n${jsx}\n\`\`\``;

describe("Custom Widget imports", () => {
  it("accepts exactly one lean manifest and JSX block", () => {
    const result = parseCustomWidgetAiResponse(response({ ...CUSTOM_WIDGET_STARTER, template: "__HOMARR_TEMPLATE__" }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.widget.template).toBe("<Text>Ready</Text>");
  });

  it("rejects the unreleased superseded schema without normalization", () => {
    const result = parseCustomWidgetAiResponse(
      response({
        ...CUSTOM_WIDGET_STARTER,
        sources: Object.values(CUSTOM_WIDGET_STARTER.sources),
        requests: [],
        optionsSchema: {},
        defaultOptions: {},
        template: "__HOMARR_TEMPLATE__",
      }),
    );
    expect(result.success).toBe(false);
  });

  it("reports missing fences and removed local state", () => {
    expect(parseCustomWidgetAiResponse(JSON.stringify(CUSTOM_WIDGET_STARTER)).success).toBe(false);
    const result = parseCustomWidgetAiResponse(
      response({ ...CUSTOM_WIDGET_STARTER, stateSchema: {}, template: "__HOMARR_TEMPLATE__" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues.some(({ code }) => code === "REMOVED_LOCAL_STATE")).toBe(true);
  });

  it("returns a capability review from keyed records", () => {
    const review = getImportReview(CUSTOM_WIDGET_STARTER);
    expect(review).toMatchObject({ origins: ["https://example.com"], authTypes: ["none"], hasActions: false });
  });

  it("keeps strict clipboard import compatible with canonical exports", () => {
    const result = parseCustomWidgetClipboardDetailed(JSON.stringify(CUSTOM_WIDGET_STARTER));
    expect(result.success).toBe(true);
  });
});
