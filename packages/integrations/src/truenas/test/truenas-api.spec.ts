import { describe, expect, test } from "vitest";

import { trueNasApis } from "../truenas-api";

describe("trueNasApis descriptors", () => {
  test("expose the expected endpoints and handshake requirements", () => {
    expect(trueNasApis.jsonRpc).toMatchObject({
      kind: "jsonRpc",
      path: "/api/current",
      requiresSessionHandshake: false,
    });
    expect(trueNasApis.legacy).toMatchObject({
      kind: "legacy",
      path: "/websocket",
      requiresSessionHandshake: true,
    });
  });
});

describe("jsonRpc api", () => {
  const { buildRequest, matchResponse } = trueNasApis.jsonRpc;

  test("builds a JSON-RPC 2.0 envelope", () => {
    expect(buildRequest("id-1", "system.info", [])).toStrictEqual({
      jsonrpc: "2.0",
      id: "id-1",
      method: "system.info",
      params: [],
    });
  });

  test("matches a result for the requested id", () => {
    const result = matchResponse({ jsonrpc: "2.0", id: "id-1", result: true }, "id-1");
    expect(result).toStrictEqual({ result: true });
  });

  test("returns the error when the response carries one", () => {
    const error = { code: -32001, message: "Not authenticated" };
    expect(matchResponse({ jsonrpc: "2.0", id: "id-1", error }, "id-1")).toStrictEqual({ error });
  });

  test("ignores responses for a different id", () => {
    expect(matchResponse({ jsonrpc: "2.0", id: "other", result: true }, "id-1")).toBeUndefined();
  });

  test("ignores non JSON-RPC messages", () => {
    expect(matchResponse({ msg: "result", id: "id-1", result: true }, "id-1")).toBeUndefined();
  });
});

describe("legacy api", () => {
  const { buildRequest, matchResponse } = trueNasApis.legacy;

  test("builds a DDP method envelope", () => {
    expect(buildRequest("id-1", "auth.login", ["user", "pass"])).toStrictEqual({
      id: "id-1",
      msg: "method",
      method: "auth.login",
      params: ["user", "pass"],
    });
  });

  test("matches a result message for the requested id", () => {
    expect(matchResponse({ msg: "result", id: "id-1", result: false }, "id-1")).toStrictEqual({ result: false });
  });

  test("returns the error when the result message carries one", () => {
    const error = { error: 13, reason: "boom" };
    expect(matchResponse({ msg: "result", id: "id-1", error }, "id-1")).toStrictEqual({ error });
  });

  test("ignores responses for a different id", () => {
    expect(matchResponse({ msg: "result", id: "other", result: true }, "id-1")).toBeUndefined();
  });

  test("ignores non-result messages such as the session handshake", () => {
    expect(matchResponse({ msg: "connected", session: "abc" }, "id-1")).toBeUndefined();
  });
});
