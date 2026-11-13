import { describe, expect, it, vi } from "vitest";

import { extract } from "@extractus/feed-extractor";

import { rssFeedsRequestHandler } from "./rss-feeds";

vi.mock("@extractus/feed-extractor", () => ({
  extract: vi.fn(),
}));

const mockExtract = vi.mocked(extract);

describe("rssFeedsRequestHandler", () => {
  it("prioritizes published date over updated date for atom and youtube feeds", async () => {
    mockExtract.mockImplementation(async (_url, options) => {
      const rawEntry = {
        title: "I Tried the World's SPICIEST Sauce",
        link: "https://www.youtube.com/watch?v=j8bJN1UvHn0",
        published: "2026-11-01T16:00:11+00:00",
        updated: "2026-11-09T20:39:58+00:00",
        "media:group": {
          "media:description": "Testing the hottest hot sauce in the world.",
          "media:thumbnail": { "@_url": "https://i2.ytimg.com/vi/j8bJN1UvHn0/hqdefault.jpg" },
        },
      };

      const extraFields = options?.getExtraEntryFields?.(rawEntry) ?? {};

      return {
        title: "Max the Meat Guy",
        link: "https://www.youtube.com/channel/UC_pT_Iz6XjuM-eMTlXghdfw",
        entries: [
          {
            title: rawEntry.title,
            link: rawEntry.link,
            published: rawEntry.updated, // feed-extractor defaults to updated
            description: "",
            ...extraFields,
          },
        ],
      } as never;
    });

    const handler = rssFeedsRequestHandler.handler({
      url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC_pT_Iz6XjuM-eMTlXghdfw",
      count: 10,
      descriptionMaxLength: 250,
    });

    const { data } = await handler.getDataAsync();

    expect(data.entries).toHaveLength(1);
    const firstEntry = data.entries?.[0];
    expect(firstEntry?.published).toBe("2026-11-01T16:00:11.000Z");
    expect(firstEntry?.description).toBe("Testing the hottest hot sauce in the world.");
    expect(firstEntry?.enclosure).toBe("https://i2.ytimg.com/vi/j8bJN1UvHn0/hqdefault.jpg");
    expect(firstEntry?.feedUrl).toBe("https://www.youtube.com/feeds/videos.xml?channel_id=UC_pT_Iz6XjuM-eMTlXghdfw");
  });

  it("handles feeds without media descriptions gracefully", async () => {
    mockExtract.mockImplementation(async (_url, options) => {
      const rawEntry = {
        title: "Standard Blog Post",
        link: "https://example.com/post",
        published: "2026-10-15T12:00:00Z",
      };

      const extraFields = options?.getExtraEntryFields?.(rawEntry) ?? {};

      return {
        title: "Example Blog",
        link: "https://example.com",
        entries: [
          {
            title: rawEntry.title,
            link: rawEntry.link,
            published: rawEntry.published,
            description: "Default description",
            ...extraFields,
          },
        ],
      } as never;
    });

    const handler = rssFeedsRequestHandler.handler({
      url: "https://example.com/feed.xml",
      count: 5,
      descriptionMaxLength: 250,
    });

    const { data } = await handler.getDataAsync();

    expect(data.entries).toHaveLength(1);
    const firstEntry = data.entries?.[0];
    expect(firstEntry?.published).toBe("2026-10-15T12:00:00.000Z");
    expect(firstEntry?.description).toBe("Default description");
    expect(firstEntry?.enclosure).toBeUndefined();
  });
});
