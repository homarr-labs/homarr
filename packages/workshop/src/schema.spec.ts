import { describe, expect, it } from "vitest";

import {
  CSS_SCHEMA_VERSION,
  WIDGET_SCHEMA_VERSION,
  schemaVersionForType,
  validateWorkshopContent,
  workshopExportFilename,
  workshopScreenshotsSchema,
  workshopSubmissionInputSchema,
} from "./schema";

const validWidget = {
  $schema: WIDGET_SCHEMA_VERSION,
  name: "Status",
  url: "https://example.com/api/status",
  authType: "none",
  method: "GET",
  displayType: "singleValue",
  displayConfig: {
    type: "singleValue",
    jsonPath: "$.value",
    label: "Status",
    unit: "",
    valueSize: "md",
    labelPosition: "above",
  },
};

describe("Workshop contracts", () => {
  it("accepts the canonical custom widget export", () => {
    expect(validateWorkshopContent("widget", JSON.stringify(validWidget)).success).toBe(true);
  });

  it("rejects missing and mismatched widget schemas", () => {
    const { $schema: _, ...missing } = validWidget;
    expect(validateWorkshopContent("widget", JSON.stringify(missing)).success).toBe(false);
    expect(
      validateWorkshopContent("widget", JSON.stringify({ ...validWidget, displayConfig: { type: "raw" } })).success,
    ).toBe(false);
  });

  it("enforces CSS and input limits", () => {
    expect(validateWorkshopContent("css", "  ").success).toBe(false);
    expect(
      workshopSubmissionInputSchema.safeParse({
        type: "css",
        title: "Theme",
        description: "",
        content: "body { color: red; }",
        changelog: "",
      }).success,
    ).toBe(true);
  });

  it("returns stable schema versions and safe filenames", () => {
    expect(schemaVersionForType("widget")).toBe(WIDGET_SCHEMA_VERSION);
    expect(schemaVersionForType("css")).toBe(CSS_SCHEMA_VERSION);
    expect(workshopExportFilename("My / Theme!", "css")).toBe("my-theme.css");
    expect(workshopExportFilename("---My---Widget---", "widget")).toBe("my-widget.json");
    expect(workshopExportFilename("-".repeat(100_000), "css")).toBe("homarr-workshop.css");
  });

  it("validates screenshot count, MIME type, and size", () => {
    expect(workshopScreenshotsSchema.safeParse([{ size: 1024, type: "image/png" }]).success).toBe(true);
    expect(workshopScreenshotsSchema.safeParse([{ size: 1024, type: "image/svg+xml" }]).success).toBe(false);
    expect(workshopScreenshotsSchema.safeParse([{ size: 6 * 1024 * 1024, type: "image/webp" }]).success).toBe(false);
  });
});
