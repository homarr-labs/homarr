import { describe, expect, it } from "vitest";

import { serializeMcpToolResult } from "./_serialize-result";

describe("serializeMcpToolResult", () => {
  it("serializes objects as JSON strings", () => {
    expect(serializeMcpToolResult({ boardId: "1" })).toBe('{"boardId":"1"}');
  });

  it("serializes primitive values", () => {
    expect(serializeMcpToolResult("hello")).toBe('"hello"');
    expect(serializeMcpToolResult(42)).toBe("42");
    expect(serializeMcpToolResult(true)).toBe("true");
  });

  it("serializes null as the string null", () => {
    expect(serializeMcpToolResult(null)).toBe("null");
  });

  it("serializes void results as the string null so MCP content text is always a string", () => {
    expect(serializeMcpToolResult(undefined)).toBe("null");
  });
});
