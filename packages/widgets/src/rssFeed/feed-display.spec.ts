import { describe, expect, test } from "vitest";

import { feedDescriptionToText, getHostname, getRssEntryDisplay } from "./component";

describe("RSS feed display helpers", () => {
  test("renders feed markup as inert text", () => {
    expect(feedDescriptionToText('<p>Hello <strong>world</strong><img src=x onerror="alert(1)"></p>')).toBe(
      "Hello world",
    );
  });

  test("handles malformed feed URLs without crashing the widget", () => {
    expect(getHostname("not a URL")).toBe("not a URL");
    expect(getHostname("https://example.com/feed.xml")).toBe("example.com");
  });

  test("advanced mode exposes all fetched entry details", () => {
    expect(
      getRssEntryDisplay({
        isAdvanced: true,
        isDense: true,
        isTiny: true,
        isRoomy: true,
        hideDescription: true,
        showPosterImage: false,
        hideBackgroundImage: false,
        descriptionLines: 1,
        thumbnailWidth: 140,
        thumbnailHeight: 140
      }),
    ).toEqual({
      showDescription: true,
      showImage: true,
      showSource: true,
      descriptionLineClamp: undefined,
      hideBackgroundImage: false,
      thumbnailWidth: 140,
      thumbnailHeight: 96
    });
  });
});
