import dayjs from "dayjs";
import frenchLocale from "dayjs/locale/fr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatRelativeTime, getResourceTimestamp } from "./coolify-utils";

describe("Coolify time formatting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T12:00:00Z"));
    dayjs.locale(frenchLocale);
  });

  afterEach(() => {
    dayjs.locale("en");
    vi.useRealTimers();
  });

  it("uses the active Day.js locale for past and future timestamps", () => {
    expect(formatRelativeTime("2026-08-02T11:00:00Z")).toBe("il y a une heure");
    expect(formatRelativeTime("2026-08-02T13:00:00Z")).toBe("dans une heure");
  });

  it("omits missing, invalid, and currently running timestamps", () => {
    expect(formatRelativeTime(undefined)).toBeUndefined();
    expect(formatRelativeTime("invalid")).toBeUndefined();
    expect(getResourceTimestamp({ status: "running", updated_at: "2026-08-02T11:00:00Z" }, "service")).toBeUndefined();
  });
});
