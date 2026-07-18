import { describe, expect, test } from "vitest";

import { customJsxExamples, CUSTOM_WIDGET_STARTER } from "../core/examples";
import { customJsxRequestSchema, customWidgetCreateSchema, customWidgetDefinitionSchema } from "../core/schema";
import { validateCustomWidgetOptions } from "../core/options";

describe("Custom JSX v2 validation", () => {
  test.each(customJsxExamples)("validates $id", (example) => {
    expect(() => customWidgetDefinitionSchema.parse(example.widget)).not.toThrow();
  });

  test("rejects every legacy schema", () => {
    expect(
      customWidgetDefinitionSchema.safeParse({ ...CUSTOM_WIDGET_STARTER, $schema: "homarr-custom-widget-v3" }).success,
    ).toBe(false);
    expect(customWidgetDefinitionSchema.safeParse({ displayType: "raw", displayConfig: { type: "raw" } }).success).toBe(
      false,
    );
  });

  test("allows query POST and action GET while keeping actions manual", () => {
    const base = {
      sourceId: "default",
      pathTemplate: "/status",
      parameters: {},
      auth: "none" as const,
      trigger: "manual" as const,
    };
    expect(
      customJsxRequestSchema.safeParse({
        ...base,
        id: "query",
        kind: "query",
        method: "POST",
        minimumBoardPermission: "view",
      }).success,
    ).toBe(true);
    expect(
      customJsxRequestSchema.safeParse({
        ...base,
        id: "action",
        kind: "action",
        method: "GET",
        minimumBoardPermission: "modify",
      }).success,
    ).toBe(true);
    expect(
      customJsxRequestSchema.safeParse({
        ...base,
        id: "action",
        kind: "action",
        method: "POST",
        trigger: "load",
        minimumBoardPermission: "modify",
      }).success,
    ).toBe(false);
    expect(
      customJsxRequestSchema.safeParse({
        ...base,
        id: "delete-query",
        kind: "query",
        method: "DELETE",
        minimumBoardPermission: "full",
      }).success,
    ).toBe(true);
  });

  test("rejects reserved headers, duplicate IDs, and unknown sources", () => {
    const request = {
      id: "status",
      sourceId: "missing",
      kind: "query" as const,
      method: "GET" as const,
      pathTemplate: "/status",
      parameters: {},
      auth: "none" as const,
      minimumBoardPermission: "view" as const,
      trigger: "load" as const,
    };
    expect(customWidgetDefinitionSchema.safeParse({ ...CUSTOM_WIDGET_STARTER, requests: [request] }).success).toBe(
      false,
    );
    expect(
      customJsxRequestSchema.safeParse({ ...request, sourceId: "default", staticHeaders: { Authorization: "secret" } })
        .success,
    ).toBe(false);
    expect(
      customJsxRequestSchema.safeParse({
        ...request,
        sourceId: "default",
        confirmation: { title: "Ignored", message: "Ignored" },
      }).success,
    ).toBe(false);
    expect(customJsxRequestSchema.safeParse({ ...request, sourceId: "default", invalidates: ["status"] }).success).toBe(
      false,
    );
    expect(
      customWidgetCreateSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        secrets: [
          { sourceId: "default", kind: "apiKey", value: "one" },
          { sourceId: "default", kind: "apiKey", value: "two" },
        ],
      }).success,
    ).toBe(false);
  });

  test("accepts multi-source actions, dynamic options, conditions, and typed state", () => {
    const result = customWidgetDefinitionSchema.safeParse({
      ...CUSTOM_WIDGET_STARTER,
      sources: [
        {
          id: "sonarr",
          name: "Sonarr",
          baseUrl: "http://sonarr:8989",
          networkScope: "private",
          auth: { type: "apiKeyHeader", headerName: "X-Api-Key" },
        },
        {
          id: "radarr",
          name: "Radarr",
          baseUrl: "http://radarr:7878",
          networkScope: "private",
          auth: { type: "apiKeyHeader", headerName: "X-Api-Key" },
        },
      ],
      requests: [
        {
          id: "list-calendars",
          sourceId: "sonarr",
          kind: "query",
          method: "POST",
          pathTemplate: "/api/v3/calendar",
          parameters: { start: "string" },
          bodyTemplate: { start: { $param: "start" } },
          auth: "inherit",
          minimumBoardPermission: "view",
          trigger: "manual",
        },
        {
          id: "monitor-series",
          sourceId: "sonarr",
          kind: "action",
          method: "GET",
          pathTemplate: "/api/v3/series/{seriesId}",
          parameters: { seriesId: "number" },
          auth: "inherit",
          minimumBoardPermission: "modify",
          trigger: "manual",
          confirmation: { title: "Monitor series", message: "Monitor this series?" },
          invalidates: ["list-calendars"],
        },
      ],
      optionsSchema: {
        type: "object",
        properties: {
          start: { type: "string", title: "Start date", "x-homarr": { control: "date", order: 1 } },
          calendarId: {
            type: "integer",
            title: "Calendar",
            "x-homarr": {
              control: "select",
              optionsSource: {
                requestId: "list-calendars",
                itemsPath: "$.data.environments",
                valuePath: "$.Id",
                labelPath: "$.Name",
              },
            },
          },
          advancedColor: { type: "string", "x-homarr": { control: "color", advanced: true } },
        },
        required: ["start"],
        additionalProperties: false,
        if: { properties: { start: { const: "today" } } },
        // oxlint-disable-next-line unicorn/no-thenable -- JSON Schema uses the standard `then` keyword.
        then: { properties: { advancedColor: { type: "string" } } },
      },
      defaultOptions: { start: "today" },
      stateSchema: { selectedDate: "date", search: "string", opened: "boolean", selectedEntities: "string[]" },
      defaultState: { selectedDate: "2026-07-17", search: "", opened: false, selectedEntities: ["light.office"] },
      template:
        '<Stack><Calendar bind="selectedDate"/><ActionButton requestId="monitor-series" params={{ seriesId: 1 }}>Monitor</ActionButton></Stack>',
    });
    expect(result.success, result.error?.issues.map((issue) => issue.message).join("; ")).toBe(true);
  });

  test("rejects unsafe source URLs, auth overrides, invalid defaults, and missing dynamic requests", () => {
    const unsafeSource = { ...CUSTOM_WIDGET_STARTER.sources[0], baseUrl: "https://user:pass@example.com?token=nope" };
    expect(customWidgetDefinitionSchema.safeParse({ ...CUSTOM_WIDGET_STARTER, sources: [unsafeSource] }).success).toBe(
      false,
    );

    const source = {
      ...CUSTOM_WIDGET_STARTER.sources[0],
      auth: { type: "apiKeyHeader" as const, headerName: "X-Api-Key" },
    };
    const request = {
      id: "status",
      sourceId: "default",
      kind: "query" as const,
      method: "GET" as const,
      pathTemplate: "/status",
      parameters: {},
      auth: "inherit" as const,
      minimumBoardPermission: "view" as const,
      trigger: "load" as const,
      staticHeaders: { "x-api-key": "not-a-secret" },
    };
    expect(
      customWidgetDefinitionSchema.safeParse({ ...CUSTOM_WIDGET_STARTER, sources: [source], requests: [request] })
        .success,
    ).toBe(false);
    expect(
      customWidgetDefinitionSchema.safeParse({ ...CUSTOM_WIDGET_STARTER, defaultOptions: { apiKey: "not-exportable" } })
        .success,
    ).toBe(false);
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        optionsSchema: {
          type: "object",
          properties: { accessToken: { type: "string" } },
          additionalProperties: false,
        },
      }).success,
    ).toBe(false);
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        stateSchema: { accessToken: "string" },
        defaultState: {},
      }).success,
    ).toBe(false);
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        requests: [
          {
            ...request,
            sourceId: "default",
            auth: "none",
            staticHeaders: { "X-Custom": "Bearer not-exportable-token" },
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      customJsxRequestSchema.safeParse({
        ...request,
        sourceId: "default",
        auth: "none",
        staticHeaders: { "X-API-Key": "not-exportable" },
      }).success,
    ).toBe(false);
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        stateSchema: { count: "number" },
        defaultState: { count: "wrong" },
      }).success,
    ).toBe(false);
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        requests: [
          {
            id: "action",
            sourceId: "default",
            kind: "action",
            method: "POST",
            pathTemplate: "/action",
            parameters: {},
            auth: "none",
            minimumBoardPermission: "modify",
            trigger: "manual",
            invalidates: ["missing"],
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        optionsSchema: {
          type: "object",
          properties: {
            endpoint: {
              type: "string",
              "x-homarr": {
                control: "select",
                optionsSource: { requestId: "missing", valuePath: "$.id", labelPath: "$.name" },
              },
            },
          },
          additionalProperties: false,
        },
      }).success,
    ).toBe(false);
  });

  test("requires literal bindings to reference declared camel-case state", () => {
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        stateSchema: { selectedDate: "date" },
        defaultState: { selectedDate: "2026-07-17" },
        template: '<Calendar bind="selectedDate" />',
      }).success,
    ).toBe(true);
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        stateSchema: { selectedDate: "date" },
        template: '<Calendar bind="missingDate" />',
      }).success,
    ).toBe(false);
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        stateSchema: { selectedDate: "date" },
        template: "<Calendar bind={state.selectedDate} />",
      }).success,
    ).toBe(false);
  });

  test("validates values declared only by the active conditional branch", () => {
    const schema = {
      type: "object",
      properties: { mode: { type: "string", enum: ["simple", "advanced"] } },
      required: ["mode"],
      additionalProperties: false,
      if: { properties: { mode: { const: "advanced" } } },
      // oxlint-disable-next-line unicorn/no-thenable -- JSON Schema uses the standard `then` keyword.
      then: {
        properties: { color: { type: "string" } },
        required: ["color"],
      },
    };
    expect(validateCustomWidgetOptions(schema, { mode: "advanced", color: "blue" })).toEqual([]);
    expect(validateCustomWidgetOptions(schema, { mode: "advanced" })).toEqual([
      { path: "configuration.color", message: "This field is required" },
    ]);
    expect(validateCustomWidgetOptions(schema, { mode: "simple", color: "blue" })).toEqual([
      { path: "configuration.color", message: "Unknown option" },
    ]);
  });

  test("rejects unsafe custom authentication header names", () => {
    const result = customWidgetDefinitionSchema.safeParse({
      ...CUSTOM_WIDGET_STARTER,
      sources: [
        {
          ...CUSTOM_WIDGET_STARTER.sources[0],
          auth: { type: "apiKeyHeader", headerName: "X-Forwarded-Authorization" },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  test("rejects prototype-pollution keys in structured authored data", () => {
    const request = {
      id: "status",
      sourceId: "default",
      kind: "query" as const,
      method: "POST" as const,
      pathTemplate: "/status",
      parameters: {},
      bodyTemplate: JSON.parse('{"constructor":{"prototype":{"polluted":true}}}') as unknown,
      auth: "none" as const,
      minimumBoardPermission: "view" as const,
      trigger: "manual" as const,
    };
    expect(customWidgetDefinitionSchema.safeParse({ ...CUSTOM_WIDGET_STARTER, requests: [request] }).success).toBe(
      false,
    );
  });

  test("rejects option controls, enum values, and icon URLs that do not match their declared capability", () => {
    expect(
      customWidgetDefinitionSchema.safeParse({ ...CUSTOM_WIDGET_STARTER, iconUrl: "javascript:alert(1)" }).success,
    ).toBe(false);
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        iconUrl: "https://user:password@example.com/icon.png",
      }).success,
    ).toBe(false);
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        iconUrl: "https://example.com/icon.png?accessToken=literal-secret",
      }).success,
    ).toBe(false);
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        template: '<Text>apiKey="literal-secret"</Text>',
      }).success,
    ).toBe(false);
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        optionsSchema: {
          type: "object",
          properties: { enabled: { type: "boolean", "x-homarr": { control: "slider" } } },
          additionalProperties: false,
        },
        defaultOptions: { enabled: true },
      }).success,
    ).toBe(false);
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        optionsSchema: {
          type: "object",
          properties: { count: { type: "integer", enum: [1, "two"] } },
          additionalProperties: false,
        },
        defaultOptions: { count: 1 },
      }).success,
    ).toBe(false);
  });
});
