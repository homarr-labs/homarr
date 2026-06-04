import { describe, expect, test } from "vitest";

import { speedtestTrackerResultSchema } from "../speedtest-tracker-types";

describe("speedtestTrackerResultSchema", () => {
  test("parses created_at as Speedtest Tracker local wall time", () => {
    const result = speedtestTrackerResultSchema.parse({
      id: 1,
      ping: 12,
      download_bits: 100,
      upload_bits: 50,
      healthy: true,
      created_at: "2026-05-18 18:30:01",
    });

    expect(result.created_at.getHours()).toBe(18);
    expect(result.created_at.getMinutes()).toBe(30);
  });
});
