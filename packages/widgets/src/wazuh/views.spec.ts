import { describe, expect, test } from "vitest";

import { getVisibleWazuhViews, getWazuhRangeHours, resolveWazuhView, wazuhViews } from "./views";

describe("getVisibleWazuhViews", () => {
  test("keeps the canonical tab order", () => {
    expect(getVisibleWazuhViews(["fim", "overview"])).toEqual(["overview", "fim"]);
  });

  test("falls back to every tab when nothing valid is selected", () => {
    expect(getVisibleWazuhViews([])).toEqual([...wazuhViews]);
    expect(getVisibleWazuhViews(["removed"])).toEqual([...wazuhViews]);
  });
});

describe("resolveWazuhView", () => {
  test("uses the saved tab while it is visible", () => {
    expect(resolveWazuhView("agents", ["overview", "agents"])).toBe("agents");
  });

  test("falls back to the first visible tab", () => {
    expect(resolveWazuhView("agents", ["timeline", "fim"])).toBe("timeline");
    expect(resolveWazuhView(undefined, ["fim"])).toBe("fim");
  });
});

describe("getWazuhRangeHours", () => {
  test("converts the range to hours", () => {
    expect(getWazuhRangeHours("24h")).toBe(24);
    expect(getWazuhRangeHours("30d")).toBe(720);
  });
});
