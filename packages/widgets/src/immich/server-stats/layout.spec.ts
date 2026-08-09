import { describe, expect, test } from "vitest";

import { getImmichStatsLayout } from "./component";

describe("Immich server statistics compact layout", () => {
  test("keeps four enabled stats legible in a short widget", () => {
    expect(getImmichStatsLayout(280, 120, 4)).toEqual({ columns: 2, dense: true });
    expect(getImmichStatsLayout(480, 120, 4)).toEqual({ columns: 4, dense: true });
  });

  test("uses the roomier summary layout when space is available", () => {
    expect(getImmichStatsLayout(360, 240, 4)).toEqual({ columns: 2, dense: false });
    expect(getImmichStatsLayout(200, 180, 4)).toEqual({ columns: 2, dense: true });
  });
});
