// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

import { createDb } from "@homarr/db/test";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { GlancesIntegration, parseGlancesCpuTempFromSensors } from "../src/glances/glances-integration";

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

// Glances answers 400 "Unknown plugin smart" when the SMART plugin is disabled (the default).
const smartDisabledResponse = {
  ok: false,
  status: 400,
  json: () => Promise.resolve({ detail: "Unknown plugin smart (available plugins: ...)" }),
} as never;

function mockGlancesFetch(statsBody: unknown, sensorsBody: unknown, smartBody?: unknown) {
  mockFetch.mockImplementation(((url: string | URL) => {
    const urlString = url.toString();
    if (urlString.endsWith("/api/4/all")) {
      return Promise.resolve(makeResponse(statsBody));
    }
    if (urlString.endsWith("/api/4/sensors")) {
      return Promise.resolve(makeResponse(sensorsBody));
    }
    if (urlString.endsWith("/api/4/smart")) {
      return Promise.resolve(smartBody === undefined ? smartDisabledResponse : makeResponse(smartBody));
    }
    return Promise.reject(new Error(`Unexpected fetch URL: ${urlString}`));
  }) as typeof fetchWithTrustedCertificatesAsync);
}

// Trimmed /api/4/smart response from Glances 4.5.7 (pySMART) with one SATA disk and one NVMe drive.
const smartStats = [
  {
    DeviceName: "nvme0 KINGSTON SA2000M81000G",
    key: "DeviceName",
    "1": {
      name: "Number of critical warnings",
      key: "criticalWarning",
      value: 0,
      flags: null,
      raw: 0,
      worst: null,
      threshold: null,
      type: null,
      updated: null,
      when_failed: null,
    },
    "2": {
      name: "Temperature (°C)",
      key: "_temperature",
      value: 30,
      flags: null,
      raw: 30,
      worst: null,
      threshold: null,
      type: null,
      updated: null,
      when_failed: null,
    },
    "22": {
      name: "Errors",
      key: "errors",
      value: [],
      flags: null,
      raw: [],
      worst: null,
      threshold: null,
      type: null,
      updated: null,
      when_failed: null,
    },
  },
  {
    DeviceName: "sda WDC WD30EFRX-68EUZN0",
    key: "DeviceName",
    "5": {
      name: "Reallocated_Sector_Ct",
      key: "Reallocated_Sector_Ct",
      value: "200",
      flags: "0x0033",
      raw: "0",
      worst: "200",
      threshold: "140",
      type: "Pre-fail",
      updated: "Always",
      when_failed: "-",
    },
    "194": {
      name: "Temperature_Celsius",
      key: "Temperature_Celsius",
      value: "115",
      flags: "0x0022",
      raw: "35 (Min/Max 20/45)",
      worst: "106",
      threshold: "000",
      type: "Old_age",
      updated: "Always",
      when_failed: "-",
    },
  },
];

const integrationInput = {
  id: "test-glances",
  name: "Glances",
  url: "http://localhost:61208",
  decryptedSecrets: [],
  externalUrl: null,
};

// ─── tests ───────────────────────────────────────────────────────────────────

describe("GlancesIntegration schema", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  test("parses stats when quicklook is present", async () => {
    mockGlancesFetch({ ...baseStats, quicklook: { cpu_name: "Apple M1" } }, []);

    const integration = new GlancesIntegration(integrationInput);
    const result = await integration.getSystemInfoAsync();

    expect(result.cpuModelName).toBe("Apple M1");
    expect(result.cpuUtilization).toBe(10);
  });

  test("returns Unknown cpuModelName when quicklook is absent (macOS scenario)", async () => {
    mockGlancesFetch(baseStats, []);

    const integration = new GlancesIntegration(integrationInput);
    const result = await integration.getSystemInfoAsync();

    expect(result.cpuModelName).toBe("Unknown");
  });

  test("does not throw a Zod parse error when quicklook is missing", async () => {
    mockGlancesFetch(baseStats, []);

    const integration = new GlancesIntegration(integrationInput);
    await expect(integration.getSystemInfoAsync()).resolves.not.toThrow();
  });

  test("reads CPU temperature from sensors", async () => {
    mockGlancesFetch(baseStats, [
      { label: "CPU", unit: "C", value: 58, type: "temperature_core" },
      { label: "Core 0", unit: "C", value: 54, type: "temperature_core" },
    ]);

    const integration = new GlancesIntegration(integrationInput);
    const result = await integration.getSystemInfoAsync();

    expect(result.cpuTemp).toBe(58);
  });
});

describe("GlancesIntegration SMART", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  test("maps a SATA disk with temperature from Temperature_Celsius", async () => {
    mockGlancesFetch(baseStats, [], smartStats);

    const integration = new GlancesIntegration(integrationInput);
    const result = await integration.getSystemInfoAsync();

    expect(result.smart).toContainEqual({
      deviceName: "/dev/sda",
      temperature: 35,
      overallStatus: "PASSED",
      healthy: true,
    });
  });

  test("maps an NVMe drive by controller name with temperature from _temperature", async () => {
    mockGlancesFetch(baseStats, [], smartStats);

    const integration = new GlancesIntegration(integrationInput);
    const result = await integration.getSystemInfoAsync();

    expect(result.smart).toContainEqual({
      deviceName: "/dev/nvme0",
      temperature: 30,
      overallStatus: "PASSED",
      healthy: true,
    });
  });

  test("reports FAILED when an ATA attribute has failed or NVMe has a critical warning", async () => {
    const [nvme, sata] = smartStats;
    mockGlancesFetch(
      baseStats,
      [],
      [
        { ...nvme, "1": { ...nvme?.["1"], value: 4, raw: 4 } },
        { ...sata, "5": { ...sata?.["5"], when_failed: "FAILING_NOW" } },
      ],
    );

    const integration = new GlancesIntegration(integrationInput);
    const result = await integration.getSystemInfoAsync();

    expect(result.smart).toEqual([
      expect.objectContaining({ deviceName: "/dev/nvme0", overallStatus: "FAILED", healthy: false }),
      expect.objectContaining({ deviceName: "/dev/sda", overallStatus: "FAILED", healthy: false }),
    ]);
  });

  test("returns no SMART data when the plugin is disabled, keeping the other stats", async () => {
    mockGlancesFetch(baseStats, []);

    const integration = new GlancesIntegration(integrationInput);
    const result = await integration.getSystemInfoAsync();

    expect(result.smart).toEqual([]);
    expect(result.cpuUtilization).toBe(10);
    expect(result.memUsedInBytes).toBe(4_000_000_000);
    expect(result.fileSystem).toHaveLength(1);
    expect(result.gpu).toEqual([]);
  });

  test("returns no SMART data when the payload is malformed", async () => {
    mockGlancesFetch(baseStats, [], { unexpected: true });

    const integration = new GlancesIntegration(integrationInput);
    await expect(integration.getSystemInfoAsync()).resolves.toMatchObject({ smart: [] });
  });
});

describe("parseGlancesCpuTempFromSensors", () => {
  test("prefers CPU label over core sensors", () => {
    const result = parseGlancesCpuTempFromSensors([
      { label: "Core 0", value: 54, type: "temperature_core" },
      { label: "CPU", value: 58, type: "temperature_core" },
    ]);

    expect(result).toBe(58);
  });

  test("falls back to Package id 0", () => {
    const result = parseGlancesCpuTempFromSensors([
      { label: "Core 0", value: 54, type: "temperature_core" },
      { label: "Package id 0", value: 62, type: "temperature_core" },
    ]);

    expect(result).toBe(62);
  });
});
