import { describe, expect, test } from "vitest";

import { CUSTOM_WIDGET_STARTER } from "@homarr/custom-widgets/core";

import {
  normalizeHttpUrl,
  resolveHomarrUrlConfig,
  validateWorkshopWidget,
  workshopSubmissionInputSchema,
  workshopSubmissionSummarySchema,
} from "./schema";

describe("Workshop URL configuration", () => {
  test("normalizes the URL contract and derives Workshop defaults", () => {
    expect(
      resolveHomarrUrlConfig({
        homarrWebsiteUrl: "https://docs.example.com/",
        workshopApiUrl: "https://api.example.com///",
      }),
    ).toEqual({
      homarrWebsiteUrl: "https://docs.example.com",
      workshopApiUrl: "https://api.example.com",
      workshopWebUrl: "https://docs.example.com/workshop",
    });
  });

  test("rejects unsafe or ambiguous public URLs", () => {
    expect(() => normalizeHttpUrl("file:///tmp/workshop", "WORKSHOP_API_URL")).toThrow("HTTP or HTTPS");
    expect(() => normalizeHttpUrl("https://user:secret@example.com", "WORKSHOP_API_URL")).toThrow("credentials");
    expect(() => normalizeHttpUrl("https://example.com/?token=secret", "WORKSHOP_API_URL")).toThrow("query string");
    expect(() => normalizeHttpUrl("\nhttps://example.com", "WORKSHOP_API_URL")).toThrow("control characters");
  });
});

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

  test("validates direct bindings in the official client before publication", () => {
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

  test("normalizes PocketBase records before rendering", () => {
    const result = workshopSubmissionSummarySchema.parse({
      id: "jzyxskmimxn42io",
      title: "Tautulli Activity",
      description: "Shows active Plex streams from Tautulli",
      widgetSchema: "homarr-custom-widget-v2",
      screenshots: "[]",
      author: "wsqylmotymtqpox",
      revision: 1,
      created: "2026-07-21 14:19:25.790Z",
      updated: "2026-07-21 14:19:25.790Z",
    });

    expect(result.type).toBe("customWidget");
    expect(result.screenshots).toEqual([]);
    expect(result.authorName).toBe("Community member");
    expect(result.upvotes).toBe(0);
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
