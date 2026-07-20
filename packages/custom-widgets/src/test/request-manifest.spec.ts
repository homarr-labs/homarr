import { describe, expect, it } from "vitest";

import { resolveCustomWidgetOptionsBinding } from "../core";
import type { CustomJsxRequest } from "../core";
import { hashRuntimeParams, renderRequestBody, renderRequestTarget, validateRuntimeParams } from "../server";

const request: CustomJsxRequest = {
  id: "device",
  sourceId: "default",
  kind: "action",
  method: "PATCH",
  pathTemplate: "/devices/{device}/state",
  parameters: { device: "string", enabled: "boolean", level: "number" },
  bodyTemplate: { enabled: { $param: "enabled" }, nested: { level: { $param: "level" } } },
  auth: "inherit",
  minimumBoardPermission: "modify",
  trigger: "manual",
  queryTemplate: { verbose: true, level: { $param: "level" } },
};

describe("named request manifest rendering", () => {
  it("validates exact parameter names and declared primitive types", () => {
    expect(() => validateRuntimeParams(request, { device: "lamp", enabled: true, level: 5 })).not.toThrow();
    expect(() => validateRuntimeParams(request, { device: "lamp", enabled: true })).toThrow("match the manifest");
    expect(() => validateRuntimeParams(request, { device: "lamp", enabled: true, level: "5" })).toThrow(
      "must be number",
    );
  });

  it("encodes path placeholders and preserves JSON parameter types", () => {
    const params = { device: "living room/1", enabled: true, level: 5 };
    expect(renderRequestTarget("https://example.com/api", request, params).pathname).toBe(
      "/devices/living%20room%2F1/state",
    );
    expect(renderRequestTarget("https://example.com/api", request, params).searchParams.get("level")).toBe("5");
    expect(JSON.parse(renderRequestBody(request.bodyTemplate, params) ?? "null")).toEqual({
      enabled: true,
      nested: { level: 5 },
    });

    const camelCaseRequest: CustomJsxRequest = {
      ...request,
      pathTemplate: "/endpoints/{endpointId}",
      parameters: { endpointId: "string" },
      queryTemplate: undefined,
      bodyTemplate: undefined,
    };
    expect(renderRequestTarget("https://example.com", camelCaseRequest, { endpointId: "local/1" }).pathname).toBe(
      "/endpoints/local%2F1",
    );
  });

  it("rejects unresolved or malformed placeholders", () => {
    expect(() =>
      renderRequestTarget(
        "https://example.com",
        { ...request, pathTemplate: "/{missing}" },
        { device: "lamp", enabled: true, level: 5 },
      ),
    ).toThrow("Unknown path parameter");
    expect(() =>
      renderRequestTarget(
        "https://example.com",
        { ...request, pathTemplate: "/{1invalid}" },
        { device: "lamp", enabled: true, level: 5 },
      ),
    ).toThrow("invalid placeholder");
  });

  it("hashes parameters independently of object insertion order", () => {
    expect(hashRuntimeParams({ a: 1, b: "two" })).toBe(hashRuntimeParams({ b: "two", a: 1 }));
  });

  it("resolves only explicit option and literal bindings for automatic requests", () => {
    const loadRequest: CustomJsxRequest = {
      ...request,
      kind: "query",
      trigger: "load",
      optionsBinding: {
        device: { $option: "selectedDevice" },
        enabled: true,
        level: { $option: "volume" },
      },
    };
    expect(resolveCustomWidgetOptionsBinding(loadRequest, { selectedDevice: "lamp", volume: 5 })).toEqual({
      device: "lamp",
      enabled: true,
      level: 5,
    });
    expect(() => resolveCustomWidgetOptionsBinding({ ...loadRequest, optionsBinding: undefined }, {})).toThrow(
      "has no explicit option binding",
    );
    expect(() => resolveCustomWidgetOptionsBinding(loadRequest, { device: "lamp", level: 5 })).toThrow(
      "option 'selectedDevice'",
    );
  });
});
