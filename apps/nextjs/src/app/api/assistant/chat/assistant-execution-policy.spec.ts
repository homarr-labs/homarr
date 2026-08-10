import { describe, expect, test } from "vitest";

import { assistantExecutionPolicy } from "./assistant-execution-policy";

describe("assistantExecutionPolicy", () => {
  test("allows a sizeable batch of tool calls to finish in one request", () => {
    expect(assistantExecutionPolicy.maxSteps).toBeGreaterThanOrEqual(32);
    expect(assistantExecutionPolicy.maxOutputTokens).toBeGreaterThanOrEqual(65_536);
    expect(assistantExecutionPolicy.totalTimeoutMs).toBeGreaterThan(assistantExecutionPolicy.stepTimeoutMs);
    expect(assistantExecutionPolicy.toolTimeoutMs).toBeGreaterThanOrEqual(60_000);
  });
});
