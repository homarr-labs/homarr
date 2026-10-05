import { describe, expect, test } from "vitest";

import { resolveMediaMissingTab } from "./tabs";

describe("resolveMediaMissingTab", () => {
  test("preserves the selected tab while it remains enabled", () => {
    expect(resolveMediaMissingTab("queued", true, true)).toBe("queued");
  });

  test("falls back when the selected tab is disabled", () => {
    expect(resolveMediaMissingTab("missing", false, true)).toBe("queued");
    expect(resolveMediaMissingTab("queued", true, false)).toBe("missing");
  });

  test("returns no tab when both panels are disabled", () => {
    expect(resolveMediaMissingTab("missing", false, false)).toBeNull();
  });
});
