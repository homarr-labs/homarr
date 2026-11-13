import { describe, expect, test } from "vitest";

import { definition } from "./index";

const activitySignal = (data: unknown) => definition.activitySignal?.(data);

const result = (sessions: unknown[], error?: string) => ({
  integrationId: "jellyfin",
  integrationName: "Jellyfin",
  integrationKind: "jellyfin",
  sessions,
  error,
});

describe("media server activitySignal", () => {
  test("is active while any server has a session", () => {
    expect(activitySignal([result([]), result([{ sessionId: "s-1" }])])).toBe(true);
  });

  test("is idle when every server reports no sessions", () => {
    expect(activitySignal([result([]), result([])])).toBe(false);
  });

  test("counts a failed server as active so its error stays visible", () => {
    expect(activitySignal([result([], "INTEGRATION_REQUEST_FAILED")])).toBe(true);
  });

  test("is idle for missing or malformed data", () => {
    expect(activitySignal(undefined)).toBe(false);
    expect(activitySignal({ sessions: [{}] })).toBe(false);
    expect(activitySignal([null, "unexpected"])).toBe(false);
  });
});
