import { describe, expect, it } from "vitest";

import {
  CUSTOM_WIDGET_STARTER,
  customWidgetDefinitionSchema,
  customJsxRequestSchema,
  getCustomWidgetDefaultOptions,
  getCustomWidgetSecretRequirements,
  getCustomWidgetSourceSetups,
  hasSameCustomWidgetSourceAuthentication,
  applyCustomWidgetSourceSetup,
} from "../core";

describe("lean Custom Widget schema", () => {
  it("applies request defaults", () => {
    expect(customJsxRequestSchema.parse({ path: "/status" })).toMatchObject({
      source: "default",
      kind: "query",
      method: "GET",
      trigger: "load",
      auth: "inherit",
      permission: "view",
    });
    expect(customJsxRequestSchema.parse({ kind: "action", path: "/restart" })).toMatchObject({
      trigger: "manual",
      permission: "modify",
    });
    expect(customJsxRequestSchema.parse({ kind: "action", method: "DELETE", path: "/item" })).toMatchObject({
      trigger: "manual",
      permission: "full",
      confirmation: { destructive: true },
    });
  });

  it("rejects DELETE requests that could execute as automatic queries", () => {
    expect(customJsxRequestSchema.safeParse({ method: "DELETE", path: "/item" }).success).toBe(false);
    expect(
      customJsxRequestSchema.safeParse({ kind: "query", trigger: "manual", method: "DELETE", path: "/item" }).success,
    ).toBe(false);
  });

  it("validates keyed sources, requests and options", () => {
    const result = customWidgetDefinitionSchema.parse({
      ...CUSTOM_WIDGET_STARTER,
      requests: {
        list: { path: "/items/{option:category}", query: { limit: { $option: "limit" } } },
        search: { trigger: "manual", path: "/search", query: { q: { $param: "query" } } },
        restart: { kind: "action", method: "POST", path: "/items/{param:id}/restart", invalidates: ["list"] },
      },
      options: {
        category: { label: "Category", control: "text", default: "all" },
        limit: { label: "Limit", control: "number", default: 20, min: 1, max: 100 },
      },
    });
    expect(Object.keys(result.requests)).toEqual(["list", "search", "restart"]);
    expect(getCustomWidgetDefaultOptions(result.options)).toEqual({ category: "all", limit: 20 });
  });

  it("defaults omitted options to an empty map", () => {
    const { options: _options, ...withoutOptions } = CUSTOM_WIDGET_STARTER;
    expect(customWidgetDefinitionSchema.parse(withoutOptions).options).toEqual({});
  });

  it("rejects source IDs that collide case-insensitively", () => {
    const result = customWidgetDefinitionSchema.safeParse({
      ...CUSTOM_WIDGET_STARTER,
      sources: {
        Api: { baseUrl: "https://one.example.com", networkScope: "public", auth: "none" },
        api: { baseUrl: "https://two.example.com", networkScope: "public", auth: "none" },
      },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["sources", "api"],
            message: expect.stringContaining("conflicts case-insensitively"),
          }),
        ]),
      );
    }
  });

  it("rejects invocation params on load and unknown options", () => {
    const loadParam = customWidgetDefinitionSchema.safeParse({
      ...CUSTOM_WIDGET_STARTER,
      requests: { bad: { path: "/{param:id}" } },
    });
    expect(loadParam.success).toBe(false);
    const unknownOption = customWidgetDefinitionSchema.safeParse({
      ...CUSTOM_WIDGET_STARTER,
      requests: { bad: { path: "/{option:missing}" } },
    });
    expect(unknownOption.success).toBe(false);
  });

  it("rejects malformed placeholders and removed public fields", () => {
    expect(customJsxRequestSchema.safeParse({ path: "/items/{id}" }).success).toBe(false);
    expect(customWidgetDefinitionSchema.safeParse({ ...CUSTOM_WIDGET_STARTER, optionsSchema: {} }).success).toBe(false);
    expect(customWidgetDefinitionSchema.safeParse({ ...CUSTOM_WIDGET_STARTER, stateSchema: {} }).success).toBe(false);
  });

  it.each([
    "http://127.1",
    "http://2130706433",
    "http://0x7f000001",
    "http://0177.0.0.1",
    "http://1.2.3",
    "http://%31%32%37.0.0.1",
    "https://%65xample.com",
    "https://example%2ecom",
    "https://example.com\\@attacker.invalid",
    "https:\\\\example.com\\api",
    " https://example.com",
    "https://exa\tmple.com",
    "https://example.com\n",
    "https://example.com\u00a0",
    "https://@example.com",
    "https://:@example.com",
    "https://example。com",
    "https://１２７.０.０.１",
    "https://-example.com",
    "https://example-.com",
    "https://example..com",
    "https://example.com:00080",
    "https://example.com:0000000065535",
    "https://example.com:65536",
    "https://[fe80::1%25eth0]",
    "https://[::ffff:192.168.001.001]",
  ])("rejects ambiguous persisted URL spelling %s for sources and icons", (url) => {
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        sources: {
          default: { ...CUSTOM_WIDGET_STARTER.sources.default, baseUrl: url },
        },
      }).success,
    ).toBe(false);
    expect(customWidgetDefinitionSchema.safeParse({ ...CUSTOM_WIDGET_STARTER, iconUrl: url }).success).toBe(false);
  });

  it.each([
    "https://example.com",
    "https://example.com.",
    "https://münich.example",
    "https://xn--mnich-kva.example",
    "http://192.168.1.1:0",
    "https://[2001:db8::1]:65535",
    "https://[::ffff:192.168.1.1]",
  ])("accepts unambiguous HTTP URLs %s for sources and icons", (url) => {
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        sources: {
          default: { ...CUSTOM_WIDGET_STARTER.sources.default, baseUrl: url },
        },
      }).success,
    ).toBe(true);
    expect(customWidgetDefinitionSchema.safeParse({ ...CUSTOM_WIDGET_STARTER, iconUrl: url }).success).toBe(true);
  });

  it("allows ordinary encoded icon paths and query values while rejecting oversized URLs", () => {
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        iconUrl: "https://example.com/icons/custom%20widget.svg?theme=dark#preview",
      }).success,
    ).toBe(true);
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        iconUrl: `https://example.com/${"a".repeat(2048)}`,
      }).success,
    ).toBe(false);
  });

  it("keeps auth secrets outside the document", () => {
    const definition = customWidgetDefinitionSchema.parse({
      ...CUSTOM_WIDGET_STARTER,
      sources: {
        default: { baseUrl: "https://example.com", networkScope: "public", auth: "bearer" },
        admin: { baseUrl: "https://example.net", networkScope: "private", auth: "basic" },
      },
    });
    expect(
      getCustomWidgetSecretRequirements(definition.sources).map(({ sourceId, kind }) => `${sourceId}:${kind}`),
    ).toEqual(["default:apiKey", "admin:username", "admin:password"]);
  });

  it("rejects credentials embedded in request paths, headers, and JSX", () => {
    const requests = [
      {
        status: {
          path: "/api/status?credential=Bearer-sk-secret-123456",
        },
      },
      {
        status: {
          path: "/api/status",
          headers: { "X-Auth": "Bearer sk-secret-123456" },
        },
      },
      {
        status: {
          path: "/api/status",
          headers: { "X-Service": "Basic dXNlcjpwYXNz" },
        },
      },
      {
        status: {
          path: "/api/status",
          headers: { "X-Service": "ghp_abcdefghijklmnopqrstuvwxyz123456" },
        },
      },
    ];
    for (const candidate of requests) {
      expect(customWidgetDefinitionSchema.safeParse({ ...CUSTOM_WIDGET_STARTER, requests: candidate }).success).toBe(
        false,
      );
    }
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        template: "<Text>Bearer sk-secret-123456</Text>",
      }).success,
    ).toBe(false);
  });

  it("allows harmless key fields, auth modes, headers, and authentication guidance", () => {
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        sources: {
          default: {
            ...CUSTOM_WIDGET_STARTER.sources.default,
            auth: { type: "apiKeyHeader", name: "X-Api-Key" },
          },
        },
        requests: {
          status: {
            path: "/api/status?key=status&auth=none",
            headers: {
              Accept: "application/json",
              "X-Api-Version": "2026-07",
              "X-Feature-Key": "dashboard-layout",
            },
            body: { authenticationMode: "none", key: "status", tokenCount: 3 },
          },
        },
        template: "<Stack><Text>Bearer authentication uses source credentials</Text></Stack>",
      }).success,
    ).toBe(true);
  });

  it("requires installation confirmation for private and placeholder source URLs", () => {
    const sources = {
      default: { baseUrl: "https://pokeapi.co/api/v2", networkScope: "public" as const, auth: "none" as const },
      tautulli: {
        name: "Tautulli",
        baseUrl: "http://tautulli.local:8181",
        networkScope: "private" as const,
        auth: { type: "apiKeyQuery" as const, name: "apikey" },
      },
      placeholder: {
        baseUrl: "https://api.example.com",
        networkScope: "public" as const,
        auth: "none" as const,
      },
    };
    const setups = getCustomWidgetSourceSetups(sources);
    expect(setups.map(({ sourceId, requiresUrlConfirmation }) => [sourceId, requiresUrlConfirmation])).toEqual([
      ["default", false],
      ["tautulli", true],
      ["placeholder", true],
    ]);
    expect(setups.find(({ sourceId }) => sourceId === "tautulli")?.credentialFields).toEqual([
      { kind: "apiKey", destination: "apikey", configured: false },
    ]);
  });

  it("applies source setup without changing source authentication", () => {
    const sources = {
      default: {
        baseUrl: "http://tautulli.local:8181",
        networkScope: "private" as const,
        auth: { type: "apiKeyQuery" as const, name: "apikey" },
      },
    };
    expect(
      applyCustomWidgetSourceSetup(sources, {
        default: { baseUrl: "http://192.168.1.20:8181", networkScope: "private" },
      }).default,
    ).toEqual({
      baseUrl: "http://192.168.1.20:8181",
      networkScope: "private",
      auth: { type: "apiKeyQuery", name: "apikey" },
    });
  });

  it("detects stale source authentication snapshots", () => {
    const bearer = { baseUrl: "https://example.com", networkScope: "public" as const, auth: "bearer" as const };
    expect(hasSameCustomWidgetSourceAuthentication(bearer, { ...bearer, baseUrl: "https://api.example.com" })).toBe(
      true,
    );
    expect(hasSameCustomWidgetSourceAuthentication(bearer, { ...bearer, auth: "none" })).toBe(false);
    expect(
      hasSameCustomWidgetSourceAuthentication(
        { ...bearer, auth: { type: "apiKeyHeader", name: "X-API-Key" } },
        { ...bearer, auth: { type: "apiKeyHeader", name: "Authorization" } },
      ),
    ).toBe(false);
  });

  it("supports official Mantine compound names and separates bigint diagnostics", () => {
    expect(
      customWidgetDefinitionSchema.safeParse({
        ...CUSTOM_WIDGET_STARTER,
        template: "<Radio.Group><Radio.Card><Radio.Indicator /></Radio.Card></Radio.Group>",
      }).success,
    ).toBe(true);
    const result = customWidgetDefinitionSchema.safeParse({ ...CUSTOM_WIDGET_STARTER, template: "<Text>{1n}</Text>" });
    expect(result.success ? "" : result.error.issues[0]?.message).toContain("BIGINT_NOT_SUPPORTED");
  });
});
