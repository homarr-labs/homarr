import { describe, expect, test } from "vitest";

import { CUSTOM_WIDGET_STARTER } from "@homarr/custom-widgets/core";

import { validateWorkshopWidget } from "./schema";

describe("Workshop widget validation", () => {
  test("accepts a canonical credential-free widget", () => {
    expect(validateWorkshopWidget(JSON.stringify(CUSTOM_WIDGET_STARTER)).success).toBe(true);
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
