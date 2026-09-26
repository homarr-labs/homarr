import { describe, expect, test } from "vitest";

import { createDirectBookmark, normalizeBookmarkUrl, splitBookmarkUrls } from "./bookmark-item";

describe("bookmark display helpers", () => {
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
