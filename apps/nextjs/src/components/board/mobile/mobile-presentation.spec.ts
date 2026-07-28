import { describe, expect, test } from "vitest";

import {
  isMobileContextActionVisible,
  resolveMobileItemPresentation,
  shouldRenderMobileWidgetActions,
} from "./mobile-presentation";

describe("resolveMobileItemPresentation", () => {
  test("renders apps as eager compact tiles", () => {
    expect(resolveMobileItemPresentation({ kind: "app", height: 8 }, undefined)).toMatchObject({
      width: 1,
      height: 1,
      eager: true,
      supportsDetails: false,
      unmountWhenOffscreen: false,
    });
  });

  test("defaults widgets to full width without inventing a detail view", () => {
    expect(resolveMobileItemPresentation({ kind: "calendar", height: 8 }, undefined)).toMatchObject({
      width: 2,
      height: 3,
      eager: false,
      supportsDetails: false,
      unmountWhenOffscreen: false,
    });
  });

  test("enables details only when the widget explicitly supports them", () => {
    expect(
      resolveMobileItemPresentation(
        { kind: "calendar", height: 2 },
        {
          width: 2,
          height: 1,
          supportsDetailView: true,
        },
      ),
    ).toMatchObject({
      supportsDetails: true,
    });
  });

  test("keeps automatic footprint defaults when only details are configured", () => {
    expect(
      resolveMobileItemPresentation(
        { kind: "calendar", height: 7 },
        {
          supportsDetailView: true,
        },
      ),
    ).toMatchObject({
      width: 2,
      height: 3,
      supportsDetails: true,
    });
  });

  test("prefers explicit presentation metadata while eager mounting takes precedence", () => {
    expect(
      resolveMobileItemPresentation(
        { kind: "clock", height: 3 },
        {
          width: 1,
          height: 1,
          supportsCompactSummary: true,
          supportsDetailView: false,
          eager: true,
          unmountWhenOffscreen: true,
        },
      ),
    ).toEqual({
      width: 1,
      height: 1,
      displayMode: "mobileSummary",
      supportsDetails: false,
      eager: true,
      unmountWhenOffscreen: false,
    });
  });
});

describe("shouldRenderMobileWidgetActions", () => {
  test("does not render an action trigger without an explicit capability", () => {
    expect(
      shouldRenderMobileWidgetActions({
        supportsDetails: false,
        supportsRefresh: false,
        visibleContextActionCount: 0,
      }),
    ).toBe(false);
  });

  test.each([
    { supportsDetails: true, supportsRefresh: false, visibleContextActionCount: 0 },
    { supportsDetails: false, supportsRefresh: true, visibleContextActionCount: 0 },
    { supportsDetails: false, supportsRefresh: false, visibleContextActionCount: 1 },
  ])("renders an action trigger for an explicit capability", (capabilities) => {
    expect(shouldRenderMobileWidgetActions(capabilities)).toBe(true);
  });
});

describe("isMobileContextActionVisible", () => {
  test("requires actions to opt into the read-only mobile surface", () => {
    const action = { key: "configure", label: "Configure", onClick: () => undefined };

    expect(isMobileContextActionVisible(action)).toBe(false);
    expect(isMobileContextActionVisible({ ...action, mobileVisible: true })).toBe(true);
    expect(isMobileContextActionVisible({ ...action, mobileVisible: true, hidden: true })).toBe(false);
  });
});
