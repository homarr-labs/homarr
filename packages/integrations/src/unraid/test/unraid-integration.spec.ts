// @vitest-environment node

import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.CI = "true";
  process.env.NODE_ENV = "test";
  process.env.SECRET_ENCRYPTION_KEY = "0".repeat(64);
});

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationSecret } from "../../base/types";
import { UnraidIntegration } from "../unraid-integration";

const TEST_URL = "https://unraid.example.com";
const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const createIntegration = (secrets: IntegrationSecret[] = []) =>
  new UnraidIntegration({
    id: "test-unraid",
    name: "Test Unraid",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets: secrets.length ? secrets : [{ kind: "apiKey", value: "secret-api-key" }],
  });

const graphqlResponse = (data: unknown) => ({
  data,
});

const mockGraphQL = (data: unknown) => {
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify(graphqlResponse(data)), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
};

const GiB = 1024 * 1024 * 1024;

const systemInfoResponse = {
  metrics: {
    cpu: {
      percentTotal: 10,
      cpus: [{ percentTotal: 10 }, { percentTotal: 10 }],
    },
    memory: {
      available: 20 * GiB,
      used: 12 * GiB,
      free: 10 * GiB,
      total: 32 * GiB,
      percentTotal: 37.5,
    },
  },
  array: {
    state: "STARTED",
    capacity: {
      disks: {
        free: 100,
        total: 200,
        used: 100,
      },
    },
    disks: [
      {
        name: "disk1",
        size: 200 * 1024 * 1024,
        fsFree: 100 * 1024 * 1024,
        fsUsed: 100 * 1024 * 1024,
        status: "DISK_OK",
        temp: 38,
      },
    ],
  },
  info: {
    devices: {
      network: [
        {
          speed: 1000,
          dhcp: true,
          model: "eth0",
        },
      ],
    },
    os: {
      platform: "linux",
      distro: "Unraid",
      release: "7.3.2",
      uptime: new Date().toISOString(),
    },
    cpu: {
      manufacturer: "Intel",
      brand: "Intel Core i5",
      cores: 4,
      threads: 8,
    },
  },
};

describe("UnraidIntegration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("computes used memory from metrics.memory.total - available instead of layout sizes", async () => {
    mockGraphQL(systemInfoResponse);
    const integration = createIntegration();

    const result = await integration.getSystemInfoAsync();

    expect(result.memUsedInBytes).toBe(12 * GiB);
    expect(result.memAvailableInBytes).toBe(20 * GiB);
  });

  test("never reports negative used memory when available exceeds total", async () => {
    mockGraphQL({
      ...systemInfoResponse,
      metrics: {
        ...systemInfoResponse.metrics,
        memory: {
          ...systemInfoResponse.metrics.memory,
          available: 40 * GiB,
          total: 32 * GiB,
        },
      },
    });
    const integration = createIntegration();

    const result = await integration.getSystemInfoAsync();

    expect(result.memUsedInBytes).toBe(0);
    expect(result.memAvailableInBytes).toBe(32 * GiB);
  });
});
