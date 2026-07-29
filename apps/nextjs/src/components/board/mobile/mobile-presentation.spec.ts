import { describe, expect, test } from "vitest";

import { resolveMobileItemPresentation } from "./mobile-presentation";

describe("resolveMobileItemPresentation", () => {
  test("renders apps as eager compact tiles", () => {
    expect(resolveMobileItemPresentation({ kind: "app", height: 8 }, undefined)).toMatchObject({
      width: 1,
      height: 1,
      eager: true,
      supportsDetails: false,
    });
  });

  test("defaults widgets to full width and clamps desktop height", () => {
    expect(resolveMobileItemPresentation({ kind: "calendar", height: 8 }, undefined)).toMatchObject({
      width: 2,
      height: 3,
      eager: false,
      supportsDetails: true,
    });
  });

  test("prefers explicit presentation metadata", () => {
    expect(
      resolveMobileItemPresentation(
        { kind: "clock", height: 3 },
        {
          width: 1,
          height: 1,
          supportsCompactSummary: true,
          supportsDetailView: false,
          eager: true,
        },
      ),
    ).toEqual({
      width: 1,
      height: 1,
      displayMode: "mobileSummary",
      supportsDetails: false,
      eager: true,
    });
  });
});
