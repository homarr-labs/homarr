import { describe, expect, it } from "vitest";

import { validateSubmissionContent } from "./store-schema";

const validWidget = {
  $schema: "homarr-custom-widget-v2",
  name: "Example",
  url: "https://example.com/api",
  authType: "none",
  method: "GET",
  displayType: "singleValue",
  displayConfig: { type: "singleValue", jsonPath: "$.count", label: "Count", unit: "" },
};

describe("validateSubmissionContent", () => {
  it("accepts a valid homarr-custom-widget-v2 JSON", () => {
    expect(validateSubmissionContent("widget", JSON.stringify(validWidget)).success).toBe(true);
  });

  it("rejects an old/unknown widget schema version", () => {
    const result = validateSubmissionContent(
      "widget",
      JSON.stringify({ ...validWidget, $schema: "homarr-custom-widget-v1" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects malformed widget JSON", () => {
    expect(validateSubmissionContent("widget", "{ not json").success).toBe(false);
  });

  it("accepts non-empty CSS and rejects empty CSS", () => {
    expect(validateSubmissionContent("css", ".card { color: red; }").success).toBe(true);
    expect(validateSubmissionContent("css", "   ").success).toBe(false);
  });
});
