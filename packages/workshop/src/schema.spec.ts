import { describe, expect, test } from "vitest";

import { CUSTOM_WIDGET_STARTER } from "@homarr/custom-widgets/core";

import { validateWorkshopWidget, workshopSubmissionInputSchema } from "./schema";

describe("Workshop widget validation", () => {
  test("accepts a canonical credential-free widget", () => {
    expect(validateWorkshopWidget(JSON.stringify(CUSTOM_WIDGET_STARTER)).success).toBe(true);
    expect(
      workshopSubmissionInputSchema.safeParse({
        type: "customWidget",
        title: "Starter widget",
        description: "",
        content: JSON.stringify(CUSTOM_WIDGET_STARTER),
      }).success,
    ).toBe(true);
  });

  test("accepts Custom CSS without treating it as widget JSON", () => {
    expect(
      workshopSubmissionInputSchema.safeParse({
        type: "customCss",
        title: "Quiet dashboard",
        description: "",
        content: ".mantine-Card-root { box-shadow: none; }",
      }).success,
    ).toBe(true);
  });

  test("uses canonical direct-binding validation before publication", () => {
    const widget = {
      ...CUSTOM_WIDGET_STARTER,
      requests: {
        data: {
          path: "/data/{option:endpointId}",
          query: { limit: 5 },
        },
      },
      options: { endpointId: { label: "Endpoint", control: "text", default: "local" } },
    };

    expect(validateWorkshopWidget(JSON.stringify(widget)).success).toBe(true);
    expect(
      validateWorkshopWidget(JSON.stringify({ ...widget, requests: { data: { path: "/data/{option:missing}" } } }))
        .success,
    ).toBe(false);
    expect(
      validateWorkshopWidget(
        JSON.stringify({
          ...widget,
          requests: { data: { path: "/data/{param:endpointId}" } },
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
          requests: { load: { path: "/load", headers: { "X-Api-Key": "literal-secret-value" } } },
        }),
      ).success,
    ).toBe(false);
  });
});
