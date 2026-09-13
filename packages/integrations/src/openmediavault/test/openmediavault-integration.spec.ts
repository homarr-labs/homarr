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

vi.mock("../../base/session-store", () => ({
  createSessionStore: () => ({
    getAsync: vi.fn().mockResolvedValue(null),
    setAsync: vi.fn().mockResolvedValue(undefined),
    clearAsync: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationSecret } from "../../base/types";
import { OpenMediaVaultIntegration } from "../openmediavault-integration";

const testUrl = "https://openmediavault.example.com";
const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

interface RpcRequest {
  service: string;
  method: string;
  params: Record<string, unknown>;
}

const createIntegration = (secrets: IntegrationSecret[] = []) =>
  new OpenMediaVaultIntegration({
    id: "test-openmediavault",
    name: "Test OpenMediaVault",
    url: testUrl,
    externalUrl: null,
    decryptedSecrets: secrets.length
      ? secrets
      : [
          { kind: "username", value: "homarr" },
          { kind: "password", value: "secret-password" },
        ],
  });

describe("OpenMediaVaultIntegration.listStorageVolumesAsync", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  test("returns mounted file systems as scoped storage volume options", async () => {
    const requests: RpcRequest[] = [];
    mockFetch.mockImplementation((_url, options) => {
      const request = JSON.parse(String(options?.body)) as RpcRequest;
      requests.push(request);

      if (request.service === "session" && request.method === "login") {
        return Promise.resolve(
          new Response(JSON.stringify({ response: { sessionid: "test-session-id" } }), { status: 200 }),
        ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
      }

      if (request.service === "filesystemmgmt" && request.method === "enumerateMountedFilesystems") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              response: [
                { devicename: "sda1", used: "3.13 GiB", available: 26_853_056_512, percentage: 12 },
                { devicename: "sdb1", used: "396.24 GiB", available: "1542365618176", percentage: 22 },
              ],
            }),
            { status: 200 },
          ),
        ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
      }

      throw new Error(`Unexpected RPC request: ${request.service}.${request.method}`);
    });

    const integration = createIntegration();
    const volumes = await integration.listStorageVolumesAsync();

    expect(volumes).toEqual([
      { value: "test-openmediavault:sda1", label: "sda1 (Test OpenMediaVault)" },
      { value: "test-openmediavault:sdb1", label: "sdb1 (Test OpenMediaVault)" },
    ]);
    expect(requests).toEqual([
      {
        service: "session",
        method: "login",
        params: { username: "homarr", password: "secret-password" },
      },
      {
        service: "filesystemmgmt",
        method: "enumerateMountedFilesystems",
        params: { includeroot: true },
      },
    ]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1]?.[1]?.headers).toMatchObject({
      "X-OPENMEDIAVAULT-SESSIONID": "test-session-id",
    });
  });
});
