import { describe, expect, test } from "vitest";

import {
  resolveIsAutomaticMobileBoard,
  resolveMobileBoardViewport,
  shouldShowMobileBoardViewportSkeleton,
} from "./use-mobile-board";

describe("resolveMobileBoardViewport", () => {
  test("keeps phones mobile regardless of their viewport width", () => {
    expect(
      resolveMobileBoardViewport({
        deviceClass: "phone",
        matchesMobileWidth: false,
        hasMounted: true,
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
        hasMounted: true,
      }).isMobile,
    ).toBe(expectedIsMobile);
  });

  test("keeps tablets unresolved until their client width is known", () => {
    expect(
      resolveMobileBoardViewport({
        deviceClass: "tablet",
        matchesMobileWidth: false,
        hasMounted: false,
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
        hasMounted: true,
      }),
    ).toMatchObject({
      isMobile: expectedIsMobile,
      isResolved: true,
    });
  });
});

describe("resolveIsAutomaticMobileBoard", () => {
  test.each([
    [true, true, true],
    [true, false, false],
    [false, true, false],
    [false, false, false],
  ])(
    "requires both a mobile viewport and the server setting (viewport: %s, setting: %s)",
    (isMobileViewport, enableAutomaticMobileLayout, expected) => {
      expect(resolveIsAutomaticMobileBoard({ isMobileViewport, enableAutomaticMobileLayout })).toBe(expected);
    },
  );
});

describe("shouldShowMobileBoardViewportSkeleton", () => {
  test("does not show the tablet resolution skeleton in legacy mode", () => {
    expect(
      shouldShowMobileBoardViewportSkeleton({
        enableAutomaticMobileLayout: false,
        isResolved: false,
      }),
    ).toBe(false);
  });

  test("shows a skeleton while an automatic mobile viewport is unresolved", () => {
    expect(
      shouldShowMobileBoardViewportSkeleton({
        enableAutomaticMobileLayout: true,
        isResolved: false,
      }),
    ).toBe(true);
  });
});
