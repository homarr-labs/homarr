import { describe, expect, test } from "vitest";

import { feedDescriptionToText, getHostname, getSafeExternalUrl } from "./component";

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

  test("only exposes credential-free HTTP links from untrusted feed entries", () => {
    expect(getSafeExternalUrl("https://example.com/story")).toBe("https://example.com/story");
    expect(getSafeExternalUrl("/story", "https://example.com/feed.xml")).toBe("https://example.com/story");
    expect(getSafeExternalUrl("/story", "https://user:password@example.com/feed.xml")).toBe(
      "https://example.com/story",
    );
    expect(getSafeExternalUrl("https://user:password@example.com/story")).toBe("https://example.com/story");
    expect(getSafeExternalUrl(undefined, "https://example.com/feed?token=secret")).toBeUndefined();
    expect(getSafeExternalUrl("#story", "https://example.com/feed?token=secret#old")).toBe(
      "https://example.com/feed#story",
    );
    expect(getSafeExternalUrl("?story=1", "https://example.com/feed?token=secret")).toBe(
      "https://example.com/feed?story=1",
    );
    expect(getSafeExternalUrl("javascript:alert(1)")).toBeUndefined();
    expect(getSafeExternalUrl("not a URL")).toBeUndefined();
  });
});
