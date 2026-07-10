// @vitest-environment node

import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { z } from "zod";

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

vi.mock("../../base/session-store", () => ({
  createSessionStore: () => ({
    getAsync: vi.fn().mockResolvedValue(null),
    setAsync: vi.fn().mockResolvedValue(undefined),
    clearAsync: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { IntegrationResponseError } from "../../base/errors/http/integration-response-error";

import type { IntegrationSecret } from "../../base/types";
import { SynologyIntegration } from "../synology-integration";
import type { synologyStorageV2DataSchema, synologyUtilizationDataSchema } from "../synology-types";

const TEST_URL = "https://synology.example.com:5001";
const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const createIntegration = (secrets: IntegrationSecret[] = []) =>
  new SynologyIntegration({
    id: "test-synology",
    name: "Test Synology",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets: secrets.length
      ? secrets
      : [
          { kind: "username", value: "homarr" },
          { kind: "password", value: "secret-password" },
        ],
  });

const apiDefinitions = {
  "SYNO.API.Auth": { path: "auth.cgi", maxVersion: 7 },
  "SYNO.API.Info": { path: "query.cgi", maxVersion: 1 },
  "SYNO.Core.System": { path: "entry.cgi", maxVersion: 3 },
  "SYNO.Core.System.Utilization": { path: "entry.cgi", maxVersion: 1 },
  "SYNO.Storage.CGI.Storage": { path: "entry.cgi", maxVersion: 1 },
  "SYNO.Storage.CGI.Smart": { path: "entry.cgi", maxVersion: 1 },
  "SYNO.Core.System.Status": { path: "entry.cgi", maxVersion: 1 },
  "SYNO.Core.Upgrade": { path: "entry.cgi", maxVersion: 1 },
  "SYNO.Core.Upgrade.Server": { path: "entry.cgi", maxVersion: 1 },
};

const systemInfoResponse = {
  success: true as const,
  data: {
    up_time: "48:30:15",
    version_string: "DSM 7.3-12345",
    model: "DS920+",
    sys_temp: 42,
  },
};

const utilizationResponse = {
  success: true,
  data: {
    cpu: {
      user_load: 12,
      system_load: 8,
      "1min_load": 10,
      "5min_load": 14,
      "15min_load": 9,
    },
    memory: {
      real_usage: 35,
      total_real: 8 * 1024 * 1024,
      avail_real: Math.round(8 * 1024 * 1024 * 0.65),
      cached: 900_000,
    },
    network: [
      { device: "total", rx: 4096, tx: 8192 },
      { device: "eth0", rx: 4096, tx: 8192 },
    ],
  },
};

const storageV2Response = {
  success: true,
  data: {
    volumes: [
      {
        id: "volume_1",
        display_name: "Data Volume 1",
        size: { total: 10_000_000_000, used: 4_000_000_000 },
        status: "normal",
      },
      {
        id: "volume_2",
        display_name: "Data Volume 2",
        size: { total: 20_000_000_000, used: 5_000_000_000 },
        status: "degraded",
      },
    ],
  },
};

const storageLoadInfoResponse = {
  success: true,
  data: {
    disks: [
      {
        id: "sda",
        display_name: "Drive 1",
        temp: 38,
        status: "normal",
        volume_id: "volume_1",
      },
      {
        id: "sdb",
        display_name: "Drive 2",
        temp: 44,
        status: "normal",
        volume_id: "volume_2",
      },
    ],
  },
};

const smartInfoResponse = {
  success: true,
  data: {
    disks: [
      {
        disk_id: "sda",
        name: "Drive 1",
        overall_status: "normal",
        temp: 39,
      },
    ],
  },
};

const systemStatusResponse = {
  success: true,
  data: {
    reboot_required: true,
  },
};

const upgradeStatusResponse = {
  success: true,
  data: {
    reboot_required: false,
  },
};

const upgradeCheckResponse = {
  success: true,
  data: {
    available: true,
    update_count: 2,
  },
};

const toUrlString = (url: unknown): string => String(url);

const getApiFromUrl = (url: string) => {
  const parsedUrl = new URL(url);
  return parsedUrl.searchParams.get("api");
};

const getMethodFromUrl = (url: string) => {
  const parsedUrl = new URL(url);
  return parsedUrl.searchParams.get("method");
};

const getTypeFromUrl = (url: string) => {
  const parsedUrl = new URL(url);
  return parsedUrl.searchParams.get("type");
};

const mockSuccessfulFlow = (options?: {
  skipStorageV2?: boolean;
  skipOptional?: boolean;
  systemInfo?: {
    success: boolean;
    data: Record<string, unknown>;
  };
  utilization?: { success: boolean; data: z.input<typeof synologyUtilizationDataSchema> };
  storageV2?: { success: boolean; data: z.input<typeof synologyStorageV2DataSchema> };
  storageLoadInfo?: typeof storageLoadInfoResponse;
}) => {
  mockFetch.mockImplementation((url) => {
    const urlString = toUrlString(url);
    const apiName = getApiFromUrl(urlString);
    const method = getMethodFromUrl(urlString);
    const type = getTypeFromUrl(urlString);

    if (apiName === "SYNO.API.Info" && method === "query") {
      const query = new URL(urlString).searchParams.get("query") ?? "SYNO.API.Auth";
      const definition = apiDefinitions[query as keyof typeof apiDefinitions];
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: { [query]: definition } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
    }

    if (apiName === "SYNO.API.Auth" && method === "login") {
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: { sid: "test-session-id" } }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": "id=test-session-id; Path=/; HttpOnly",
          },
        }),
      ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
    }

    if (apiName === "SYNO.Core.System" && method === "info" && type === "storage_v2") {
      if (options?.skipStorageV2) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: false, error: { code: 103 } }), { status: 200 }),
        ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
      }
      return Promise.resolve(
        new Response(JSON.stringify(options?.storageV2 ?? storageV2Response), { status: 200 }),
      ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
    }

    if (apiName === "SYNO.Core.System" && method === "info" && type === "storage") {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              vol_info: [
                {
                  name: "volume_1",
                  used_size: 4_000_000_000,
                  total_size: 10_000_000_000,
                  status: "normal",
                },
              ],
            },
          }),
          { status: 200 },
        ),
      ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
    }

    if (apiName === "SYNO.Core.System" && method === "info" && !type) {
      return Promise.resolve(
        new Response(JSON.stringify(options?.systemInfo ?? systemInfoResponse), { status: 200 }),
      ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
    }

    if (apiName === "SYNO.Core.System.Utilization" && method === "get") {
      return Promise.resolve(
        new Response(JSON.stringify(options?.utilization ?? utilizationResponse), { status: 200 }),
      ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
    }

    if (options?.skipOptional) {
      return Promise.resolve(
        new Response(JSON.stringify({ success: false, error: { code: 105 } }), { status: 200 }),
      ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
    }

    if (apiName === "SYNO.Storage.CGI.Storage" && method === "load_info") {
      return Promise.resolve(
        new Response(JSON.stringify(options?.storageLoadInfo ?? storageLoadInfoResponse), { status: 200 }),
      ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
    }

    if (apiName === "SYNO.Storage.CGI.Smart" && method === "get_smart_info") {
      return Promise.resolve(new Response(JSON.stringify(smartInfoResponse), { status: 200 })) as unknown as ReturnType<
        typeof fetchWithTrustedCertificatesAsync
      >;
    }

    if (apiName === "SYNO.Core.System.Status" && method === "get") {
      return Promise.resolve(
        new Response(JSON.stringify(systemStatusResponse), { status: 200 }),
      ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
    }

    if (apiName === "SYNO.Core.Upgrade" && method === "status") {
      return Promise.resolve(
        new Response(JSON.stringify(upgradeStatusResponse), { status: 200 }),
      ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
    }

    if (apiName === "SYNO.Core.Upgrade.Server" && method === "check") {
      return Promise.resolve(
        new Response(JSON.stringify(upgradeCheckResponse), { status: 200 }),
      ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
    }

    return Promise.resolve(
      new Response(JSON.stringify({ success: false, error: { code: 102 } }), { status: 200 }),
    ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
  });
};

beforeEach(() => {
  mockFetch.mockReset();
});

describe("SynologyIntegration.getSystemInfoAsync", () => {
  test("maps all supported health monitoring fields", async () => {
    mockSuccessfulFlow();
    const integration = createIntegration();
    const result = await integration.getSystemInfoAsync();

    expect(result.version).toBe("DSM 7.3-12345");
    expect(result.cpuModelName).toBe("DS920+");
    expect(result.cpuUtilization).toBe(20);
    expect(result.memUsedInBytes).toBe(Math.round((8 * 1024 * 1024 * 1024 * 35) / 100));
    expect(result.memAvailableInBytes).toBe(8 * 1024 * 1024 * 1024 - Math.round((8 * 1024 * 1024 * 1024 * 35) / 100));
    expect(result.uptime).toBe(48 * 3600 + 30 * 60 + 15);
    expect(result.cpuTemp).toBe(42);
    expect(result.network).toEqual({ up: 8192, down: 4096 });
    expect(result.loadAverage).toEqual({ "1min": 10, "5min": 14, "15min": 9 });
    expect(result.rebootRequired).toBe(true);
    expect(result.availablePkgUpdates).toBe(2);
    expect(result.gpu).toEqual([]);
    expect(result.fileSystem).toHaveLength(2);
    expect(result.fileSystem[0]).toEqual({
      deviceName: "volume_1",
      used: "4000000000",
      available: "6000000000",
      percentage: 40,
    });
    expect(result.smart).toEqual([
      {
        deviceName: "volume_1",
        healthy: true,
        overallStatus: "normal",
        temperature: 39,
      },
      {
        deviceName: "volume_2",
        healthy: false,
        overallStatus: "degraded",
        temperature: 44,
      },
    ]);
  });

  test("picks worst disk status when volume status is missing", async () => {
    mockSuccessfulFlow({
      storageV2: {
        success: true,
        data: {
          volumes: [
            {
              id: "volume_1",
              display_name: "Data Volume 1",
              size: { total: 10_000_000_000, used: 4_000_000_000 },
            },
          ],
        },
      },
      storageLoadInfo: {
        success: true,
        data: {
          disks: [
            {
              id: "sda",
              display_name: "Drive 1",
              temp: 38,
              status: "normal",
              volume_id: "volume_1",
            },
            {
              id: "sdb",
              display_name: "Drive 2",
              temp: 40,
              status: "degraded",
              volume_id: "volume_1",
            },
          ],
        },
      },
    });
    const integration = createIntegration();
    const result = await integration.getSystemInfoAsync();

    expect(result.smart).toEqual([
      {
        deviceName: "volume_1",
        healthy: false,
        overallStatus: "degraded",
        temperature: 40,
      },
    ]);
  });

  test("falls back to legacy storage info when storage_v2 is unavailable", async () => {
    mockSuccessfulFlow({ skipStorageV2: true });
    const integration = createIntegration();
    const result = await integration.getSystemInfoAsync();

    expect(result.fileSystem).toHaveLength(1);
    expect(result.fileSystem[0]?.deviceName).toBe("volume_1");
  });

  test("continues when optional tier-2 calls fail", async () => {
    mockSuccessfulFlow({ skipOptional: true });
    const integration = createIntegration();
    const result = await integration.getSystemInfoAsync();

    expect(result.cpuUtilization).toBe(20);
    expect(result.rebootRequired).toBe(false);
    expect(result.availablePkgUpdates).toBe(0);
    expect(result.smart.every((entry) => entry.temperature === null)).toBe(true);
  });

  test("converts memory values from KiB to bytes", async () => {
    mockSuccessfulFlow({
      utilization: {
        ...utilizationResponse,
        data: {
          ...utilizationResponse.data,
          memory: {
            real_usage: 17,
            total_real: 16_351_532,
            avail_real: 426_568,
          },
        },
      },
    });
    const integration = createIntegration();
    const result = await integration.getSystemInfoAsync();

    const totalBytes = 16_351_532 * 1024;
    expect(result.memUsedInBytes).toBe(Math.round((totalBytes * 17) / 100));
    expect(result.memAvailableInBytes).toBe(totalBytes - Math.round((totalBytes * 17) / 100));
  });

  test("caps cpu utilization at 100 when user and system load exceed 100", async () => {
    mockSuccessfulFlow({
      utilization: {
        ...utilizationResponse,
        data: {
          ...utilizationResponse.data,
          cpu: {
            ...utilizationResponse.data.cpu,
            user_load: 80,
            system_load: 30,
          },
        },
      },
    });
    const integration = createIntegration();
    const result = await integration.getSystemInfoAsync();

    expect(result.cpuUtilization).toBe(100);
  });

  test("returns undefined cpu temperature when sensor is absent", async () => {
    mockSuccessfulFlow({
      systemInfo: {
        success: true,
        data: {
          up_time: "01:00:00",
          version_string: "DSM 7.3-12345",
          model: "DS920+",
        },
      },
    });
    const integration = createIntegration();
    const result = await integration.getSystemInfoAsync();
    expect(result.cpuTemp).toBeUndefined();
  });
});

describe("SynologyIntegration.listStorageVolumesAsync", () => {
  test("returns auto-detected volume names", async () => {
    mockSuccessfulFlow();
    const integration = createIntegration();
    const volumes = await integration.listStorageVolumesAsync();

    expect(volumes).toEqual([
      { value: "test-synology:volume_1", label: "Data Volume 1 (Test Synology)" },
      { value: "test-synology:volume_2", label: "Data Volume 2 (Test Synology)" },
    ]);
  });
});

describe("SynologyIntegration authentication", () => {
  test("rejects two-factor authentication during login", async () => {
    mockFetch.mockImplementation((url) => {
      const urlString = toUrlString(url);
      const apiName = getApiFromUrl(urlString);
      const method = getMethodFromUrl(urlString);

      if (apiName === "SYNO.API.Info" && method === "query") {
        const query = new URL(urlString).searchParams.get("query") ?? "SYNO.API.Auth";
        const definition = apiDefinitions[query as keyof typeof apiDefinitions];
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: { [query]: definition } }), { status: 200 }),
        ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
      }

      if (apiName === "SYNO.API.Auth" && method === "login") {
        return Promise.resolve(
          new Response(JSON.stringify({ success: false, error: { code: 403 } }), { status: 200 }),
        ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
      }

      return Promise.resolve(new Response("{}", { status: 500 })) as unknown as ReturnType<
        typeof fetchWithTrustedCertificatesAsync
      >;
    });

    const integration = createIntegration();
    await expect(integration.getSystemInfoAsync()).rejects.toThrow();
  });

  test("does not leak credentials in login error URLs", async () => {
    mockFetch.mockImplementation((url, init) => {
      const urlString = toUrlString(url);
      const apiName = getApiFromUrl(urlString);
      const method = getMethodFromUrl(urlString);

      if (apiName === "SYNO.API.Info" && method === "query") {
        const query = new URL(urlString).searchParams.get("query") ?? "SYNO.API.Auth";
        const definition = apiDefinitions[query as keyof typeof apiDefinitions];
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: { [query]: definition } }), { status: 200 }),
        ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
      }

      if (apiName === "SYNO.API.Auth" && method === "login") {
        expect(init?.method).toBe("POST");
        expect(init?.body).toContain("account=homarr");
        expect(init?.body).toContain("passwd=secret-password");
        expect(urlString).not.toContain("account=");
        expect(urlString).not.toContain("passwd=");

        return Promise.resolve(
          new Response(JSON.stringify({ success: false, error: { code: 403 } }), { status: 200 }),
        ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
      }

      return Promise.resolve(new Response("{}", { status: 500 })) as unknown as ReturnType<
        typeof fetchWithTrustedCertificatesAsync
      >;
    });

    const integration = createIntegration();

    try {
      await integration.getSystemInfoAsync();
      expect.unreachable("Expected login to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(IntegrationResponseError);
      const responseError = (error as IntegrationResponseError).cause;
      expect(responseError).toBeInstanceOf(ResponseError);
      expect(responseError.url).not.toContain("secret-password");
      expect(responseError.url).not.toContain("passwd=");
      expect(responseError.url).not.toContain("account=homarr");
    }
  });
});
