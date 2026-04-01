import { Request, Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { UmamiIntegration } from "../umami-integration";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
  createAxiosCertificateInstanceAsync: vi.fn(),
  createCertificateAgentAsync: vi.fn(),
}));

vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  }),
}));

const TEST_API_KEY = "test-api-key-12345";
const TEST_URL = "https://umami.example.com";

type MockResponseData = Record<string, unknown> | unknown[];

const mockFetchWithTrustedCertificates = vi.mocked(fetchWithTrustedCertificatesAsync);

const setupMockFetch = (responses: Record<string, MockResponseData>, method?: "POST") => {
  mockFetchWithTrustedCertificates.mockImplementation((url, options) => {
    const urlString = typeof url === "string" ? url : url instanceof Request ? url.url : url.toString();
    const urlObj = new URL(urlString);
    const path = urlObj.pathname;
    const reqMethod = (options as { method?: string } | undefined)?.method ?? "GET";

    if (method && reqMethod !== method) {
      return Promise.resolve(
        new Response(JSON.stringify({ error: "Method Not Allowed" }), {
          status: 405,
          headers: { "content-type": "application/json" },
        }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
      );
    }

    if (path in responses) {
      return Promise.resolve(
        new Response(JSON.stringify(responses[path]), {
          status: 200,
          headers: { "content-type": "application/json" },
        }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
      );
    }

    return Promise.resolve(
      new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
    );
  });
};

const createUmamiIntegration = (secretKind: "apiKey" | "userPass" = "apiKey") => {
  return new UmamiIntegration({
    id: "test-umami",
    name: "Test Umami",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets:
      secretKind === "apiKey"
        ? [{ kind: "apiKey", value: TEST_API_KEY }]
        : [
            { kind: "username", value: "admin" },
            { kind: "password", value: "secret" },
          ],
  });
};

const TEST_WEBSITE = { id: "site-uuid-1", name: "My Site", domain: "example.com" };

const TEST_STATS = { pageviews: 1200, visitors: 456, visits: 789, bounces: 120, totaltime: 45000 };

const TEST_PAGEVIEWS = {
  pageviews: [
    { x: "2026-03-28 00:00:00", y: 50 },
    { x: "2026-03-28 01:00:00", y: 30 },
  ],
  sessions: [
    { x: "2026-03-28 00:00:00", y: 40 },
    { x: "2026-03-28 01:00:00", y: 25 },
  ],
};

describe("UmamiIntegration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getVisitorStatsAsync", () => {
    test("should return visitor stats for a known website", async () => {
      setupMockFetch({
        "/websites/site-uuid-1": TEST_WEBSITE,
        "/websites/site-uuid-1/stats": TEST_STATS,
        "/websites/site-uuid-1/pageviews": TEST_PAGEVIEWS,
      });

      const integration = createUmamiIntegration();
      const result = await integration.getVisitorStatsAsync("site-uuid-1");

      expect(result.domain).toBe("example.com");
      expect(result.websiteName).toBe("My Site");
      expect(result.websiteId).toBe("site-uuid-1");
      expect(result.totalVisitors).toBe(456);
      expect(result.totalPageviews).toBe(1200);
      expect(result.totalVisits).toBe(789);
      expect(result.bounceRate).toBe(Math.round((120 / 789) * 100));
      expect(result.avgDuration).toBe(Math.round(45000 / 789));
      expect(result.dataPoints).toHaveLength(2);
      expect(result.dataPoints[0]?.visitors).toBe(40);
      expect(result.eventCount).toBeUndefined();
    });

    test("should include eventCount when eventName is provided", async () => {
      setupMockFetch({
        "/websites/site-uuid-1": TEST_WEBSITE,
        "/websites/site-uuid-1/stats": TEST_STATS,
        "/websites/site-uuid-1/pageviews": TEST_PAGEVIEWS,
        "/websites/site-uuid-1/metrics": [
          { x: "lookup_submit", y: 551 },
          { x: "button_click", y: 200 },
        ],
        "/websites/site-uuid-1/events": [
          { x: "2026-03-28 00:00:00", y: 20 },
          { x: "2026-03-28 01:00:00", y: 15 },
        ],
      });

      const integration = createUmamiIntegration();
      const result = await integration.getVisitorStatsAsync("site-uuid-1", "24h", "lookup_submit");

      expect(result.eventCount).toBe(551);
      expect(result.dataPoints[0]?.events).toBe(20);
      expect(result.dataPoints[1]?.events).toBe(15);
    });

    test("should return eventCount of 0 when event name not found in metrics", async () => {
      setupMockFetch({
        "/websites/site-uuid-1": TEST_WEBSITE,
        "/websites/site-uuid-1/stats": TEST_STATS,
        "/websites/site-uuid-1/pageviews": TEST_PAGEVIEWS,
        "/websites/site-uuid-1/metrics": [{ x: "other_event", y: 100 }],
        "/websites/site-uuid-1/events": [],
      });

      const integration = createUmamiIntegration();
      const result = await integration.getVisitorStatsAsync("site-uuid-1", "24h", "lookup_submit");

      expect(result.eventCount).toBe(0);
    });

    test("should omit events from dataPoints when time series is unavailable", async () => {
      setupMockFetch({
        "/websites/site-uuid-1": TEST_WEBSITE,
        "/websites/site-uuid-1/stats": TEST_STATS,
        "/websites/site-uuid-1/pageviews": TEST_PAGEVIEWS,
        "/websites/site-uuid-1/metrics": [{ x: "lookup_submit", y: 551 }],
        // /events returns 404 → time series unavailable
      });

      const integration = createUmamiIntegration();
      const result = await integration.getVisitorStatsAsync("site-uuid-1", "24h", "lookup_submit");

      expect(result.eventCount).toBe(551);
      expect(result.dataPoints[0]?.events).toBeUndefined();
    });

    test("should throw when websiteId is not found", async () => {
      setupMockFetch({});

      const integration = createUmamiIntegration();
      await expect(integration.getVisitorStatsAsync("unknown-id")).rejects.toThrow();
    });

    test("should use correct unit for 7d timeframe", async () => {
      setupMockFetch({
        "/websites/site-uuid-1": TEST_WEBSITE,
        "/websites/site-uuid-1/stats": TEST_STATS,
        "/websites/site-uuid-1/pageviews": TEST_PAGEVIEWS,
      });

      const integration = createUmamiIntegration();
      const result = await integration.getVisitorStatsAsync("site-uuid-1", "7d");

      expect(result.timeFrame).toBe("7d");
      const pageviewCall = mockFetchWithTrustedCertificates.mock.calls.find((call) => {
        const raw = call[0];
        const url = typeof raw === "string" ? raw : raw instanceof Request ? raw.url : raw.toString();
        return url.includes("/pageviews") && url.includes("unit=day");
      });
      expect(pageviewCall).toBeDefined();
    });
  });

  describe("getWebsitesAsync", () => {
    test("should return list of websites", async () => {
      setupMockFetch({
        "/websites": [TEST_WEBSITE, { id: "site-uuid-2", name: "Blog", domain: "blog.example.com" }],
      });

      const integration = createUmamiIntegration();
      const result = await integration.getWebsitesAsync();

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe("site-uuid-1");
      expect(result[1]?.domain).toBe("blog.example.com");
    });

    test("should handle paginated response format", async () => {
      setupMockFetch({
        "/websites": { data: [TEST_WEBSITE] },
      });

      const integration = createUmamiIntegration();
      const result = await integration.getWebsitesAsync();

      expect(result).toHaveLength(1);
      expect(result[0]?.domain).toBe("example.com");
    });
  });

  describe("getActiveVisitorsAsync", () => {
    test("should return active visitor count", async () => {
      setupMockFetch({
        "/websites/site-uuid-1/active": { x: 42 },
      });

      const integration = createUmamiIntegration();
      const result = await integration.getActiveVisitorsAsync("site-uuid-1");

      expect(result).toBe(42);
    });

    test("should return 0 when endpoint fails", async () => {
      setupMockFetch({});

      const integration = createUmamiIntegration();
      const result = await integration.getActiveVisitorsAsync("site-uuid-1");

      expect(result).toBe(0);
    });
  });

  describe("getEventNamesAsync", () => {
    test("should return sorted unique event names", async () => {
      setupMockFetch({
        "/websites/site-uuid-1/events": {
          data: [
            { id: "1", eventName: "lookup_submit", createdAt: "2026-03-21T00:00:00Z" },
            { id: "2", eventName: "button_click", createdAt: "2026-03-22T00:00:00Z" },
            { id: "3", eventName: "lookup_submit", createdAt: "2026-03-23T00:00:00Z" },
          ],
        },
      });

      const integration = createUmamiIntegration();
      const result = await integration.getEventNamesAsync("site-uuid-1");

      expect(result).toEqual(["button_click", "lookup_submit"]);
    });

    test("should return empty array when events endpoint fails", async () => {
      setupMockFetch({});

      const integration = createUmamiIntegration();
      const result = await integration.getEventNamesAsync("site-uuid-1");

      expect(result).toEqual([]);
    });

    test("should handle flat array response format", async () => {
      setupMockFetch({
        "/websites/site-uuid-1/events": [{ id: "1", eventName: "signup", createdAt: "2026-03-21T00:00:00Z" }],
      });

      const integration = createUmamiIntegration();
      const result = await integration.getEventNamesAsync("site-uuid-1");

      expect(result).toEqual(["signup"]);
    });
  });

  describe("getTopPagesAsync", () => {
    test("should return top pages sorted by view count", async () => {
      setupMockFetch({
        "/websites/site-uuid-1/metrics": [
          { x: "/home", y: 500 },
          { x: "/about", y: 200 },
        ],
      });

      const integration = createUmamiIntegration();
      const result = await integration.getTopPagesAsync("site-uuid-1", "7d", 10);

      expect(result).toHaveLength(2);
      expect(result[0]?.x).toBe("/home");
      expect(result[0]?.y).toBe(500);
    });

    test("should return empty array when metrics endpoint fails", async () => {
      setupMockFetch({});

      const integration = createUmamiIntegration();
      const result = await integration.getTopPagesAsync("site-uuid-1", "7d", 10);

      expect(result).toEqual([]);
    });
  });

  describe("getTopReferrersAsync", () => {
    test("should return top referrers including null as empty string for direct traffic", async () => {
      setupMockFetch({
        "/websites/site-uuid-1/metrics": [
          { x: "google.com", y: 300 },
          { x: null, y: 150 },
        ],
      });

      const integration = createUmamiIntegration();
      const result = await integration.getTopReferrersAsync("site-uuid-1", "7d", 10);

      expect(result).toHaveLength(2);
      expect(result[0]?.x).toBe("google.com");
      // null referrer (direct traffic) should be normalised to empty string
      expect(result[1]?.x).toBe("");
    });

    test("should return empty array when metrics endpoint fails", async () => {
      setupMockFetch({});

      const integration = createUmamiIntegration();
      const result = await integration.getTopReferrersAsync("site-uuid-1", "7d", 10);

      expect(result).toEqual([]);
    });
  });

  describe("getMultiEventTimeSeriesAsync", () => {
    test("should return time series for each requested event name", async () => {
      setupMockFetch({
        "/websites/site-uuid-1/events": [
          { x: "2026-03-28 00:00:00", y: 10 },
          { x: "2026-03-28 01:00:00", y: 5 },
        ],
      });

      const integration = createUmamiIntegration();
      const result = await integration.getMultiEventTimeSeriesAsync("site-uuid-1", "24h", ["signup", "click"]);

      expect(result).toHaveLength(2);
      expect(result[0]?.eventName).toBe("signup");
      expect(result[1]?.eventName).toBe("click");
      expect(result[0]?.dataPoints).toHaveLength(2);
    });

    test("should return empty dataPoints when event series endpoint fails", async () => {
      setupMockFetch({});

      const integration = createUmamiIntegration();
      const result = await integration.getMultiEventTimeSeriesAsync("site-uuid-1", "24h", ["signup"]);

      expect(result).toHaveLength(1);
      expect(result[0]?.eventName).toBe("signup");
      expect(result[0]?.dataPoints).toEqual([]);
    });

    test("should return empty array when no event names provided", async () => {
      const integration = createUmamiIntegration();
      const result = await integration.getMultiEventTimeSeriesAsync("site-uuid-1", "24h", []);

      expect(result).toEqual([]);
    });
  });

  describe("API key authentication", () => {
    test("should send x-umami-api-key header on all requests", async () => {
      setupMockFetch({
        "/websites/site-uuid-1": TEST_WEBSITE,
        "/websites/site-uuid-1/stats": TEST_STATS,
        "/websites/site-uuid-1/pageviews": TEST_PAGEVIEWS,
      });

      const integration = createUmamiIntegration("apiKey");
      await integration.getVisitorStatsAsync("site-uuid-1");

      for (const call of mockFetchWithTrustedCertificates.mock.calls) {
        const options = call[1] as { headers?: Record<string, string> };
        expect(options.headers?.["x-umami-api-key"]).toBe(TEST_API_KEY);
      }
    });
  });

  describe("JWT authentication", () => {
    test("should POST to /auth/login and send Bearer token", async () => {
      const JWT_TOKEN = "jwt-token-123";
      mockFetchWithTrustedCertificates.mockImplementation((url, options) => {
        const urlString = typeof url === "string" ? url : url instanceof Request ? url.url : url.toString();
        const urlObj = new URL(urlString);
        const path = urlObj.pathname;
        const reqMethod = (options as { method?: string } | undefined)?.method ?? "GET";

        if (path === "/auth/login" && reqMethod === "POST") {
          return Promise.resolve(
            new Response(JSON.stringify({ token: JWT_TOKEN }), {
              status: 200,
              headers: { "content-type": "application/json" },
            }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
          );
        }

        const mockData: Record<string, unknown> = {
          "/websites/site-uuid-1": TEST_WEBSITE,
          "/websites/site-uuid-1/stats": TEST_STATS,
          "/websites/site-uuid-1/pageviews": TEST_PAGEVIEWS,
        };

        if (path in mockData) {
          return Promise.resolve(
            new Response(JSON.stringify(mockData[path]), {
              status: 200,
              headers: { "content-type": "application/json" },
            }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
          );
        }

        return Promise.resolve(
          new Response(JSON.stringify({ error: "Not Found" }), {
            status: 404,
            headers: { "content-type": "application/json" },
          }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      });

      const integration = createUmamiIntegration("userPass");
      await integration.getVisitorStatsAsync("site-uuid-1");

      const loginCall = mockFetchWithTrustedCertificates.mock.calls.find((call) => {
        const raw = call[0];
        const url = typeof raw === "string" ? raw : raw instanceof Request ? raw.url : raw.toString();
        return url.includes("/auth/login");
      });
      expect(loginCall).toBeDefined();

      const dataCall = mockFetchWithTrustedCertificates.mock.calls.find((call) => {
        const raw = call[0];
        const url = typeof raw === "string" ? raw : raw instanceof Request ? raw.url : raw.toString();
        return url.includes("/websites/site-uuid-1/stats");
      });
      const options = dataCall?.[1] as { headers?: Record<string, string> };
      expect(options.headers?.Authorization).toBe(`Bearer ${JWT_TOKEN}`);
    });
  });
});
