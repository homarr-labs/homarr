import { describe, expect, it } from "vitest";

import { getTodayLayout, getTodayStats } from "./date-stats";

describe("today date statistics", () => {
  it("accounts for leap years", () => {
    const stats = getTodayStats(new Date(2024, 11, 31, 12), "iso");
    expect(stats.dayOfYear).toBe(366);
    expect(stats.daysInYear).toBe(366);
    expect(stats.daysAfterToday).toBe(0);
  });

  it("uses the requested week convention", () => {
    const date = new Date(2023, 0, 1, 12);
    expect(getTodayStats(date, "iso").weekNumber).toBe(52);
    expect(getTodayStats(date, "locale", "en-US").weekNumber).toBe(1);
    expect(getTodayStats(date, "locale", "de-DE").weekNumber).toBe(52);
  });

  it("returns bounded calendar progress", () => {
    const stats = getTodayStats(new Date(2026, 7, 20, 12), "iso");
    expect(stats.quarter).toBe(3);
    expect(stats.weekProgress).toBeGreaterThanOrEqual(0);
    expect(stats.weekProgress).toBeLessThanOrEqual(100);
    expect(stats.monthProgress).toBeGreaterThanOrEqual(0);
    expect(stats.monthProgress).toBeLessThanOrEqual(100);
    expect(stats.yearProgress).toBeGreaterThanOrEqual(0);
    expect(stats.yearProgress).toBeLessThanOrEqual(100);
  });
});

describe("today compact layout", () => {
  it("keeps tiny widgets focused on the date", () => {
    expect(getTodayLayout(140, 120)).toMatchObject({ tiny: true, showStats: false });
  });

  it("reveals secondary information only when both axes have room", () => {
    expect(getTodayLayout(240, 120)).toMatchObject({ showStats: true, showQuarter: false });
    expect(getTodayLayout(300, 180)).toEqual({
      tiny: false,
      showFullDate: true,
      showStats: true,
      showQuarter: true,
      showMonthProgress: true,
    });
  });
});
