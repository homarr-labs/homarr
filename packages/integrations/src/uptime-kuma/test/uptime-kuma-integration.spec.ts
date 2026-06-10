import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationSecret } from "../../base/types";
import { UptimeKumaIntegration } from "../uptime-kuma-integration";
import { uptimeKumaHeartbeatCategoryMap } from "../uptime-kuma-types";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const TEST_URL = "https://uptime.example.com";
const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const toUrlString = (url: unknown): string => String(url);

const createIntegration = (secrets: IntegrationSecret[] = []) =>
  new UptimeKumaIntegration({
    id: "test-uptime-kuma",
    name: "Test Uptime Kuma",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets: secrets,
  });

beforeEach(() => {
  mockFetch.mockReset();
});

describe("uptimeKumaHeartbeatCategoryMap", () => {
  test("maps status 0 (down) to 'down'", () => {
    expect(uptimeKumaHeartbeatCategoryMap[0]).toBe("down");
  });

  test("maps status 1 (up) to 'up'", () => {
    expect(uptimeKumaHeartbeatCategoryMap[1]).toBe("up");
  });

  test("maps status 2 (pending) to 'paused'", () => {
    expect(uptimeKumaHeartbeatCategoryMap[2]).toBe("paused");
  });

  test("maps status 3 (maintenance) to 'paused'", () => {
    expect(uptimeKumaHeartbeatCategoryMap[3]).toBe("paused");
  });

  test("returns undefined for unknown status codes", () => {
    expect(uptimeKumaHeartbeatCategoryMap[99]).toBeUndefined();
  });
});

describe("UptimeKumaIntegration.getDashboardDataAsync", () => {
  const statusPageResponse = {
    publicGroupList: [
      {
        id: 1,
        name: "Services",
        monitorList: [
          { id: 10, name: "Web" },
          { id: 20, name: "API" },
          { id: 30, name: "DB" },
        ],
      },
    ],
  };

  const heartbeatResponse = {
    heartbeatList: {
      "10": [{ status: 1, time: "2025-01-01" }],
      "20": [{ status: 0, time: "2025-01-01" }],
      "30": [{ status: 2, time: "2025-01-01" }],
    },
    uptimeList: {
      "10_24": 0.995,
      "20_24": 0.5,
      "30_24": 0.8,
    },
  };

  const mockResponses = () => {
    mockFetch.mockImplementation((url) => {
      const urlStr = toUrlString(url);

      if (urlStr.includes("/heartbeat/")) {
        return Promise.resolve(
          new Response(JSON.stringify(heartbeatResponse), { status: 200 }),
        ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
      }

      return Promise.resolve(
        new Response(JSON.stringify(statusPageResponse), { status: 200 }),
      ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
    });
  };

  test("aggregates monitor counts correctly", async () => {
    mockResponses();
    const integration = createIntegration([{ kind: "slug", value: "default" }]);
    const result = await integration.getDashboardDataAsync();

    expect(result.totalMonitors).toBe(3);
    expect(result.upCount).toBe(1);
    expect(result.downCount).toBe(1);
    expect(result.pausedCount).toBe(1);
  });

  test("computes average uptime from uptimeList", async () => {
    mockResponses();
    const integration = createIntegration([{ kind: "slug", value: "default" }]);
    const result = await integration.getDashboardDataAsync();

    const expectedAverage = ((0.995 + 0.5 + 0.8) * 100) / 3;
    expect(result.averageUptimePercent).toBeCloseTo(expectedAverage, 5);
  });

  test("defaults unknown heartbeat status to 'down'", async () => {
    const unknownHeartbeat = {
      heartbeatList: { "10": [{ status: 99, time: "2025-01-01" }] },
      uptimeList: { "10_24": 1 },
    };

    mockFetch.mockImplementation((url) => {
      const urlStr = toUrlString(url);
      if (urlStr.includes("/heartbeat/")) {
        return Promise.resolve(
          new Response(JSON.stringify(unknownHeartbeat), { status: 200 }),
        ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            publicGroupList: [{ id: 1, name: "G", monitorList: [{ id: 10, name: "Svc" }] }],
          }),
          { status: 200 },
        ),
      ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
    });

    const integration = createIntegration([{ kind: "slug", value: "default" }]);
    const result = await integration.getDashboardDataAsync();

    expect(result.monitors[0]?.status).toBe("down");
    expect(result.downCount).toBe(1);
  });

  test("handles empty monitor list gracefully", async () => {
    mockFetch.mockImplementation(
      () =>
        Promise.resolve(
          new Response(JSON.stringify({ publicGroupList: [], heartbeatList: {}, uptimeList: {} }), { status: 200 }),
        ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>,
    );

    const integration = createIntegration([{ kind: "slug", value: "default" }]);
    const result = await integration.getDashboardDataAsync();

    expect(result.totalMonitors).toBe(0);
    expect(result.averageUptimePercent).toBe(0);
  });
});
