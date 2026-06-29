import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { createDb } from "@homarr/db/test";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../../base/integration";
import { GluetunIntegration } from "../gluetun-integration";
import {
  gluetunDnsStatusSchema,
  gluetunPublicIpSchema,
  gluetunVpnSettingsSchema,
  gluetunVpnStatusSchema,
} from "../gluetun-types";

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
const DNS_STATUS_PAYLOAD = { status: "running" };
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
const VPN_SETTINGS_PAYLOAD = {
  type: "wireguard",
  provider: {
    name: "mullvad",
    server_selection: {
      vpn: "wireguard",
      countries: ["Germany"],
      categories: null,
      regions: null,
      cities: ["Berlin"],
      isps: null,
      names: null,
      numbers: null,
      hostnames: ["de-ber-wg-001"],
      owned_only: false,
      free_only: false,
      premium_only: false,
      stream_only: false,
      multi_hop_only: false,
      port_forward_only: false,
      secure_core_only: false,
      tor_only: false,
      openvpn: {
        config_file_path: "",
        protocol: "udp",
        endpoint_ip: "",
        custom_port: 0,
        pia_encryption_preset: "",
      },
      wireguard: {
        endpoint_ip: "203.0.113.1",
        endpoint_port: 51820,
        public_key: "pubkey",
      },
    },
    port_forwarding: {
      enabled: false,
      provider: "mullvad",
      status_file_path: "",
      up_command: "",
      down_command: "",
      listening_port: 0,
      username: "",
      password: "",
    },
  },
  openvpn: {
    version: "",
    user: "",
    password: "",
    config_file_path: "",
    ciphers: null,
    auth: "",
    cert: "",
    key: "",
    encrypted_key: "",
    key_passphrase: "",
    pia_encryption_preset: "",
    mssfix: 0,
    interface: "tun0",
    process_user: "",
    verbosity: 0,
    flags: null,
  },
  wireguard: {
    private_key: "",
    pre_shared_key: "",
    addresses: ["10.0.0.2/32"],
    allowed_ips: ["0.0.0.0/0"],
    interface: "wg0",
    persistent_keep_alive_interval: 25,
    mtu: 1420,
    implementation: "auto",
  },
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
      case "/v1/dns/status":
        return Promise.resolve(jsonResponse(DNS_STATUS_PAYLOAD));
      case "/v1/publicip/ip":
        return Promise.resolve(jsonResponse(PUBLIC_IP_PAYLOAD));
      case "/v1/vpn/settings":
        return Promise.resolve(jsonResponse(VPN_SETTINGS_PAYLOAD));
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

  test("maps the four upstream responses into a flat VPN summary", async () => {
    setupHappyPath();

    const result = await createIntegrationWithApiKey().getSummaryAsync();

    expect(result).toEqual({
      vpnStatus: "running",
      dnsStatus: "running",
      publicIp: "203.0.113.42",
      country: "Germany",
      city: "Berlin",
      vpnProvider: {
        protocol: "wireguard",
        provider: "mullvad",
      },
    });
  });

  test("hits each of the four control endpoints exactly once", async () => {
    setupHappyPath();

    await createIntegrationWithApiKey().getSummaryAsync();

    const calledPaths = mockFetch.mock.calls.map(([url]) => {
      const urlString = typeof url === "string" ? url : url.toString();
      return new URL(urlString).pathname;
    });

    expect(calledPaths).toHaveLength(4);
    expect(new Set(calledPaths)).toEqual(
      new Set(["/v1/vpn/status", "/v1/dns/status", "/v1/publicip/ip", "/v1/vpn/settings"]),
    );
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

  test("dns status schema mirrors vpn status schema", () => {
    expect(gluetunDnsStatusSchema.parse({ status: "stopped" })).toEqual({ status: "stopped" });
    expect(() => gluetunDnsStatusSchema.parse({ status: 42 })).toThrow();
  });

  test("public ip schema parses the full payload", () => {
    expect(gluetunPublicIpSchema.parse(PUBLIC_IP_PAYLOAD)).toEqual(PUBLIC_IP_PAYLOAD);
  });

  test("public ip schema rejects a missing required field", () => {
    const { city: _city, ...partial } = PUBLIC_IP_PAYLOAD;
    expect(() => gluetunPublicIpSchema.parse(partial)).toThrow();
  });

  test("vpn settings schema parses a wireguard payload", () => {
    const parsed = gluetunVpnSettingsSchema.parse(VPN_SETTINGS_PAYLOAD);
    expect(parsed.type).toBe("wireguard");
    expect(parsed.provider.name).toBe("mullvad");
  });

  test("vpn settings schema accepts nullable server-selection arrays", () => {
    const payloadWithNulls = {
      ...VPN_SETTINGS_PAYLOAD,
      provider: {
        ...VPN_SETTINGS_PAYLOAD.provider,
        server_selection: {
          ...VPN_SETTINGS_PAYLOAD.provider.server_selection,
          countries: null,
          cities: null,
        },
      },
    };

    expect(() => gluetunVpnSettingsSchema.parse(payloadWithNulls)).not.toThrow();
  });

  test("vpn settings schema rejects a non-string type", () => {
    expect(() => gluetunVpnSettingsSchema.parse({ ...VPN_SETTINGS_PAYLOAD, type: 1 })).toThrow();
  });
});
