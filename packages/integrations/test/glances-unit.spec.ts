// @vitest-environment node

import { describe, expect, test, vi } from "vitest";

import { createDb } from "@homarr/db/test";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { GlancesIntegration } from "../src/glances/glances-integration";

// ─── module mocks ────────────────────────────────────────────────────────────

vi.mock("@homarr/db", async (importActual) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importActual<typeof import("@homarr/db")>();
  return { ...actual, db: createDb() };
});

vi.mock("@homarr/core/infrastructure/certificates", async (importActual) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importActual<typeof import("@homarr/core/infrastructure/certificates")>();
  return {
    ...actual,
    getTrustedCertificateHostnamesAsync: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

vi.mock("../src/base/session-store", () => ({
  createSessionStore: () => ({
    async getAsync() {
      return { version: "4.0.0" };
    },
    async setAsync() {
      return;
    },
    async clearAsync() {
      return;
    },
  }),
}));

// ─── helpers ─────────────────────────────────────────────────────────────────

const baseStats = {
  cpu: { total: 10 },
  mem: { total: 8_000_000_000, used: 4_000_000_000, free: 4_000_000_000 },
  network: [{ bytes_sent_rate_per_sec: 1000, bytes_recv_rate_per_sec: 2000 }],
  fs: [{ device_name: "/dev/sda1", used: 10_000, free: 90_000, percent: 10 }],
  uptime: "1 day, 2:03:04",
  gpu: [],
};

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

// Cast lives here so call sites don't need `as never`.
function makeResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as never;
}

const integrationInput = {
  id: "test-glances",
  name: "Glances",
  url: "http://localhost:61208",
  decryptedSecrets: [],
  externalUrl: null,
};

// ─── tests ───────────────────────────────────────────────────────────────────

describe("GlancesIntegration schema", () => {
  test("parses stats when quicklook is present", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ ...baseStats, quicklook: { cpu_name: "Apple M1" } }));

    const integration = new GlancesIntegration(integrationInput);
    const result = await integration.getSystemInfoAsync();

    expect(result.cpuModelName).toBe("Apple M1");
    expect(result.cpuUtilization).toBe(10);
  });

  test("returns Unknown cpuModelName when quicklook is absent (macOS scenario)", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(baseStats));

    const integration = new GlancesIntegration(integrationInput);
    const result = await integration.getSystemInfoAsync();

    expect(result.cpuModelName).toBe("Unknown");
  });

  test("does not throw a Zod parse error when quicklook is missing", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(baseStats));

    const integration = new GlancesIntegration(integrationInput);
    await expect(integration.getSystemInfoAsync()).resolves.not.toThrow();
  });
});
