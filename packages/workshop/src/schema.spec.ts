import { describe, expect, test } from "vitest";

import { CUSTOM_WIDGET_STARTER } from "@homarr/custom-widgets/core";

import { validateWorkshopWidget, workshopSubmissionInputSchema } from "./schema";

describe("Workshop widget validation", () => {
  test("accepts a canonical credential-free widget", () => {
    expect(validateWorkshopWidget(JSON.stringify(CUSTOM_WIDGET_STARTER)).success).toBe(true);
    expect(
      workshopSubmissionInputSchema.safeParse({
        title: "Starter widget",
        description: "",
        content: JSON.stringify(CUSTOM_WIDGET_STARTER),
      }).success,
    ).toBe(true);
  });

  test("uses canonical option-binding validation before publication", () => {
    const request = {
      id: "data",
      sourceId: "default",
      kind: "query" as const,
      method: "GET" as const,
      pathTemplate: "/data/{endpointId}",
      parameters: { endpointId: "string" as const, limit: "number" as const },
      optionsBinding: { endpointId: { $option: "endpointId" }, limit: 5 },
      queryTemplate: { limit: { $param: "limit" } },
      auth: "inherit" as const,
      minimumBoardPermission: "view" as const,
      trigger: "load" as const,
    };
    const widget = {
      ...CUSTOM_WIDGET_STARTER,
      requests: [request],
      optionsSchema: {
        type: "object" as const,
        properties: { endpointId: { type: "string" as const } },
        required: ["endpointId"],
        additionalProperties: false as const,
      },
      defaultOptions: { endpointId: "local" },
    };

    expect(validateWorkshopWidget(JSON.stringify(widget)).success).toBe(true);
    expect(
      validateWorkshopWidget(JSON.stringify({ ...widget, requests: [{ ...request, optionsBinding: { limit: 5 } }] }))
        .success,
    ).toBe(false);
    expect(
      validateWorkshopWidget(
        JSON.stringify({
          ...widget,
          requests: [{ ...request, optionsBinding: { endpointId: { $option: "missing" }, limit: 5 } }],
        }),
      ).success,
    ).toBe(false);
  });

  test("rejects literal credentials in templates and icon URLs", () => {
    expect(
      validateWorkshopWidget(
        JSON.stringify({
          ...CUSTOM_WIDGET_STARTER,
          template: "<Text>Authorization: Bearer literal-secret-value</Text>",
        }),
      ).success,
    ).toBe(false);
    expect(
      validateWorkshopWidget(
        JSON.stringify({
          ...CUSTOM_WIDGET_STARTER,
          iconUrl: "https://example.com/icon.png?clientSecret=literal-secret",
        }),
      ).success,
    ).toBe(false);
    expect(
      validateWorkshopWidget(
        JSON.stringify({
          ...CUSTOM_WIDGET_STARTER,
          requests: [
            {
              id: "load",
              sourceId: "default",
              kind: "query",
              method: "GET",
              pathTemplate: "/load",
              parameters: {},
              staticHeaders: { "X-Custom": "Bearer literal-secret-value" },
              auth: "none",
              minimumBoardPermission: "view",
              trigger: "load",
            },
          ],
        }),
      ).success,
    ).toBe(false);
  });
});
