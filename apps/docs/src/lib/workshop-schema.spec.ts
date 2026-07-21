import { describe, expect, it } from "vitest";

import { CUSTOM_WIDGET_STARTER } from "@homarr/custom-widgets/core";

import { validateSubmissionContent } from "./workshop-schema";

const validWidget = CUSTOM_WIDGET_STARTER;

describe("validateSubmissionContent", () => {
  it("accepts a valid homarr-custom-widget-v2 JSON", () => {
    expect(validateSubmissionContent("customWidget", JSON.stringify(validWidget)).success).toBe(true);
  });

  it("rejects an old/unknown widget schema version", () => {
    const result = validateSubmissionContent(
      "customWidget",
      JSON.stringify({ ...validWidget, $schema: "homarr-custom-widget-v1" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects widgets without a schema version", () => {
    const { $schema: _schema, ...widgetWithoutSchema } = validWidget;

    expect(validateSubmissionContent("customWidget", JSON.stringify(widgetWithoutSchema)).success).toBe(false);
  });

  it("rejects malformed widget JSON", () => {
    expect(validateSubmissionContent("customWidget", "{ not json").success).toBe(false);
  });

  it("accepts non-empty CSS and rejects empty CSS", () => {
    expect(validateSubmissionContent("customCss", ".card { color: red; }").success).toBe(true);
    expect(validateSubmissionContent("customCss", "   ").success).toBe(false);
  });
});
