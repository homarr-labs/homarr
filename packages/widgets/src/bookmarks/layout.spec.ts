import { describe, expect, test } from "vitest";

import { reduceWidgetOptionsWithDefinition } from "../manifest";
import { createDirectBookmark, getBookmarkAddressText, normalizeBookmarkUrl, splitBookmarkUrls } from "./bookmark-item";
import { definition } from "./index";
import { getBookmarkCardDisplay, getBookmarkDisplayPlan } from "./layout";

describe("bookmark display helpers", () => {
  test("uses explicit width breakpoints for advanced columns", () => {
    expect(
      getBookmarkDisplayPlan({ advanced: true, width: 900, height: 500, itemCount: 8, layout: "adaptive" }),
    ).toMatchObject({
      columns: 3,
      orientation: "horizontal",
    });
    expect(
      getBookmarkDisplayPlan({ advanced: true, width: 120, height: 500, itemCount: 8, layout: "adaptive" }),
    ).toMatchObject({
      columns: 1,
      orientation: "horizontal",
    });
  });

  test("selects an adaptive plan from width and height breakpoints", () => {
    expect(
      getBookmarkDisplayPlan({ advanced: false, width: 560, height: 260, itemCount: 4, layout: "adaptive" }),
    ).toMatchObject({
      columns: 2,
      itemHeight: 128,
      orientation: "horizontal",
      showHostname: true,
      showTitle: true,
    });
    expect(
      getBookmarkDisplayPlan({ advanced: false, width: 180, height: 80, itemCount: 4, layout: "adaptive" }),
    ).toMatchObject({
      columns: 1,
      orientation: "icon",
      showHostname: false,
      showTitle: false,
    });
  });

  test("keeps compact cards visible when icons are hidden", () => {
    const plan = getBookmarkDisplayPlan({ advanced: false, width: 180, height: 80, itemCount: 4, layout: "icons" });
    expect(
      getBookmarkCardDisplay({ advanced: false, hideHostname: false, hideIcon: true, hideTitle: false, plan }),
    ).toEqual({
      orientation: "horizontal",
      showHostname: false,
      showIcon: false,
      showTitle: true,
    });
  });

  test("creates standalone bookmarks without app records", () => {
    expect(createDirectBookmark("https://homarr.dev/docs")).toEqual({
      id: "url:https://homarr.dev/docs",
      name: "homarr.dev",
      description: null,
      href: "https://homarr.dev/docs",
    });
    expect(normalizeBookmarkUrl("homarr.dev/docs")).toBe("https://homarr.dev/docs");
    expect(normalizeBookmarkUrl("javascript:alert(1)")).toBeUndefined();
  });

  test("splits URL lists without corrupting commas inside a URL", () => {
    expect(splitBookmarkUrls("https://one.example, two.example")).toEqual(["https://one.example", "two.example"]);
    expect(splitBookmarkUrls("https://maps.example/@52.5,13.4,15z")).toEqual(["https://maps.example/@52.5,13.4,15z"]);
  });

  test("keeps full URLs off unless the widget option is enabled", () => {
    expect(definition.createOptions().showFullUrls).toMatchObject({ defaultValue: false, withDescription: true });
    expect(reduceWidgetOptionsWithDefinition(definition, {} as never, { hideHostname: true }).showFullUrls).toBe(false);
    expect(reduceWidgetOptionsWithDefinition(definition, {} as never, { showFullUrls: true }).showFullUrls).toBe(true);
  });

  test("uses the hostname until full URLs are enabled, then keeps scheme, port, and path", () => {
    const href = "https://homeassistant.example.com:8443/path";
    expect(getBookmarkAddressText(href, false)).toBe("homeassistant.example.com");
    expect(getBookmarkAddressText(href, true)).toBe(href);
  });

  test("shows an ellipsized address line for full URLs on narrow cards that hide hostnames", () => {
    const plan = getBookmarkDisplayPlan({
      advanced: false,
      width: 320,
      height: 260,
      itemCount: 2,
      layout: "adaptive",
    });
    expect(plan).toMatchObject({ orientation: "horizontal", showHostname: false });
    expect(
      getBookmarkCardDisplay({ advanced: false, hideHostname: false, hideIcon: false, hideTitle: false, plan }),
    ).toMatchObject({ showHostname: false });
    expect(
      getBookmarkCardDisplay({
        advanced: false,
        hideHostname: false,
        hideIcon: false,
        hideTitle: false,
        plan,
        showFullUrls: true,
      }),
    ).toMatchObject({ showHostname: true, orientation: "horizontal" });
  });

  test("leaves icon-only bookmarks without an address line when full URLs are on", () => {
    const plan = getBookmarkDisplayPlan({
      advanced: false,
      width: 400,
      height: 200,
      itemCount: 4,
      layout: "icons",
      showFullUrls: true,
    });
    expect(
      getBookmarkCardDisplay({
        advanced: false,
        hideHostname: false,
        hideIcon: false,
        hideTitle: false,
        plan,
        showFullUrls: true,
      }),
    ).toMatchObject({ orientation: "icon", showHostname: false, showTitle: false });
  });

  test("gives column bookmarks room for a full URL without growing them while the option is off", () => {
    expect(
      getBookmarkDisplayPlan({
        advanced: false,
        width: 480,
        height: 200,
        itemCount: 2,
        layout: "column",
        hideHostname: true,
        showFullUrls: true,
      }).itemHeight,
    ).toBe(48);
    expect(
      getBookmarkDisplayPlan({
        advanced: false,
        width: 480,
        height: 200,
        itemCount: 2,
        layout: "column",
        hideHostname: true,
      }).itemHeight,
    ).toBe(32);
  });
});
