import { describe, expect, test } from "vitest";

import { formatTotalTracearrBitrate, formatTracearrBitrate } from "./bitrate";

describe("Tracearr bitrate formatting", () => {
  test("sums raw Kbps before choosing the display unit", () => {
    expect(formatTotalTracearrBitrate([{ bitrate: 800 }, { bitrate: 1200 }])).toBe("2 Mb/s");
  });

  test("formats Gb/s after aggregation", () => {
    expect(formatTotalTracearrBitrate([{ bitrate: 1_500_000 }, { bitrate: 500_000 }])).toBe("2 Gb/s");
  });

  test("ignores missing and invalid bitrate values", () => {
    expect(formatTotalTracearrBitrate([{ bitrate: null }, { bitrate: Number.NaN }, { bitrate: 500 }])).toBe("500 Kb/s");
    expect(formatTracearrBitrate(0)).toBe("—");
  });
});
