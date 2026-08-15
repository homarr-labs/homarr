import { Request, Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { UmamiIntegration } from "../umami-integration";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

/** Matches the page size the integration asks for; a full page is what triggers the next request. */
const PAGE_SIZE = 5_000;
const WEBSITE_ID = "site-1";

interface RequestedUrl {
  path: string;
  params: URLSearchParams;
}

const requestedUrls: RequestedUrl[] = [];

/**
 * Routes on the last path segment(s) and records every request, so tests can assert both the
 * result and how many round trips it took — the point of these changes is the number and size
 * of requests, not only the value returned.
 */
const setupMockFetch = (handler: (requested: RequestedUrl) => unknown) => {
  mockFetch.mockImplementation((url) => {
    const urlString = typeof url === "string" ? url : url instanceof Request ? url.url : url.toString();
    const parsed = new URL(urlString);
    const requested = { path: parsed.pathname, params: parsed.searchParams };
    requestedUrls.push(requested);
    const body = handler(requested);
    return Promise.resolve(
      new Response(JSON.stringify(body ?? []), {
        status: 200,
        headers: { "content-type": "application/json" },
      }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
    );
  });
};

const createIntegration = () =>
  new UmamiIntegration({
    id: "test-umami",
    name: "Test Umami",
    url: "https://umami.example.com/api",
    externalUrl: null,
    decryptedSecrets: [{ kind: "apiKey", value: "test-key" }],
  });

/** A raw Umami Cloud event record, the shape that used to be downloaded 100k at a time. */
const rawEvent = (index: number, eventName: string, hour: number) => ({
  id: `event-${index}`,
  websiteId: WEBSITE_ID,
  sessionId: `session-${index}`,
  eventType: 2,
  eventName,
  createdAt: `2026-08-09T${String(hour).padStart(2, "0")}:30:00.000Z`,
});

describe("UmamiIntegration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestedUrls.length = 0;
  });

  describe("getEventNamesAsync", () => {
    test("reads names from the aggregated metrics endpoint, never the raw event list", async () => {
      setupMockFetch(({ path }) => {
        if (path.endsWith("/metrics")) {
          return [
            { x: "signup", y: 12 },
            { x: "purchase", y: 3 },
            { x: "signup", y: 1 },
          ];
        }
        throw new Error(`unexpected request to ${path}`);
      });

      const result = await createIntegration().getEventNamesAsync(WEBSITE_ID);

      expect(result).toEqual(["purchase", "signup"]);
      expect(requestedUrls).toHaveLength(1);
      expect(requestedUrls[0]?.path).toContain("/metrics");
      expect(requestedUrls[0]?.params.get("type")).toBe("event");
      // The regression this guards: listing /events pulled every raw record to derive names.
      expect(requestedUrls.some((requested) => requested.path.endsWith("/events"))).toBe(false);
    });

    test("drops empty names and returns them sorted", async () => {
      setupMockFetch(() => [
        { x: "beta", y: 1 },
        { x: null, y: 5 },
        { x: "alpha", y: 2 },
      ]);

      expect(await createIntegration().getEventNamesAsync(WEBSITE_ID)).toEqual(["alpha", "beta"]);
    });
  });

  describe("getMultiEventTimeSeriesAsync", () => {
    test("pages through raw event records and aggregates across pages", async () => {
      // Page 1 is full, so a second page is requested; page 2 is short, which ends it.
      const firstPage = Array.from({ length: PAGE_SIZE }, (_, index) => rawEvent(index, "signup", 10));
      const secondPage = Array.from({ length: 5 }, (_, index) => rawEvent(PAGE_SIZE + index, "signup", 11));

      setupMockFetch(({ path, params }) => {
        if (!path.endsWith("/events")) return [];
        return { data: params.get("page") === "1" ? firstPage : secondPage };
      });

      const result = await createIntegration().getMultiEventTimeSeriesAsync("site-1", "24h", ["signup"]);

      expect(requestedUrls.map((requested) => requested.params.get("page"))).toEqual(["1", "2"]);
      expect(requestedUrls[0]?.params.get("pageSize")).toBe(String(PAGE_SIZE));
      expect(result).toHaveLength(1);
      // Both pages must be counted: a full page in the 10:00 bucket, 5 in the 11:00 bucket.
      const total = result[0]?.dataPoints.reduce((sum, point) => sum + point.y, 0);
      expect(total).toBe(PAGE_SIZE + 5);
      expect(result[0]?.dataPoints).toHaveLength(2);
    });

    test("stops after one page when the instance returns aggregated buckets", async () => {
      setupMockFetch(() => [
        { x: "2026-08-09 10:00:00", y: 4 },
        { x: "2026-08-09 11:00:00", y: 7 },
      ]);

      const result = await createIntegration().getMultiEventTimeSeriesAsync(WEBSITE_ID, "24h", ["signup"]);

      expect(requestedUrls).toHaveLength(1);
      expect(result[0]?.dataPoints).toEqual([
        { x: "2026-08-09 10:00:00", y: 4 },
        { x: "2026-08-09 11:00:00", y: 7 },
      ]);
    });

    test("stops instead of double counting when the instance ignores the page parameter", async () => {
      // Always returns the same full page, whatever page was asked for.
      const page = Array.from({ length: PAGE_SIZE }, (_, index) => rawEvent(index, "signup", 10));
      setupMockFetch(() => ({ data: page }));

      const result = await createIntegration().getMultiEventTimeSeriesAsync(WEBSITE_ID, "24h", ["signup"]);

      // Page 1 is consumed, page 2 is recognised as a repeat and discarded.
      expect(requestedUrls).toHaveLength(2);
      expect(result[0]?.dataPoints.reduce((sum, point) => sum + point.y, 0)).toBe(PAGE_SIZE);
    });

    test("requests event series one at a time rather than all at once", async () => {
      let inFlight = 0;
      let maxInFlight = 0;
      mockFetch.mockImplementation(async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 1));
        inFlight--;
        return new Response(JSON.stringify([{ x: "2026-08-09 10:00:00", y: 1 }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>;
      });

      const result = await createIntegration().getMultiEventTimeSeriesAsync(WEBSITE_ID, "24h", [
        "signup",
        "purchase",
        "refund",
      ]);

      expect(result).toHaveLength(3);
      // Concurrent fan-out multiplied resident event pages by the number of tracked events.
      expect(maxInFlight).toBe(1);
    });
  });
});
