// @vitest-environment node

import { describe, expect, test } from "vitest";

import { getCalendarMonthRange } from "./calendar";

describe("getCalendarMonthRange", () => {
  test("treats month 5 as May and includes the calendar overflow days", () => {
    const { startDate, endDate } = getCalendarMonthRange(2025, 5);

    expect(startDate.getFullYear()).toBe(2025);
    expect(startDate.getMonth()).toBe(3);
    expect(startDate.getDate()).toBe(25);
    expect(endDate.getFullYear()).toBe(2025);
    expect(endDate.getMonth()).toBe(5);
    expect(endDate.getDate()).toBe(6);
  });
});
