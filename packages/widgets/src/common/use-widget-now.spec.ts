import { describe, expect, it } from "vitest";

import { getNextWidgetTickDelay } from "./use-widget-now";

describe("getNextWidgetTickDelay", () => {
  it("aligns second and minute ticks", () => {
    const now = new Date(2026, 7, 20, 12, 34, 45, 250);
    expect(getNextWidgetTickDelay(now, "second")).toBe(750);
    expect(getNextWidgetTickDelay(now, "minute")).toBe(14_750);
  });

  it("aligns day ticks to the next local midnight", () => {
    const now = new Date(2026, 7, 20, 23, 59, 59, 500);
    expect(getNextWidgetTickDelay(now, "day")).toBe(500);
  });
});
