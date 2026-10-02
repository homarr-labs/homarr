import { describe, expect, test } from "vitest";

import { createDirectBookmark, normalizeBookmarkUrl, splitBookmarkUrls } from "./bookmark-item";
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
});
