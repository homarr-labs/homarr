import { describe, expect, test } from "vitest";

import { buildWeeks, lastYearRange, level, monthStarts, yearRange } from "./calendar";

describe("thingport activity calendar", () => {
  test("last year range ends today and starts the day after a year ago", () => {
    expect(lastYearRange("2026-10-18")).toEqual({ from: "2025-10-19", to: "2026-10-18" });
  });

  test("weeks start on the requested weekday and pad the edges out of range", () => {
    // 1 January 2026 was a Thursday.
    const sundayWeeks = buildWeeks(yearRange(2026), 0);
    expect(sundayWeeks[0]?.[0]).toEqual({ date: "2025-12-28", inRange: false });
    expect(sundayWeeks[0]?.[4]).toEqual({ date: "2026-01-01", inRange: true });

    const mondayWeeks = buildWeeks(yearRange(2026), 1);
    expect(mondayWeeks[0]?.[0]?.date).toBe("2025-12-29");
    expect(mondayWeeks.every((week) => week.length === 7)).toBe(true);
    expect(mondayWeeks.at(-1)?.some((cell) => cell.date === "2026-12-31" && cell.inRange)).toBe(true);
  });

  test("month labels skip a month too close to the next", () => {
    const weeks = buildWeeks({ from: "2026-01-30", to: "2026-03-31" }, 0);
    expect(monthStarts(weeks).map((start) => start.month)).toEqual([1, 2]);
  });

  test("levels shade by share of the busiest day", () => {
    expect(level(0, 10)).toBe(0);
    expect(level(1, 10)).toBe(1);
    expect(level(5, 10)).toBe(2);
    expect(level(10, 10)).toBe(4);
    expect(level(3, 0)).toBe(0);
  });
});
