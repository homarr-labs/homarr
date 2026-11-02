import { beforeEach, describe, expect, test, vi } from "vitest";

import { rssFeedsRequestHandler } from "./rss-feeds";

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

const feedResponse = (xml: string) =>
  new Response(xml, {
    status: 200,
    headers: { "content-type": "application/atom+xml; charset=UTF-8" },
  });

const atomFeed = (entry: string) => `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <title>fixture</title>
  <updated>2026-11-02T00:00:00Z</updated>
  ${entry}
</feed>`;

const loadEntriesAsync = async (url: string, xml: string) => {
  fetchMock.mockResolvedValue(feedResponse(xml));
  const { data } = await rssFeedsRequestHandler.handler({ url, count: 5, descriptionMaxLength: 250 }).getDataAsync();
  return data.entries ?? [];
};

describe("rss feed poster images", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "debug").mockImplementation(() => undefined);
    rssFeedsRequestHandler.invalidateCache();
  });

  test("uses the signed media:thumbnail url instead of the escaped html image", async () => {
    const thumbnail = "https://preview.redd.it/from-thumb.jpeg?width=640&crop=smart&auto=webp&s=thumbsig";
    const entries = await loadEntriesAsync(
      "https://www.reddit.com/r/selfhosted/.rss",
      atomFeed(`<entry>
        <id>t3_thumb</id>
        <title>Has thumbnail</title>
        <updated>2026-11-02T00:00:00Z</updated>
        <link href="https://www.reddit.com/r/selfhosted/comments/thumb/" />
        <content type="html">&lt;img src="https://preview.redd.it/from-html.jpeg?width=640&amp;amp;crop=smart&amp;amp;s=htmlsig"&gt;</content>
        <media:thumbnail url="${thumbnail.replaceAll("&", "&amp;")}" />
      </entry>`),
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]?.enclosure).toBe(thumbnail);
    expect(entries[0]?.enclosure).toContain("s=thumbsig");
    expect(entries[0]?.enclosure).not.toContain("&amp;");
  });

  test("decodes html-escaped query strings when the image is only in the entry html", async () => {
    const entries = await loadEntriesAsync(
      "https://www.reddit.com/r/html-only/.rss",
      atomFeed(`<entry>
        <id>t3_html</id>
        <title>Html only</title>
        <updated>2026-11-02T00:00:00Z</updated>
        <link href="https://www.reddit.com/r/selfhosted/comments/html/" />
        <content type="html">&lt;img src="https://preview.redd.it/only-html.jpeg?width=640&amp;amp;crop=smart&amp;amp;auto=webp&amp;amp;s=abc123"&gt;</content>
      </entry>`),
    );

    expect(entries[0]?.enclosure).toBe(
      "https://preview.redd.it/only-html.jpeg?width=640&crop=smart&auto=webp&s=abc123",
    );
  });

  test("keeps enclosure and media:content ahead of media:thumbnail", async () => {
    const enclosure = "https://cdn.example.com/poster.jpg?size=large";
    const mediaContent = "https://cdn.example.com/content.jpg?size=full";
    const thumbnail = "https://preview.redd.it/thumb.jpeg?s=later";

    const enclosureEntries = await loadEntriesAsync(
      "https://example.com/enclosure.rss",
      atomFeed(`<entry>
        <id>t3_enclosure</id>
        <title>Enclosure wins</title>
        <updated>2026-11-02T00:00:00Z</updated>
        <link href="https://example.com/enclosure" />
        <enclosure url="${enclosure}" type="image/jpeg" />
        <media:content url="${mediaContent}" medium="image" />
        <media:thumbnail url="${thumbnail}" />
      </entry>`),
    );
    const contentEntries = await loadEntriesAsync(
      "https://example.com/content.rss",
      atomFeed(`<entry>
        <id>t3_content</id>
        <title>Content wins</title>
        <updated>2026-11-02T00:00:00Z</updated>
        <link href="https://example.com/content" />
        <media:content url="${mediaContent}" medium="image" />
        <media:thumbnail url="${thumbnail}" />
      </entry>`),
    );

    expect(enclosureEntries[0]?.enclosure).toBe(enclosure);
    expect(contentEntries[0]?.enclosure).toBe(mediaContent);
  });
});
