// @vitest-environment node

import { Request, Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { UmamiIntegration } from "../umami-integration";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);
const PAGE_SIZE = 5_000;
const WEBSITE_ID = "site-1";

interface RequestedUrl {
  path: string;
  params: URLSearchParams;
}

const requestedUrls: RequestedUrl[] = [];

const setupMockFetch = (handler: (requested: RequestedUrl) => unknown) => {
  mockFetch.mockImplementation((url) => {
    const urlString = typeof url === "string" ? url : url instanceof Request ? url.url : url.toString();
    const parsed = new URL(urlString);
    const requested = { path: parsed.pathname, params: parsed.searchParams };
    requestedUrls.push(requested);
    return Promise.resolve(
      new Response(JSON.stringify(handler(requested) ?? []), {
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
    test("reads names from the aggregated metrics endpoint", async () => {
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

      expect(await createIntegration().getEventNamesAsync(WEBSITE_ID)).toEqual(["purchase", "signup"]);
      expect(requestedUrls).toHaveLength(1);
      expect(requestedUrls[0]?.path).toContain("/metrics");
      expect(requestedUrls[0]?.params.get("type")).toBe("event");
      expect(requestedUrls[0]?.params.get("limit")).toBe("5000");
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
      const firstPage = Array.from({ length: PAGE_SIZE }, (_, index) => rawEvent(index, "signup", 10));
      const secondPage = Array.from({ length: 5 }, (_, index) => rawEvent(PAGE_SIZE + index, "signup", 11));

      setupMockFetch(({ path, params }) => {
        if (!path.endsWith("/events")) return [];
        return { data: params.get("page") === "1" ? firstPage : secondPage };
      });

      const result = await createIntegration().getMultiEventTimeSeriesAsync(WEBSITE_ID, "24h", ["signup"]);

      expect(requestedUrls.map((requested) => requested.params.get("page"))).toEqual(["1", "2"]);
      expect(requestedUrls[0]?.params.get("pageSize")).toBe(String(PAGE_SIZE));
      expect(requestedUrls[0]?.params.get("event")).toBe("signup");
      expect(requestedUrls[0]?.params.get("eventName")).toBe("signup");
      expect(result[0]?.dataPoints.reduce((sum, point) => sum + point.y, 0)).toBe(PAGE_SIZE + 5);
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
      const page = Array.from({ length: PAGE_SIZE }, (_, index) => rawEvent(index, "signup", 10));
      setupMockFetch(() => ({ data: page }));

      const result = await createIntegration().getMultiEventTimeSeriesAsync(WEBSITE_ID, "24h", ["signup"]);

      expect(requestedUrls).toHaveLength(2);
      expect(result[0]?.dataPoints.reduce((sum, point) => sum + point.y, 0)).toBe(PAGE_SIZE);
    });

    test("discards partial data when a later page fails", async () => {
      const firstPage = Array.from({ length: PAGE_SIZE }, (_, index) => rawEvent(index, "signup", 10));
      mockFetch.mockImplementation((url) => {
        const urlString = typeof url === "string" ? url : url instanceof Request ? url.url : url.toString();
        const parsed = new URL(urlString);
        const isSecondPage = parsed.searchParams.get("page") === "2";
        return Promise.resolve(
          new Response(isSecondPage ? "upstream failure" : JSON.stringify({ data: firstPage }), {
            status: isSecondPage ? 500 : 200,
            headers: { "content-type": isSecondPage ? "text/plain" : "application/json" },
          }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      });

      const result = await createIntegration().getMultiEventTimeSeriesAsync(WEBSITE_ID, "24h", ["signup"]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result[0]?.dataPoints).toEqual([]);
    });

    test("probes beyond the record ceiling without counting the sentinel page", async () => {
      setupMockFetch(({ params }) => {
        const page = Number(params.get("page"));
        return {
          data: Array.from({ length: PAGE_SIZE }, (_, index) => rawEvent(page * PAGE_SIZE + index, "signup", 10)),
        };
      });

      const result = await createIntegration().getMultiEventTimeSeriesAsync(WEBSITE_ID, "24h", ["signup"]);

      expect(requestedUrls).toHaveLength(21);
      expect(result[0]?.dataPoints.reduce((sum, point) => sum + point.y, 0)).toBe(20 * PAGE_SIZE);
    });

    test("requests event series one at a time", async () => {
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
      expect(maxInFlight).toBe(1);
    });
  });
});
