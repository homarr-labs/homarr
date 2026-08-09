import { describe, expect, test } from "vitest";

import { getNearestTriggerScrollTop } from "./assistant-trigger-scroll";

describe("getNearestTriggerScrollTop", () => {
  test("keeps a fully visible highlighted item in place", () => {
    expect(
      getNearestTriggerScrollTop({
        scrollTop: 120,
        viewportTop: 100,
        viewportBottom: 400,
        itemTop: 180,
        itemBottom: 228,
      }),
    ).toBe(120);
  });

  test("scrolls down only enough to reveal the highlighted item", () => {
    expect(
      getNearestTriggerScrollTop({
        scrollTop: 120,
        viewportTop: 100,
        viewportBottom: 400,
        itemTop: 388,
        itemBottom: 436,
      }),
    ).toBe(156);
  });

  test("scrolls up only enough to reveal the highlighted item", () => {
    expect(
      getNearestTriggerScrollTop({
        scrollTop: 120,
        viewportTop: 100,
        viewportBottom: 400,
        itemTop: 72,
        itemBottom: 120,
      }),
    ).toBe(92);
  });

  test("clamps upward scrolling at the start of the list", () => {
    expect(
      getNearestTriggerScrollTop({
        scrollTop: 12,
        viewportTop: 100,
        viewportBottom: 400,
        itemTop: 40,
        itemBottom: 88,
      }),
    ).toBe(0);
  });
});
