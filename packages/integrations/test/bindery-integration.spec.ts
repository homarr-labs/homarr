// @vitest-environment node

import { describe, expect, test, vi } from "vitest";

import { createDb } from "@homarr/db/test";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { BinderyIntegration } from "../src/media-organizer/bindery/bindery-integration";

vi.mock("@homarr/db", async (importActual) => {
  const actual = await importActual<typeof import("@homarr/db")>();
  return { ...actual, db: createDb() };
});

vi.mock("@homarr/core/infrastructure/certificates", async (importActual) => {
  const actual = await importActual<typeof import("@homarr/core/infrastructure/certificates")>();
  return {
    ...actual,
    getTrustedCertificateHostnamesAsync: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const integrationInput = {
  id: "test-bindery",
  name: "Bindery",
  url: "http://localhost:8787",
  decryptedSecrets: [{ kind: "apiKey" as const, value: "test-key" }],
  externalUrl: null,
};

describe("BinderyIntegration getMissingAsync", () => {
  test("maps Bindery's bare-array response into MissingMediaItem[] with type book", async () => {
    // /api/v1/wanted/missing returns a bare array (no {items,total} wrapper),
    // unlike Sonarr/Radarr's paginated {totalRecords, records} shape.
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: 14814,
            title: "Authority",
            releaseDate: "2014-01-01T00:00:00Z",
            imageUrl: "https://assets.hardcover.app/edition/30769443/cover.jpg",
            author: { authorName: "Jeff VanderMeer" },
          },
        ]),
    } as never);

    const integration = new BinderyIntegration(integrationInput);
    const result = await integration.getMissingAsync(10);

    expect(result.totalCount).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: 14814,
      title: "Authority",
      type: "book",
      year: 2014,
      seriesTitle: "Jeff VanderMeer",
      imageUrl: "https://assets.hardcover.app/edition/30769443/cover.jpg",
      link: "http://localhost:8787/book/14814",
    });
  });

  test("drops a non-absolute imageUrl instead of passing through a Bindery-proxied path", async () => {
    // /api/v1/book's imageUrl is a Bindery-proxied, auth-gated relative path
    // (/api/v1/images?url=...). If that shape ever leaks into this endpoint's
    // response it must not be handed to the browser as a public image URL.
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: 1,
            title: "Some Book",
            imageUrl: "/api/v1/images?url=https%3A%2F%2Fexample.com%2Fcover.jpg",
          },
        ]),
    } as never);

    const integration = new BinderyIntegration(integrationInput);
    const result = await integration.getMissingAsync(10);

    expect(result.items[0]?.imageUrl).toBeNull();
  });

  test("slices client-side to pageSize since the endpoint ignores pagination params", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve(
          Array.from({ length: 5 }, (_, index) => ({ id: index, title: `Book ${index}` })),
        ),
    } as never);

    const integration = new BinderyIntegration(integrationInput);
    const result = await integration.getMissingAsync(2);

    expect(result.totalCount).toBe(5);
    expect(result.items).toHaveLength(2);
  });
});

describe("BinderyIntegration getMediaQueueAsync", () => {
  test("excludes already-imported rows from the active queue", async () => {
    // Observed live: Bindery's /api/v1/queue returns its entire historical
    // log, not just in-flight downloads (522 of 555 rows were "imported").
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [
            { id: 1, title: "Done Book", status: "imported", percentage: "100.0" },
            { id: 2, title: "Grabbing Book", status: "grabbed", percentage: "40.0", timeLeft: "10m" },
          ],
        }),
    } as never);

    const integration = new BinderyIntegration(integrationInput);
    const result = await integration.getMediaQueueAsync(10);

    expect(result.totalCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ id: 2, status: "grabbed", type: "book" });
  });

  test("hides timeLeft when percentage is 100 even for a non-imported row", async () => {
    // Observed live: an importBlocked item reported percentage "100.0"
    // alongside a stale timeLeft ("721h 20m"). A 100%-complete item has no
    // meaningful time remaining, so that value must not be surfaced.
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [
            {
              id: 3,
              title: "Stuck Book",
              status: "importBlocked",
              percentage: "100.0",
              timeLeft: "721h 20m",
              book: { id: 9990, title: "Stuck Book", authorName: "Some Author" },
            },
          ],
        }),
    } as never);

    const integration = new BinderyIntegration(integrationInput);
    const result = await integration.getMediaQueueAsync(10);

    expect(result.items[0]).toMatchObject({
      status: "importBlocked",
      percentComplete: 100,
      timeLeft: null,
      seriesTitle: "Some Author",
      link: "http://localhost:8787/book/9990",
    });
  });
});

describe("BinderyIntegration testingAsync", () => {
  test("hits the authenticated status endpoint and succeeds on a 2xx response", async () => {
    const integration = new BinderyIntegration(integrationInput);
    const fetchAsync = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ version: "v1.36.1" }) });

    // testingAsync is protected; the "test connection" button in the UI is
    // the only normal caller. Cast to invoke it directly in isolation from
    // testConnectionAsync's TLS/dispatcher setup, which is out of scope here.
    const testingAsync = (
      integration as unknown as { testingAsync: (input: { fetchAsync: typeof fetchAsync }) => Promise<{ success: boolean }> }
    ).testingAsync.bind(integration);

    const result = await testingAsync({ fetchAsync });

    // this.url(...) returns a URL instance, not a string, so compare via
    // its serialized form rather than object identity.
    const [calledUrl, calledOptions] = fetchAsync.mock.calls[0] as [URL, { headers: Record<string, string> }];
    expect(calledUrl.toString()).toBe("http://localhost:8787/api/v1/system/status");
    expect(calledOptions).toMatchObject({ headers: { "X-Api-Key": "test-key" } });
    expect(result.success).toBe(true);
  });
});
