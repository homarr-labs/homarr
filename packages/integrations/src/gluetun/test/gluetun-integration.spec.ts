import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { createDb } from "@homarr/db/test";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../../base/integration";
import { GluetunIntegration } from "../gluetun-integration";
import { gluetunPublicIpSchema, gluetunVpnStatusSchema } from "../gluetun-types";

vi.mock("@homarr/db", async (importActual) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importActual<typeof import("@homarr/db")>();
  return {
    ...actual,
    db: createDb(),
  };
});

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const TEST_URL = "https://gluetun.example.com";
const TEST_API_KEY = "test-api-key";
const TEST_USERNAME = "user";
const TEST_PASSWORD = "p@ss";

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

type FetchResponse = Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>;

const VPN_STATUS_PAYLOAD = { status: "running" };
const PUBLIC_IP_PAYLOAD = {
  public_ip: "203.0.113.42",
  region: "Europe",
  country: "Germany",
  city: "Berlin",
  location: "52.5200,13.4050",
  organization: "Example Org",
  postal_code: "10115",
  timezone: "Europe/Berlin",
};
const jsonResponse = (body: unknown, init: ResponseInit = { status: 200 }): FetchResponse =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json" },
  }) as unknown as FetchResponse;

const setupHappyPath = () => {
  mockFetch.mockImplementation((url) => {
    const urlString = typeof url === "string" ? url : url.toString();
    const { pathname } = new URL(urlString);

    switch (pathname) {
      case "/v1/vpn/status":
        return Promise.resolve(jsonResponse(VPN_STATUS_PAYLOAD));
      case "/v1/publicip/ip":
        return Promise.resolve(jsonResponse(PUBLIC_IP_PAYLOAD));
      default:
        return Promise.resolve(jsonResponse({ error: "not found" }, { status: 404 }));
    }
  });
};

const createIntegrationWithApiKey = () =>
  new GluetunIntegration({
    id: "gluetun-1",
    name: "Gluetun",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets: [{ kind: "apiKey", value: TEST_API_KEY }],
  });

const createIntegrationWithBasicAuth = () =>
  new GluetunIntegration({
    id: "gluetun-2",
    name: "Gluetun",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets: [
      { kind: "username", value: TEST_USERNAME },
      { kind: "password", value: TEST_PASSWORD },
    ],
  });

describe("GluetunIntegration.getSummaryAsync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("maps status and public IP into a flat VPN summary", async () => {
    setupHappyPath();

    const result = await createIntegrationWithApiKey().getSummaryAsync();

    expect(result).toEqual({
      vpnStatus: "running",
      publicIp: "203.0.113.42",
      country: "Germany",
      city: "Berlin",
    });
  });

  test("hits only the two required control endpoints exactly once", async () => {
    setupHappyPath();

    await createIntegrationWithApiKey().getSummaryAsync();

    const calledPaths = mockFetch.mock.calls.map(([url]) => {
      const urlString = typeof url === "string" ? url : url.toString();
      return new URL(urlString).pathname;
    });

    expect(calledPaths).toHaveLength(2);
    expect(new Set(calledPaths)).toEqual(new Set(["/v1/vpn/status", "/v1/publicip/ip"]));
  });

  test("sends X-API-Key header when an apiKey secret is configured", async () => {
    setupHappyPath();

    await createIntegrationWithApiKey().getSummaryAsync();

    for (const [, init] of mockFetch.mock.calls) {
      const headers = (init?.headers ?? {}) as Record<string, string>;
      expect(headers["X-API-Key"]).toBe(TEST_API_KEY);
      expect(headers.Authorization).toBeUndefined();
    }
  });

  test("sends Basic auth header when username/password are configured", async () => {
    setupHappyPath();

    await createIntegrationWithBasicAuth().getSummaryAsync();

    const expected = `Basic ${btoa(`${TEST_USERNAME}:${TEST_PASSWORD}`)}`;
    for (const [, init] of mockFetch.mock.calls) {
      const headers = (init?.headers ?? {}) as Record<string, string>;
      expect(headers.Authorization).toBe(expected);
      expect(headers["X-API-Key"]).toBeUndefined();
    }
  });

  test("throws when any upstream endpoint returns a non-OK status", async () => {
    mockFetch.mockImplementation((url) => {
      const urlString = typeof url === "string" ? url : url.toString();
      const { pathname } = new URL(urlString);

      if (pathname === "/v1/publicip/ip") {
        return Promise.resolve(jsonResponse({ error: "unauthorized" }, { status: 401 }));
      }
      return Promise.resolve(jsonResponse(VPN_STATUS_PAYLOAD));
    });

    await expect(createIntegrationWithApiKey().getSummaryAsync()).rejects.toThrow();
  });

  test("throws when an upstream payload fails schema validation", async () => {
    mockFetch.mockImplementation((url) => {
      const urlString = typeof url === "string" ? url : url.toString();
      const { pathname } = new URL(urlString);

      if (pathname === "/v1/publicip/ip") {
        return Promise.resolve(jsonResponse({ public_ip: 123 }));
      }
      return Promise.resolve(jsonResponse(VPN_STATUS_PAYLOAD));
    });

    await expect(createIntegrationWithApiKey().getSummaryAsync()).rejects.toThrow();
  });
});

describe("GluetunIntegration testing endpoint", () => {
  type TestingFn = (input: IntegrationTestingInput) => Promise<{ success: boolean }>;

  const invokeTesting = (integration: GluetunIntegration, input: IntegrationTestingInput) => {
    const testing = (integration as unknown as { testingAsync: TestingFn }).testingAsync.bind(integration);
    return testing(input);
  };

  const makeInput = (response: Response): IntegrationTestingInput =>
    ({
      fetchAsync: vi.fn().mockResolvedValue(response),
    }) as unknown as IntegrationTestingInput;

  test("returns success when /v1/vpn/status responds 200", async () => {
    const input = makeInput(new Response(JSON.stringify(VPN_STATUS_PAYLOAD), { status: 200 }));

    const result = await invokeTesting(createIntegrationWithApiKey(), input);

    expect(result.success).toBe(true);
  });

  test("returns a status-code failure when /v1/vpn/status responds non-OK", async () => {
    const input = makeInput(new Response("unauthorized", { status: 401 }));

    const result = await invokeTesting(createIntegrationWithApiKey(), input);

    expect(result.success).toBe(false);
  });

  test("passes the api-key header through to fetchAsync", async () => {
    const response = new Response(JSON.stringify(VPN_STATUS_PAYLOAD), { status: 200 });
    const input = makeInput(response);

    await invokeTesting(createIntegrationWithApiKey(), input);

    const fetchAsyncMock = vi.mocked(input.fetchAsync);
    const init = fetchAsyncMock.mock.calls[0]?.[1];
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers["X-API-Key"]).toBe(TEST_API_KEY);
  });

  test("passes the Basic auth header through to fetchAsync when username/password are configured", async () => {
    const response = new Response(JSON.stringify(VPN_STATUS_PAYLOAD), { status: 200 });
    const input = makeInput(response);

    await invokeTesting(createIntegrationWithBasicAuth(), input);

    const fetchAsyncMock = vi.mocked(input.fetchAsync);
    const init = fetchAsyncMock.mock.calls[0]?.[1];
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const expected = `Basic ${btoa(`${TEST_USERNAME}:${TEST_PASSWORD}`)}`;
    expect(headers.Authorization).toBe(expected);
    expect(headers["X-API-Key"]).toBeUndefined();
  });
});

describe("gluetun schemas", () => {
  test("vpn status schema accepts a string status", () => {
    expect(gluetunVpnStatusSchema.parse({ status: "running" })).toEqual({ status: "running" });
  });

  test("vpn status schema rejects a missing status", () => {
    expect(() => gluetunVpnStatusSchema.parse({})).toThrow();
  });

  test("public ip schema parses the full payload", () => {
    expect(gluetunPublicIpSchema.parse(PUBLIC_IP_PAYLOAD)).toEqual(PUBLIC_IP_PAYLOAD);
  });

  test("public ip schema accepts absent optional metadata", () => {
    expect(gluetunPublicIpSchema.parse({ public_ip: "203.0.113.42" })).toEqual({ public_ip: "203.0.113.42" });
  });
});
