import { describe, expect, test } from "vitest";

import { getAssistantToolTraceTarget } from "./assistant-tool-trace";

describe("getAssistantToolTraceTarget", () => {
  test("uses a human-readable tool argument instead of an opaque id", () => {
    expect(getAssistantToolTraceTarget({ id: "app-1", name: "  Wikipedia  " })).toBe("Wikipedia");
    expect(getAssistantToolTraceTarget({ integrationIds: ["integration-1"], searchText: " discord   icon " })).toBe(
      "discord icon",
    );
  });

  test("does not expose arbitrary argument values in the collapsed trace", () => {
    expect(getAssistantToolTraceTarget({ id: "secret-looking-id", apiKey: "do-not-show" })).toBeNull();
  });

  test("bounds long labels so the trace remains compact", () => {
    expect(getAssistantToolTraceTarget({ title: "a".repeat(100) })).toBe(`${"a".repeat(77)}…`);
  });
});
