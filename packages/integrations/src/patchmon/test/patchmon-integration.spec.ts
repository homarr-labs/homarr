// @vitest-environment node
import { ParseError } from "@homarr/common/server";
import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.SECRET_ENCRYPTION_KEY = "ff3f4f7ce30e870c9630de9e5d244ffa81101a24ed0dfe5f064beb53a7e684f1";
});

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { IntegrationParseError } from "../../base/errors/parse/integration-parse-error";
import type { IntegrationSecret } from "../../base/types";
import { PatchMonIntegration } from "../patchmon-integration";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const TEST_URL = "https://patchmon.example.com";
const TEST_API_KEY = "test-api-key";
const TEST_API_SECRET = "test-api-secret";

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const sampleStatsResponse = {
  total_hosts: 42,
  hosts_needing_updates: 15,
  security_updates: 23,
  up_to_date_hosts: 27,
  hosts_with_security_updates: 8,
  recent_updates_24h: 34,
  total_outdated_packages: 156,
  total_repos: 12,
  last_updated: "2025-10-11T12:34:56.789Z",
  os_distribution: [
    { name: "Debian", count: 12, os_type: "linux", os_version: "12" },
    { name: "Ubuntu", count: 20, os_type: "linux", os_version: "22.04" },
    { name: "Rocky Linux", count: 10, os_type: "linux", os_version: "9" },
  ],
};

const createIntegration = (decryptedSecrets: IntegrationSecret[] = []) =>
  new PatchMonIntegration({
    id: "test-patchmon",
    name: "Test PatchMon",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets:
      decryptedSecrets.length > 0
        ? decryptedSecrets
        : [
            { kind: "patchmonApiKey", value: TEST_API_KEY },
            { kind: "patchmonApiSecret", value: TEST_API_SECRET },
          ],
  });

beforeEach(() => {
  mockFetch.mockReset();
});

describe("PatchMonIntegration getStatsAsync", () => {
  test("maps API response fields to camelCase stats", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(sampleStatsResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
    );

    const stats = await createIntegration().getStatsAsync();

    expect(stats).toStrictEqual({
      totalHosts: 42,
      hostsNeedingUpdates: 15,
      securityUpdates: 23,
      upToDateHosts: 27,
      hostsWithSecurityUpdates: 8,
      recentUpdates24h: 34,
      totalOutdatedPackages: 156,
      totalRepos: 12,
      lastUpdated: "2025-10-11T12:34:56.789Z",
      osDistribution: [
        { name: "Ubuntu", count: 20, osType: "linux", osVersion: "22.04" },
        { name: "Debian", count: 12, osType: "linux", osVersion: "12" },
        { name: "Rocky Linux", count: 10, osType: "linux", osVersion: "9" },
      ],
    });
  });

  test("defaults os distribution to empty array when absent", async () => {
    const { os_distribution: _osDistribution, ...responseWithoutOs } = sampleStatsResponse;
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(responseWithoutOs), {
        status: 200,
        headers: { "content-type": "application/json" },
      }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
    );

    const stats = await createIntegration().getStatsAsync();

    expect(stats.osDistribution).toStrictEqual([]);
  });

  test("throws ParseError when API response is not valid JSON", async () => {
    mockFetch.mockResolvedValue(
      new Response("not-json", {
        status: 200,
        headers: { "content-type": "application/json" },
      }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
    );

    await expect(createIntegration().getStatsAsync()).rejects.toSatisfy((error) => {
      if (!(error instanceof IntegrationParseError)) return false;

      const cause = error.cause;
      return cause instanceof ParseError && cause.message.includes("Invalid PatchMon stats response");
    });
  });

  test("throws ParseError when API response does not match schema", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ invalid: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
    );

    await expect(createIntegration().getStatsAsync()).rejects.toSatisfy((error) => {
      if (!(error instanceof IntegrationParseError)) return false;

      const cause = error.cause;
      return cause instanceof ParseError && cause.message.includes("Invalid PatchMon stats response");
    });
  });

  test("throws when API returns an error", async () => {
    mockFetch.mockResolvedValue(
      new Response("Unauthorized", {
        status: 401,
        headers: { "content-type": "text/plain" },
      }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
    );

    await expect(createIntegration().getStatsAsync()).rejects.toThrow();
  });
});

describe("PatchMonIntegration authentication", () => {
  test("sends a Basic auth header with api key and secret", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(sampleStatsResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      }) as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
    );

    await createIntegration().getStatsAsync();

    const expected = `Basic ${Buffer.from(`${TEST_API_KEY}:${TEST_API_SECRET}`).toString("base64")}`;
    const [url, requestInit] = mockFetch.mock.calls[0] ?? [];
    expect(String(url)).toContain("/api/v1/gethomepage/stats");
    expect(requestInit?.headers).toMatchObject({ Authorization: expected });
    expect(requestInit?.timeout).toBe(10_000);
  });
});
