import { describe, expect, test } from "vitest";

import { getAssistantToolInputSchema } from "./assistant-tool-schema";

const templateSchema = {
  type: "object",
  properties: {
    sessionId: { type: "string" },
    template: { type: "string" },
    templateLines: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
};

describe("getAssistantToolInputSchema", () => {
  test.each(["customWidget_validateTemplate", "customWidget_previewReviseTemplate"])(
    "exposes one compact JSX format for %s",
    (toolName) => {
      expect(getAssistantToolInputSchema(toolName, templateSchema)).toEqual({
        ...templateSchema,
        properties: {
          sessionId: { type: "string" },
          templateLines: { type: "array", items: { type: "string" } },
        },
        required: ["templateLines"],
      });
    },
  );

  test("does not alter external or unrelated tool schemas", () => {
    expect(getAssistantToolInputSchema("customWidget_previewCreate", templateSchema)).toBe(templateSchema);
    expect(getAssistantToolInputSchema("board_getAllBoards", templateSchema)).toBe(templateSchema);
  });

  test("omits optional optimistic concurrency from the single-owner Assistant revision tool", () => {
    const schema = {
      ...templateSchema,
      properties: {
        ...templateSchema.properties,
        expectedRevision: { type: "integer" },
      },
    };

    expect(getAssistantToolInputSchema("customWidget_previewReviseTemplate", schema)).toMatchObject({
      properties: {
        sessionId: { type: "string" },
        templateLines: { type: "array", items: { type: "string" } },
      },
    });
    expect(getAssistantToolInputSchema("customWidget_previewReviseTemplate", schema).properties).not.toHaveProperty(
      "expectedRevision",
    );
  });
});
