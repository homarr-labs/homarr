import { describe, expect, test } from "vitest";

import { BUNDLED_CUSTOM_WIDGETS } from "../core/bundled-widgets";
import { customJsxExamples, CUSTOM_WIDGET_STARTER } from "../core/examples";
import { getCustomWidgetSecretRequirements } from "../core/secret-requirements";
import { customJsxRequestSchema, customWidgetCreateSchema, customWidgetDefinitionSchema } from "../core/schema";
import { validateCustomWidgetOptions } from "../core/options";

describe("Custom JSX v2 validation", () => {
  test.each(customJsxExamples)("validates $id", (example) => {
    expect(() => customWidgetDefinitionSchema.parse(example.widget)).not.toThrow();
  });

  test.each(BUNDLED_CUSTOM_WIDGETS)("validates bundled definition $id", ({ widget }) => {
    const result = customWidgetDefinitionSchema.safeParse(widget);
    expect(result.success, result.error?.issues.map((issue) => issue.message).join("; ")).toBe(true);
  });

  test.each(["q", "http://["])("reports an incomplete URL inline without throwing: %s", (value) => {
    const source = { ...CUSTOM_WIDGET_STARTER.sources[0], baseUrl: value };

    expect(() => customWidgetDefinitionSchema.safeParse({ ...CUSTOM_WIDGET_STARTER, sources: [source] })).not.toThrow();
    expect(customWidgetDefinitionSchema.safeParse({ ...CUSTOM_WIDGET_STARTER, sources: [source] }).success).toBe(false);
    expect(() => customWidgetDefinitionSchema.safeParse({ ...CUSTOM_WIDGET_STARTER, iconUrl: value })).not.toThrow();
    expect(customWidgetDefinitionSchema.safeParse({ ...CUSTOM_WIDGET_STARTER, iconUrl: value }).success).toBe(false);
  });

  test("keeps the bundled seed set stable, disabled-ready, and credential-free", () => {
    expect(BUNDLED_CUSTOM_WIDGETS.map(({ id }) => id)).toEqual([
      "seed-dog-facts",
      "seed-currency-exchange",
      "seed-jellyfin",
      "seed-pokedex",
    ]);
    for (const { widget } of BUNDLED_CUSTOM_WIDGETS) {
      expect(JSON.stringify(widget)).not.toMatch(/"(?:apiKey|password|secret|token)"\s*:/iu);
    }
  });

  test("derives every credential required by widget sources", () => {
    expect(
      getCustomWidgetSecretRequirements([
        {
          id: "default",
          name: "Example API",
          baseUrl: "https://api.example.com",
          networkScope: "public",
          auth: { type: "bearer" },
        },
        {
          id: "portainer",
          name: "Portainer",
          baseUrl: "https://portainer.example.com",
          networkScope: "public",
          auth: { type: "apiKeyHeader", headerName: "X-API-Key" },
        },
        {
          id: "basic",
          name: "Basic API",
          baseUrl: "https://basic.example.com",
          networkScope: "public",
          auth: { type: "basic" },
        },
      ]),
    ).toEqual([
      expect.objectContaining({ sourceId: "default", kind: "apiKey", authType: "bearer" }),
      expect.objectContaining({ sourceId: "portainer", kind: "apiKey", destination: "X-API-Key" }),
      expect.objectContaining({ sourceId: "basic", kind: "username" }),
      expect.objectContaining({ sourceId: "basic", kind: "password" }),
    ]);
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

  test("requires explicit parameter sources for load queries", () => {
    const optionsSchema = {
      type: "object" as const,
      properties: {
        endpointId: { type: "string" },
        wrongType: { type: "boolean" },
      },
      required: ["endpointId"],
      additionalProperties: false as const,
    };
    const request = {
      id: "containers",
      sourceId: "default",
      kind: "query" as const,
      method: "GET" as const,
      pathTemplate: "/endpoints/{endpointId}/containers",
      parameters: { endpointId: "string" as const, showAll: "boolean" as const },
      queryTemplate: { all: { $param: "showAll" } },
      auth: "none" as const,
      minimumBoardPermission: "view" as const,
      trigger: "load" as const,
    };

    const missing = customWidgetDefinitionSchema.safeParse({
      ...CUSTOM_WIDGET_STARTER,
      requests: [request],
      optionsSchema,
      defaultOptions: { endpointId: "local" },
    });
    expect(missing.success).toBe(false);
    if (missing.success) throw new Error("Expected missing bindings to fail");
    expect(missing.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["requests", 0, "optionsBinding", "endpointId"],
          message: expect.stringContaining("explicit option reference or literal"),
        }),
        expect.objectContaining({ path: ["requests", 0, "optionsBinding", "showAll"] }),
      ]),
    );

    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        requests: [
          {
            ...request,
            optionsBinding: { endpointId: { $option: "endpointId" }, showAll: false },
          },
        ],
        optionsSchema,
        defaultOptions: { endpointId: "local" },
      }).success,
    ).toBe(true);
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        requests: [
          {
            ...request,
            optionsBinding: { endpointId: { $option: "wrongType" }, showAll: false },
          },
        ],
        optionsSchema,
        defaultOptions: { endpointId: "local" },
      }).success,
    ).toBe(false);
  });

  test("requires invoking components to provide params for parameterized manual requests", () => {
    const request = {
      id: "detail",
      sourceId: "default",
      kind: "query" as const,
      method: "GET" as const,
      pathTemplate: "/items/{id}",
      parameters: { id: "string" as const },
      auth: "none" as const,
      minimumBoardPermission: "view" as const,
      trigger: "manual" as const,
    };
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        requests: [request],
        template: '<SubFetch requestId="detail" />',
      }).success,
    ).toBe(false);
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        requests: [request],
        template: '<SubFetch requestId="detail" params={{ id: inputs.selectedId }} />',
      }).success,
    ).toBe(true);
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        requests: [
          {
            ...request,
            trigger: "load",
            optionsBinding: { id: "fixed" },
          },
        ],
        template: '<SubFetch requestId="detail" params={{ id: inputs.selectedId }} />',
      }).success,
    ).toBe(false);
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

  test("accepts multi-source actions, dynamic options, conditions, and temporary inputs", () => {
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
          optionsBinding: { start: { $option: "start" } },
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
    expect(customWidgetDefinitionSchema.safeParse({ ...CUSTOM_WIDGET_STARTER, stateSchema: {} }).success).toBe(false);
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

  test("requires literal temporary input bindings", () => {
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        template: '<Calendar bind="selectedDate" />',
      }).success,
    ).toBe(true);
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        template: "<Calendar bind={inputs.selectedDate} />",
      }).success,
    ).toBe(false);
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        template: "<Text>{state.search}</Text>",
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
