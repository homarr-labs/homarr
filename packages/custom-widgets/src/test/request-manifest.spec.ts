import { describe, expect, it } from "vitest";

import type { CustomJsxRequest } from "../core";
import { hashRuntimeParams, renderRequestBody, renderRequestTarget, validateRuntimeParams } from "../server";

const request: CustomJsxRequest = {
  id: "device",
  kind: "action",
  method: "PATCH",
  pathTemplate: "/devices/{device}/state",
  parameters: { device: "string", enabled: "boolean", level: "number" },
  bodyTemplate: { enabled: { $param: "enabled" }, nested: { level: { $param: "level" } } },
  auth: "inherit",
  minimumBoardPermission: "modify",
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
    expect(JSON.parse(renderRequestBody(request.bodyTemplate, params) ?? "null")).toEqual({
      enabled: true,
      nested: { level: 5 },
    });
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
        { ...request, pathTemplate: "/{INVALID}" },
        { device: "lamp", enabled: true, level: 5 },
      ),
    ).toThrow("invalid placeholder");
  });

  it("hashes parameters independently of object insertion order", () => {
    expect(hashRuntimeParams({ a: 1, b: "two" })).toBe(hashRuntimeParams({ b: "two", a: 1 }));
  });
});
