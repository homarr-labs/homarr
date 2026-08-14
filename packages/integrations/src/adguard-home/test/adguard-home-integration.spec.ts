// @vitest-environment node

import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.SECRET_ENCRYPTION_KEY = "ff3f4f7ce30e870c9630de9e5d244ffa81101a24ed0dfe5f064beb53a7e684f1";
});

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { AdGuardHomeIntegration } from "../adguard-home-integration";

vi.mock("@homarr/core/infrastructure/http", () => ({ fetchWithTrustedCertificatesAsync: vi.fn() }));

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);
const integration = new AdGuardHomeIntegration({
  id: "adguard-1",
  name: "AdGuard Home",
  url: "https://adguard.example.com",
  externalUrl: null,
  decryptedSecrets: [
    { kind: "username", value: "admin" },
    { kind: "password", value: "secret" },
  ],
});

describe("AdGuardHomeIntegration", () => {
  beforeEach(() => vi.clearAllMocks());

  test("starts all summary requests before awaiting any response", async () => {
    const requestGates = new Map<string, ReturnType<typeof Promise.withResolvers<Response>>>();
    mockFetch.mockImplementation((url) => {
      const path = new URL(url.toString()).pathname;
      const gate = Promise.withResolvers<Response>();
      requestGates.set(path, gate);
      return gate.promise;
    });

    const resultPromise = integration.getSummaryAsync();

    await vi.waitFor(() => {
      expect([...requestGates.keys()]).toEqual(["/control/stats", "/control/status", "/control/filtering/status"]);
    });

    requestGates.get("/control/stats")?.resolve(jsonResponse(stats));
    requestGates.get("/control/status")?.resolve(jsonResponse(status));
    requestGates.get("/control/filtering/status")?.resolve(jsonResponse(filteringStatus));

    await expect(resultPromise).resolves.toMatchObject({
      status: "enabled",
      adsBlockedToday: 20,
      dnsQueriesToday: 100,
      domainsBeingBlocked: 12,
    });
  });
});

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

const stats = {
  time_units: "hours",
  top_queried_domains: [],
  top_clients: [],
  top_blocked_domains: [],
  dns_queries: [40, 60],
  blocked_filtering: [5, 15],
  replaced_safebrowsing: [],
  replaced_parental: [],
  num_dns_queries: 100,
  num_blocked_filtering: 20,
  num_replaced_safebrowsing: 0,
  num_replaced_safesearch: 0,
  num_replaced_parental: 0,
  avg_processing_time: 0.01,
};

const status = {
  version: "1.0.0",
  language: "en",
  dns_addresses: ["0.0.0.0"],
  dns_port: 53,
  http_port: 3000,
  protection_enabled: true,
  dhcp_available: false,
  running: true,
};

const filteringStatus = {
  filters: [
    { url: "https://example.com/filter.txt", name: "Enabled", id: 1, rules_count: 12, enabled: true },
    { url: "https://example.com/disabled.txt", name: "Disabled", id: 2, rules_count: 50, enabled: false },
  ],
};
