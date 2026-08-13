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
});
