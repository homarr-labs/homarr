import { describe, expect, test } from "vitest";

import { attemptGetImageFromEntry, getFirstMediaProperty } from "./rss-feeds";

// Captured from a real reddit Atom feed entry (r/formula1, 2026-09-24). Reddit exposes the poster
// image only via `media:thumbnail`/`@_url`; the URL's `s=` query param is a CDN-required signature.
const redditThumbnailUrl =
  "https://preview.redd.it/1l6zh9okngph1.jpeg?width=640&crop=smart&auto=webp&s=a93fa4418e2d6a57600fc4796a4b746c128de0dd";

const redditEntryWithThumbnailOnly = {
  id: "t3_1wfzd3i",
  title: "2026 Spanish GP - Day After Debrief",
  "media:thumbnail": { "@_url": redditThumbnailUrl },
};

describe("getFirstMediaProperty", () => {
  test("finds the image via media:thumbnail for reddit-style entries", () => {
    expect(getFirstMediaProperty(redditEntryWithThumbnailOnly)).toBe(redditThumbnailUrl);
  });

  test("still finds the image via enclosure alone", () => {
    const entry = { enclosure: { "@_url": "https://example.com/enclosure.jpg" } };
    expect(getFirstMediaProperty(entry)).toBe("https://example.com/enclosure.jpg");
  });

  test("still finds the image via media:content alone", () => {
    const entry = { "media:content": { "@_url": "https://example.com/media-content.jpg" } };
    expect(getFirstMediaProperty(entry)).toBe("https://example.com/media-content.jpg");
  });

  test("still prioritizes enclosure over media:thumbnail when both are present", () => {
    const entry = {
      enclosure: { "@_url": "https://example.com/enclosure.jpg" },
      "media:thumbnail": { "@_url": redditThumbnailUrl },
    };
    expect(getFirstMediaProperty(entry)).toBe("https://example.com/enclosure.jpg");
  });

  test("still prioritizes media:content over media:thumbnail when both are present", () => {
    const entry = {
      "media:content": { "@_url": "https://example.com/media-content.jpg" },
      "media:thumbnail": { "@_url": redditThumbnailUrl },
    };
    expect(getFirstMediaProperty(entry)).toBe("https://example.com/media-content.jpg");
  });

  test("returns null when no known media path matches", () => {
    expect(getFirstMediaProperty({ title: "no image here" })).toBeNull();
  });
});

describe("attemptGetImageFromEntry", () => {
  test("returns the full signed reddit thumbnail url, not the regex-truncated one", () => {
    const result = attemptGetImageFromEntry("https://www.reddit.com/r/formula1/.rss", redditEntryWithThumbnailOnly);
    expect(result).toBe(redditThumbnailUrl);
  });

  test("still falls back to the regex scan when no structured media path matches", () => {
    const entry = { title: "check this out", link: "https://example.com/pic.png" };
    const result = attemptGetImageFromEntry("https://example.com/feed.rss", entry);
    expect(result).toBe("https://example.com/pic.png");
  });
});
