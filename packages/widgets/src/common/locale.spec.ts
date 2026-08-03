import { describe, expect, test } from "vitest";

import { formatLocalizedCompactNumber, formatLocalizedDate, formatLocalizedTime, getBinaryStatusKey } from "./locale";

const sample = new Date("2026-01-02T13:05:09.000Z");

describe("localized widget formatting", () => {
  test.each([
    ["en-US", /Jan/],
    ["fr-FR", /janv/i],
    ["de-DE", /Jan/],
    ["he-IL", /[\u0590-\u05ff]/],
  ])("formats dates for %s", (locale, expected) => {
    expect(
      formatLocalizedDate(sample, locale, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }),
    ).toMatch(expected);
  });

  test("supports explicit 12-hour and 24-hour clocks", () => {
    expect(formatLocalizedTime(sample, "en-US", { hour12: true, timeZone: "UTC" })).toBe("1:05 PM");
    expect(formatLocalizedTime(sample, "en-US", { hour12: false, timeZone: "UTC" })).toBe("13:05");
  });

  test("localizes compact numbers", () => {
    expect(formatLocalizedCompactNumber(1_234_567, "en-US")).toBe("1.2M");
    expect(formatLocalizedCompactNumber(1_234_567, "fr-FR")).toContain("1,2");
    expect(formatLocalizedCompactNumber(1_234_567, "de-DE")).toContain("Mio.");
  });

  test("normalizes binary status for translated accessibility labels", () => {
    expect(getBinaryStatusKey("enabled")).toBe("enabled");
    expect(getBinaryStatusKey("disabled")).toBe("disabled");
    expect(getBinaryStatusKey()).toBe("unknown");
  });
});
