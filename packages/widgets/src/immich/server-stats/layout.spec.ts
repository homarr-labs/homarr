import { describe, expect, test } from "vitest";

import { getImmichStatsLayout, getImmichStatVisibility } from "./component";

describe("Immich server statistics compact layout", () => {
  test("keeps the v1 one-column non-dense layout at every compact size", () => {
    expect(getImmichStatsLayout(280, 120, 4)).toEqual({ columns: 1, dense: false });
    expect(getImmichStatsLayout(480, 120, 4)).toEqual({ columns: 1, dense: false });
    expect(getImmichStatsLayout(360, 240, 4)).toEqual({ columns: 1, dense: false });
    expect(getImmichStatsLayout(200, 180, 4)).toEqual({ columns: 1, dense: false });
  });

  test("advanced mode shows all four headline stats", () => {
    const options = { showUsers: false, showPhotos: false, showVideos: false, showStorage: false };

    expect(getImmichStatVisibility(options, true)).toEqual({
      showUsers: true,
      showPhotos: true,
      showVideos: true,
      showStorage: true,
    });
    expect(getImmichStatVisibility(options, false)).toEqual(options);
  });
});
