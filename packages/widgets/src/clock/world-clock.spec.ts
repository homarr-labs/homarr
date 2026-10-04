import dayjs from "dayjs";
import { describe, expect, test } from "vitest";

import {
  createWorldClockTime,
  formatRelativeOffset,
  formatUtcOffset,
  getTimeOfDayPhase,
  getTimeZoneOptions,
} from "./world-clock";

describe("world clock helpers", () => {
  test("adds UTC to the available timezone options", () => {
    expect(getTimeZoneOptions()).toContainEqual({ value: "UTC", label: "UTC (UTC)" });
  });

  test("classifies the fixed time-of-day phases at their boundaries", () => {
    expect([0, 4, 5, 7, 8, 17, 18, 20, 21, 23].map(getTimeOfDayPhase)).toEqual([
      "night",
      "night",
      "dawn",
      "dawn",
      "day",
      "day",
      "dusk",
      "dusk",
      "night",
      "night",
    ]);
  });

  test("formats whole-hour and fractional offsets", () => {
    expect(formatUtcOffset(345)).toBe("UTC+05:45");
    expect(formatRelativeOffset(-210)).toBe("−3h 30m");
    expect(formatRelativeOffset(0)).toBe("±0h");
  });

  test("compares civil dates across the date line from one instant", () => {
    const now = new Date("2026-01-01T02:30:00.000Z");
    const primaryTime = dayjs(now).tz("America/New_York");
    const tokyo = createWorldClockTime({
      city: { id: "tokyo", label: "Tokyo", timeZone: "Asia/Tokyo" },
      now,
      primaryTime,
    });

    expect(primaryTime.format("YYYY-MM-DD")).toBe("2025-12-31");
    expect(tokyo.zonedTime?.format("YYYY-MM-DD")).toBe("2026-01-01");
    expect(tokyo.dayDifference).toBe(1);
  });

  test("isolates unsupported timezones", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const result = createWorldClockTime({
      city: { id: "invalid", label: "Invalid", timeZone: "Invalid/Timezone" },
      now,
      primaryTime: dayjs(now).tz("UTC"),
    });

    expect(result.zonedTime).toBeNull();
    expect(result.utcOffset).toBeNull();
  });
});
