import { describe, expect, it } from "vitest";

import { customJsxRequestSchema } from "../core";
import { renderRequestBody, renderRequestTarget, resolveCustomWidgetRequestValues } from "../server";

const request = customJsxRequestSchema.parse({
  kind: "action",
  method: "POST",
  path: "/devices/{option:room}/{param:id}",
  query: { verbose: true, level: { $param: "level" } },
  body: { enabled: { $param: "enabled" }, room: { $option: "room" } },
});

describe("lean request bindings", () => {
  it("infers and resolves option and invocation references", () => {
    const values = resolveCustomWidgetRequestValues(
      request,
      { room: "office" },
      { id: "lamp/1", level: 5, enabled: true },
    );
    expect(renderRequestTarget("https://example.com/api/", request, values).toString()).toBe(
      "https://example.com/api/devices/office/lamp%2F1?verbose=true&level=5",
    );
    expect(JSON.parse(renderRequestBody(request, values) ?? "null")).toEqual({ enabled: true, room: "office" });
  });

  it("rejects missing and extra invocation params", () => {
    expect(() => resolveCustomWidgetRequestValues(request, { room: "office" }, { id: "lamp", level: 5 })).toThrow(
      "do not match",
    );
    expect(() =>
      resolveCustomWidgetRequestValues(
        request,
        { room: "office" },
        { id: "lamp", level: 5, enabled: true, extra: true },
      ),
    ).toThrow("do not match");
  });

  it("rejects missing options and non-primitive URL values", () => {
    expect(() => resolveCustomWidgetRequestValues(request, {}, { id: "lamp", level: 5, enabled: true })).toThrow(
      "room",
    );
    const values = resolveCustomWidgetRequestValues(request, { room: [] }, { id: "lamp", level: 5, enabled: true });
    expect(() => renderRequestTarget("https://example.com", request, values)).toThrow("Path value");
  });

  it("supports structured options in JSON bodies", () => {
    const bodyRequest = customJsxRequestSchema.parse({
      kind: "action",
      method: "POST",
      path: "/rules",
      body: { entities: { $option: "entities" }, rule: { $option: "rule" } },
    });
    const values = resolveCustomWidgetRequestValues(bodyRequest, {
      entities: ["light.office", "light.desk"],
      rule: { transition: 2 },
    });
    expect(JSON.parse(renderRequestBody(bodyRequest, values) ?? "null")).toEqual({
      entities: ["light.office", "light.desk"],
      rule: { transition: 2 },
    });
  });

  it("keeps a source base path", () => {
    const pokemon = customJsxRequestSchema.parse({ path: "/pokemon" });
    expect(renderRequestTarget("https://pokeapi.co/api/v2", pokemon, {}).toString()).toBe(
      "https://pokeapi.co/api/v2/pokemon",
    );
  });

  it.each(["start", "stop", "restart"])("renders a Portainer %s action without duplicating declarations", (action) => {
    const portainer = customJsxRequestSchema.parse({
      kind: "action",
      method: "POST",
      path: `/api/endpoints/{option:endpointId}/docker/containers/{param:id}/${action}`,
      invalidates: ["containers"],
    });
    const values = resolveCustomWidgetRequestValues(portainer, { endpointId: 2 }, { id: "abc/123" });
    expect(renderRequestTarget("https://portainer.example", portainer, values).pathname).toBe(
      `/api/endpoints/2/docker/containers/abc%2F123/${action}`,
    );
  });
});
