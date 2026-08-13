import { describe, expect, test } from "vitest";

import { getArchiveCompactLayout } from "./component";

describe("archive team warrior compact layout", () => {
  test("keeps only primary counters in a minimum-size widget", () => {
    expect(getArchiveCompactLayout(180, 100)).toMatchObject({
      metricColumns: 2,
      showBandwidth: false,
      showBroadcast: false,
      showSecondaryCounts: false,
    });
  });

  test("adds secondary information as height becomes available", () => {
    expect(getArchiveCompactLayout(320, 260)).toMatchObject({
      metricColumns: 4,
      showBandwidth: true,
      showBroadcast: true,
      showSecondaryCounts: true,
    });
  });

  test("keeps all display sections available in advanced mode", () => {
    expect(getArchiveCompactLayout(180, 100, true)).toMatchObject({
      showBandwidth: true,
      showBroadcast: true,
      showSecondaryCounts: true,
    });
  });
});
