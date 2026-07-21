import { describe, expect, it } from "vitest";

import {
  CUSTOM_WIDGET_STARTER,
  customWidgetDefinitionSchema,
  customJsxRequestSchema,
  getCustomWidgetDefaultOptions,
  getCustomWidgetSecretRequirements,
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
    expect(customJsxRequestSchema.parse({ method: "DELETE", path: "/item" })).toMatchObject({
      permission: "full",
      confirmation: { destructive: true },
    });
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
