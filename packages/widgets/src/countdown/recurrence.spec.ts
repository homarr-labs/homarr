import { describe, expect, it } from "vitest";

import type { OptionDateTimeEvent } from "../options";
import { getCountdownDurationParts } from "./display";
import {
  getCountdownEventState,
  getCountdownProgress,
  resolveWallDateTimeString,
  groupCountdownStates,
} from "./recurrence";

const event = (overrides: Partial<OptionDateTimeEvent> = {}): OptionDateTimeEvent => ({
  id: "event",
  label: "Event",
  targetUtc: "2026-07-15T13:00:00.000Z",
  timeZone: "America/New_York",
  recurrence: "none",
  ...overrides,
});

describe("countdown recurrence", () => {
  it("preserves a yearly event's wall-clock time across DST offsets", () => {
    const recurring = event({ recurrence: "yearly" });
    const winterState = getCountdownEventState(recurring, new Date("2027-01-01T00:00:00.000Z"));

    expect(winterState.nextOccurrence?.toISOString()).toBe("2027-07-15T13:00:00.000Z");
  });

  it("skips non-leap years for a February 29 recurrence", () => {
    const recurring = event({
      recurrence: "yearly",
      targetUtc: "2024-02-29T12:00:00.000Z",
      timeZone: "UTC",
    });
    const state = getCountdownEventState(recurring, new Date("2025-01-01T00:00:00.000Z"));

    expect(state.nextOccurrence?.toISOString()).toBe("2028-02-29T12:00:00.000Z");
    expect(state.previousOccurrence?.toISOString()).toBe("2024-02-29T12:00:00.000Z");
  });

  it("selects the first valid time after a DST gap", () => {
    const resolved = resolveWallDateTimeString("2026-03-08 02:30:45", "America/New_York");
    expect(resolved?.toISOString()).toBe("2026-03-08T07:00:00.000Z");
  });

  it("selects the earlier occurrence when a wall-clock time repeats", () => {
    const resolved = resolveWallDateTimeString("2026-11-01 01:30:00", "America/New_York");
    expect(resolved?.toISOString()).toBe("2026-11-01T05:30:00.000Z");
  });
});

describe("countdown ordering and progress", () => {
  const now = new Date("2026-06-01T12:00:00.000Z");

  it("preserves configured order within event groups", () => {
    const states = [
      getCountdownEventState(event({ id: "later", targetUtc: "2026-06-03T12:00:00.000Z" }), now),
      getCountdownEventState(event({ id: "older", targetUtc: "2026-05-01T12:00:00.000Z" }), now),
      getCountdownEventState(event({ id: "sooner", targetUtc: "2026-06-02T12:00:00.000Z" }), now),
      getCountdownEventState(event({ id: "newer", targetUtc: "2026-05-31T12:00:00.000Z" }), now),
    ];

    const grouped = groupCountdownStates(states);
    expect(grouped.upcoming.map(({ event: item }) => item.id)).toEqual(["later", "sooner"]);
    expect(grouped.completed.map(({ event: item }) => item.id)).toEqual(["older", "newer"]);
  });

  it("clamps one-time progress and omits it without a start", () => {
    const withStart = getCountdownEventState(
      event({ targetUtc: "2026-06-02T12:00:00.000Z", startUtc: "2026-05-31T12:00:00.000Z" }),
      now,
    );
    const withoutStart = getCountdownEventState(event({ targetUtc: "2026-06-02T12:00:00.000Z" }), now);

    expect(getCountdownProgress(withStart, now)).toBe(50);
    expect(getCountdownProgress(withStart, new Date("2026-06-04T12:00:00.000Z"))).toBe(100);
    expect(getCountdownProgress(withoutStart, now)).toBeNull();
  });

  it("uses the previous and next occurrence for yearly progress", () => {
    const state = getCountdownEventState(
      event({ recurrence: "yearly", targetUtc: "2024-01-01T00:00:00.000Z", timeZone: "UTC" }),
      new Date("2026-07-02T12:00:00.000Z"),
    );
    const progress = getCountdownProgress(state, new Date("2026-07-02T12:00:00.000Z"));

    expect(progress).not.toBeNull();
    if (progress === null) throw new Error("Expected yearly progress");
    expect(progress).toBeGreaterThan(49);
    expect(progress).toBeLessThan(51);
  });

  it("keeps seconds visible at every duration when enabled", () => {
    const longState = getCountdownEventState(event({ targetUtc: "2026-06-03T13:00:00.000Z" }), now);
    const shortState = getCountdownEventState(event({ targetUtc: "2026-06-02T11:30:45.000Z" }), now);

    expect(getCountdownDurationParts(longState, now, true).some(({ unit }) => unit === "second")).toBe(true);
    expect(getCountdownDurationParts(shortState, now, true).some(({ unit }) => unit === "second")).toBe(true);
    expect(getCountdownDurationParts(longState, now, false).some(({ unit }) => unit === "second")).toBe(false);
  });
});
