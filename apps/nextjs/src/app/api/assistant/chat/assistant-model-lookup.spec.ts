import { describe, expect, test } from "vitest";

import { getAssistantModelLookupStatus } from "./assistant-model-lookup";

describe("getAssistantModelLookupStatus", () => {
  test("keeps the configured default usable when discovery is temporarily unreachable", () => {
    expect(
      getAssistantModelLookupStatus({
        configuredModelId: "provider/default",
        requestedModelId: "provider/default",
        hasModel: false,
        failed: true,
      }),
    ).toBe("available");
  });

  test("treats an alternate model discovery failure as retryable", () => {
    expect(
      getAssistantModelLookupStatus({
        configuredModelId: "provider/default",
        requestedModelId: "provider/alternate",
        hasModel: false,
        failed: true,
      }),
    ).toBe("unreachable");
  });

  test("rejects an alternate model only after discovery confirms it is absent", () => {
    expect(
      getAssistantModelLookupStatus({
        configuredModelId: "provider/default",
        requestedModelId: "provider/alternate",
        hasModel: false,
        failed: false,
      }),
    ).toBe("unavailable");
  });

  test("accepts a discovered alternate model", () => {
    expect(
      getAssistantModelLookupStatus({
        configuredModelId: "provider/default",
        requestedModelId: "provider/alternate",
        hasModel: true,
        failed: false,
      }),
    ).toBe("available");
  });
});
