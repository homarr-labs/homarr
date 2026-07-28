import { describe, expect, test } from "vitest";

import {
  isMobileContextActionVisible,
  resolveMobileItemPresentation,
  shouldKeepMobileWidgetActionsMounted,
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

  test("does not unmount apps that use the eager default", () => {
    expect(
      resolveMobileItemPresentation(
        { kind: "app", height: 1 },
        {
          unmountWhenOffscreen: true,
        },
      ),
    ).toMatchObject({
      eager: true,
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

  test("uses a compact one-row fallback when only details are configured", () => {
    expect(
      resolveMobileItemPresentation(
        { kind: "calendar", height: 7 },
        {
          supportsDetailView: true,
        },
      ),
    ).toMatchObject({
      width: 2,
      height: 1,
      displayMode: "mobileSummary",
      supportsDetails: true,
      usesGenericSummary: true,
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
      usesGenericSummary: false,
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

describe("shouldKeepMobileWidgetActionsMounted", () => {
  test("does not expose actions before a deferred widget is near the viewport", () => {
    expect(
      shouldKeepMobileWidgetActionsMounted({
        isNearViewport: false,
        actionsOpened: false,
        detailsOpened: false,
        isOpeningDetails: false,
        isCompletingAction: false,
        actionTriggerHasFocus: false,
      }),
    ).toBe(false);
  });

  test.each([
    ["near the viewport", { isNearViewport: true }],
    ["showing its action drawer", { actionsOpened: true }],
    ["showing its detail view", { detailsOpened: true }],
    ["transitioning to details", { isOpeningDetails: true }],
    ["completing an action", { isCompletingAction: true }],
    ["retaining keyboard focus", { actionTriggerHasFocus: true }],
  ])("keeps actions mounted while %s", (_label, activeState) => {
    expect(
      shouldKeepMobileWidgetActionsMounted({
        isNearViewport: false,
        actionsOpened: false,
        detailsOpened: false,
        isOpeningDetails: false,
        isCompletingAction: false,
        actionTriggerHasFocus: false,
        ...activeState,
      }),
    ).toBe(true);
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
