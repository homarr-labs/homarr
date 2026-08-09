import { describe, expect, test } from "vitest";

import { calculateBandwidth, formatBitsPerSec } from "./bandwidth";

describe("calculateBandwidth", () => {
  test("sorts samples before calculating a rate", () => {
    const result = calculateBandwidth([
      { timestamp: new Date("2026-01-01T00:00:00Z"), data: [{ name: "wan", receive: 100, transmit: 200 }] },
      { timestamp: new Date("2026-01-01T00:00:10Z"), data: [{ name: "wan", receive: 300, transmit: 500 }] },
    ]);

    expect(result.data).toEqual([{ name: "wan", receive: 160, transmit: 240 }]);
  });

  test("treats counter resets as zero instead of negative traffic", () => {
    const result = calculateBandwidth([
      { timestamp: new Date("2026-01-01T00:00:10Z"), data: [{ name: "wan", receive: 10, transmit: 10 }] },
      { timestamp: new Date("2026-01-01T00:00:00Z"), data: [{ name: "wan", receive: 100, transmit: 100 }] },
    ]);

    expect(result.data).toEqual([{ name: "wan", receive: 0, transmit: 0 }]);
  });

  test("rejects duplicate timestamps", () => {
    const timestamp = new Date("2026-01-01T00:00:00Z");
    expect(
      calculateBandwidth([
        { timestamp, data: [{ name: "wan", receive: 100, transmit: 100 }] },
        { timestamp, data: [{ name: "wan", receive: 50, transmit: 50 }] },
      ]).data,
    ).toEqual([]);
  });
});

describe("formatBitsPerSec", () => {
  test("handles invalid and negative rates", () => {
    expect(formatBitsPerSec(Number.NaN, 2)).toBe("0 b/s");
    expect(formatBitsPerSec(-1, 2)).toBe("0 b/s");
  });
});
