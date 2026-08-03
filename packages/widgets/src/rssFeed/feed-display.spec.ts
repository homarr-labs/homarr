import { describe, expect, test } from "vitest";

import { feedDescriptionToText, getHostname } from "./component";

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
});
