import { describe, expect, test } from "vitest";

import { resolveMobileBoardViewport } from "./use-mobile-board";

describe("resolveMobileBoardViewport", () => {
  test("keeps phones mobile regardless of their viewport width", () => {
    expect(
      resolveMobileBoardViewport({
        deviceClass: "phone",
        matchesMobileWidth: false,
        hasResolvedClientWidth: true,
      }),
    ).toEqual({
      deviceClass: "phone",
      isMobile: true,
      isResolved: true,
    });
  });

  test.each([
    [true, true],
    [false, false],
  ])("uses the 48em query for tablets (matches: %s)", (matchesMobileWidth, expectedIsMobile) => {
    expect(
      resolveMobileBoardViewport({
        deviceClass: "tablet",
        matchesMobileWidth,
        hasResolvedClientWidth: true,
      }).isMobile,
    ).toBe(expectedIsMobile);
  });

  test("keeps tablets unresolved until their client width is known", () => {
    expect(
      resolveMobileBoardViewport({
        deviceClass: "tablet",
        matchesMobileWidth: false,
        hasResolvedClientWidth: false,
      }).isResolved,
    ).toBe(false);
  });

  test.each([
    [true, true],
    [false, false],
  ])("keeps desktop resize behavior (matches: %s)", (matchesMobileWidth, expectedIsMobile) => {
    expect(
      resolveMobileBoardViewport({
        deviceClass: "desktop",
        matchesMobileWidth,
        hasResolvedClientWidth: true,
      }),
    ).toMatchObject({
      isMobile: expectedIsMobile,
      isResolved: true,
    });
  });
});
