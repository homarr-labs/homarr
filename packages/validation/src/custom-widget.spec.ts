import { describe, expect, test } from "vitest";

import { customJsxExamples } from "@homarr/definitions";

import { customJsxDisplayConfigV2Schema, customJsxRequestSchema, displayConfigSchema } from "./custom-widget";
import { validateCustomJsxTemplate } from "./custom-jsx-template";

describe("custom JSX v2 validation", () => {
  test.each(customJsxExamples)("validates the $id shared example", (example) => {
    expect(() =>
      customJsxDisplayConfigV2Schema.parse({
        type: "customJsx",
        jsxApiVersion: 2,
        template: example.template,
        networkScope: "public",
        requests: [...example.requests],
      }),
    ).not.toThrow();
  });

  test("retains display-only v1 compatibility", () => {
    expect(displayConfigSchema.parse({ type: "customJsx", template: "<Text>{data.value}</Text>" })).toEqual({
      type: "customJsx",
      template: "<Text>{data.value}</Text>",
    });
  });

  test("accepts benign text containing interpreter-reserved words", () => {
    expect(() =>
      customJsxDisplayConfigV2Schema.parse({
        type: "customJsx",
        jsxApiVersion: 2,
        template: "<Text>constructor fetch prototype</Text>",
        networkScope: "public",
        requests: [],
      }),
    ).not.toThrow();
  });

  test("accepts supported Tabs, ScrollArea, and SubData image props without warnings", () => {
    const diagnostics = validateCustomJsxTemplate(
      '<Tabs.List grow><ScrollArea offsetScrollbars><SubData as="Image" fit="contain" alt="Artwork" /></ScrollArea></Tabs.List>',
    );
    expect(diagnostics).toEqual([]);
  });

  test("rejects malformed JSX and direct global fetch while allowing declarative onParams", () => {
    const config = {
      type: "customJsx" as const,
      jsxApiVersion: 2 as const,
      networkScope: "public" as const,
      requests: [],
    };
    expect(customJsxDisplayConfigV2Schema.safeParse({ ...config, template: "<Text>" }).success).toBe(false);
    expect(
      customJsxDisplayConfigV2Schema.safeParse({ ...config, template: '<Text>{fetch("/private")}</Text>' }).success,
    ).toBe(false);
    expect(
      customJsxDisplayConfigV2Schema.safeParse({
        ...config,
        template: '<ToggleSwitch requestId="toggle" onParams={{ enabled: true }} offParams={{ enabled: false }} />',
        requests: [
          {
            id: "toggle",
            kind: "action",
            method: "POST",
            pathTemplate: "/toggle",
            parameters: { enabled: "boolean" },
            bodyTemplate: { enabled: { $param: "enabled" } },
            auth: "none",
            minimumBoardPermission: "modify",
          },
        ],
      }).success,
    ).toBe(true);
  });

  test("rejects reserved manifest headers and mismatched request component kinds", () => {
    expect(
      customJsxRequestSchema.safeParse({
        id: "status",
        kind: "query",
        method: "GET",
        pathTemplate: "/status",
        parameters: {},
        staticHeaders: { Authorization: "secret" },
        auth: "none",
        minimumBoardPermission: "view",
      }).success,
    ).toBe(false);

    expect(
      customJsxDisplayConfigV2Schema.safeParse({
        type: "customJsx",
        jsxApiVersion: 2,
        networkScope: "public",
        template: '<ActionButton requestId="status" label="Run" />',
        requests: [
          {
            id: "status",
            kind: "query",
            method: "GET",
            pathTemplate: "/status",
            parameters: {},
            auth: "none",
            minimumBoardPermission: "view",
          },
        ],
      }).success,
    ).toBe(false);
  });

  test("accepts 50,000 characters and rejects 50,001", () => {
    const config = {
      type: "customJsx" as const,
      jsxApiVersion: 2 as const,
      networkScope: "public" as const,
      requests: [],
    };
    expect(customJsxDisplayConfigV2Schema.safeParse({ ...config, template: "x".repeat(50_000) }).success).toBe(true);
    expect(customJsxDisplayConfigV2Schema.safeParse({ ...config, template: "x".repeat(50_001) }).success).toBe(false);
  });

  test("rejects duplicate request IDs", () => {
    const request = {
      id: "status",
      kind: "query" as const,
      method: "GET" as const,
      pathTemplate: "/status",
      parameters: {},
      auth: "none" as const,
      minimumBoardPermission: "view" as const,
    };
    const result = customJsxDisplayConfigV2Schema.safeParse({
      type: "customJsx",
      jsxApiVersion: 2,
      template: "<Text />",
      networkScope: "public",
      requests: [request, request],
    });
    expect(result.success).toBe(false);
  });

  test("rejects mutation-shaped queries and weak DELETE permissions", () => {
    expect(
      customJsxRequestSchema.safeParse({
        id: "mutating-query",
        kind: "query",
        method: "POST",
        pathTemplate: "/status",
        parameters: {},
        auth: "none",
        minimumBoardPermission: "view",
      }).success,
    ).toBe(false);
    expect(
      customJsxRequestSchema.safeParse({
        id: "delete",
        kind: "action",
        method: "DELETE",
        pathTemplate: "/resource",
        parameters: {},
        auth: "inherit",
        minimumBoardPermission: "modify",
      }).success,
    ).toBe(false);
  });
});
