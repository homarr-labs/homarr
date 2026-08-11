import { describe, expect, test } from "vitest";

import type { IconGroup } from "./icon-picker.utils";
import { arrangeIconPickerSections, isDirectImageUrl, isImageSource, isSvgImage } from "./icon-picker.utils";

const groups = [
  {
    id: "remote",
    slug: "dashboard-icons",
    icons: [
      { id: "long", name: "home-assistant-alt.svg", url: "https://cdn.example.com/home-assistant-alt.svg" },
      { id: "raster", name: "Home Assistant.png", url: "https://cdn.example.com/home-assistant.png" },
      { id: "svg", name: "home-assistant.svg", url: "https://cdn.example.com/home-assistant.svg?v=1" },
    ],
  },
  {
    id: "local",
    slug: "local",
    icons: [{ id: "local", name: "Home Assistant.png", url: "/api/user-medias/home-assistant" }],
  },
] as IconGroup[];

describe("icon picker utilities", () => {
  test("arranges local images before remote SVG and raster images", () => {
    const result = arrangeIconPickerSections(groups, "home assistant");

    expect(result.local.map((icon) => icon.id)).toEqual(["local"]);
    expect(result.svg.map((icon) => icon.id)).toEqual(["svg", "long"]);
    expect(result.other.map((icon) => icon.id)).toEqual(["raster"]);
  });

  test.each([
    ["https://example.com/icon.png", true],
    ["http://localhost:3000/icon", true],
    ["ftp://example.com/icon.png", false],
    ["javascript:alert(1)", false],
    ["example.com/icon.png", false],
  ])("validates direct image URLs", (value, expected) => {
    expect(isDirectImageUrl(value)).toBe(expected);
  });

  test("accepts internal image paths without treating search text as a source", () => {
    expect(isImageSource("/api/user-medias/123")).toBe(true);
    expect(isImageSource("shopify")).toBe(false);
  });

  test("recognizes SVG URLs with query strings case-insensitively", () => {
    expect(isSvgImage("https://example.com/ICON.SVG?raw=1")).toBe(true);
  });
});
