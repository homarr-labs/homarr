import { describe, expect, test } from "vitest";

import { getTrackedFeatureProperties } from "./analytics-properties";

describe("getTrackedFeatureProperties", () => {
  test("keeps setup telemetry anonymous and strips configuration-shaped properties", () => {
    expect(
      getTrackedFeatureProperties(
        "setup:widget-completed",
        {
          entryPoint: "board",
          outcome: "completed",
          elapsedMs: 1200,
          hasBoardContext: true,
          userId: "supplied-user",
          url: "https://private.example",
          recordId: "secret-id",
        },
        "session-user",
      ),
    ).toEqual({ entryPoint: "board", outcome: "completed", elapsedMs: 1200, hasBoardContext: true });
  });

  test("preserves the existing identified contract for non-setup events", () => {
    expect(getTrackedFeatureProperties("theme-changed", { theme: "dark" }, "user-1")).toEqual({
      theme: "dark",
      userId: "user-1",
    });
  });

  test("discards setup values outside the closed telemetry contract", () => {
    expect(
      getTrackedFeatureProperties(
        "setup:widget-completed",
        {
          entryPoint: "https://private.example",
          intent: "secret-id",
          outcome: "credential",
          elapsedMs: Number.POSITIVE_INFINITY,
          hasBoardContext: "true",
          canResolveInline: 1,
        },
        "session-user",
      ),
    ).toEqual({});
  });

  test("keeps known widget intents and bounded elapsed times", () => {
    expect(
      getTrackedFeatureProperties(
        "setup:widget-completed",
        { entryPoint: "board", intent: "weather", outcome: "completed", elapsedMs: 0, canResolveInline: false },
        "session-user",
      ),
    ).toEqual({ entryPoint: "board", intent: "weather", outcome: "completed", elapsedMs: 0, canResolveInline: false });
  });

  test("keeps the app intent used by Universal Create", () => {
    expect(
      getTrackedFeatureProperties("setup:intent-selected", { entryPoint: "header", intent: "app" }, "user-1"),
    ).toEqual({ entryPoint: "header", intent: "app" });
  });
});
