import { describe, expect, test } from "vitest";

import { shouldPrefetchWidgetForRequest } from "./_prefetch-policy";

describe("shouldPrefetchWidgetForRequest", () => {
  test.each(["mobile", "tablet"])("defers downloads for %s requests", (deviceType) => {
    expect(shouldPrefetchWidgetForRequest("downloads", deviceType, true)).toBe(false);
  });

  test("keeps downloads prefetched for desktop requests", () => {
    expect(shouldPrefetchWidgetForRequest("downloads", undefined, true)).toBe(true);
  });

  test("keeps downloads prefetched for legacy responsive mobile boards", () => {
    expect(shouldPrefetchWidgetForRequest("downloads", "mobile", false)).toBe(true);
  });

  test.each(["app", "bookmarks"] as const)("keeps eager %s data prefetched on mobile", (kind) => {
    expect(shouldPrefetchWidgetForRequest(kind, "mobile", true)).toBe(true);
  });
});
