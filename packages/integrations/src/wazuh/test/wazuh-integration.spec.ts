// @vitest-environment node
import { X509Certificate } from "node:crypto";
import tls from "node:tls";
import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { IntegrationSecretKind } from "@homarr/definitions";

import { toWazuhPublicError, WazuhRequestError } from "../wazuh-errors";
import { WazuhIntegration } from "../wazuh-integration";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.SECRET_ENCRYPTION_KEY = "ff3f4f7ce30e870c9630de9e5d244ffa81101a24ed0dfe5f064beb53a7e684f1";
  process.env.ENABLE_DNS_CACHING = "false";
});

const { testFetchMock, trustedFetchMock } = vi.hoisted(() => ({
  testFetchMock: vi.fn(),
  trustedFetchMock: vi.fn(),
}));

// Test connection uses undici fetch with a dispatcher built from the trusted certificates.
vi.mock("undici", async (importActual) => ({
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  ...(await importActual<typeof import("undici")>()),
  fetch: testFetchMock,
}));

vi.mock("@homarr/redis", () => ({
  getIntegrationSessionStoreKey: (integrationId: string) => `session-store:${integrationId}`,
  createGetSetChannel: () => ({
    getAsync: () => Promise.resolve(null),
    setAsync: () => Promise.resolve(),
    removeAsync: () => Promise.resolve(),
  }),
}));

vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: trustedFetchMock,
  createAxiosCertificateInstanceAsync: vi.fn().mockResolvedValue({}),
  createCertificateAgentAsync: vi.fn().mockResolvedValue({ close: vi.fn() }),
  createCustomCheckServerIdentity: vi.fn(() => () => undefined),
}));

vi.mock("@homarr/core/infrastructure/certificates", () => ({
  getAllTrustedCertificatesAsync: vi.fn().mockResolvedValue([]),
  getTrustedCertificateHostnamesAsync: vi.fn().mockResolvedValue([]),
}));

const API_URL = "https://wazuh-manager.example.com:55000";
const INDEXER_URL = "https://wazuh-indexer.example.com:9200";

const createIntegration = (
  url: string,
  secrets: Partial<Record<IntegrationSecretKind, string>> = {
    username: "wazuh-wui",
    password: "api-password",
    wazuhIndexerUrl: INDEXER_URL,
    wazuhIndexerUsername: "homarr",
    wazuhIndexerPassword: "indexer-password",
  },
) =>
  new WazuhIntegration({
    id: "wazuh",
    name: "Wazuh",
    kind: "wazuh",
    url,
    externalUrl: null,
    decryptedSecrets: Object.entries(secrets).map(([kind, value]) => ({
      kind: kind as IntegrationSecretKind,
      value,
    })),
  });

/** The error undici throws when the TLS handshake fails. */
const createTlsError = (code: string) =>
  new TypeError("fetch failed", { cause: Object.assign(new Error(`TLS failure ${code}`), { code }) });

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

const toUrl = (input: unknown) => (input instanceof URL ? input.toString() : String(input));

const respond = (url: string) => {
  if (url.includes("/security/user/authenticate")) return new Response("api-token", { status: 200 });
  if (url.includes("/agents/summary/status")) {
    return json({ data: { connection: { active: 1, disconnected: 0, never_connected: 0, pending: 0, total: 1 } } });
  }
  if (url.includes("/agents")) return json({ data: { affected_items: [], total_affected_items: 0 } });
  if (url.includes("/_search")) return json({ hits: { total: { value: 0 }, hits: [] } });
  return new Response("not found", { status: 404 });
};

const peerCertificate = new X509Certificate(tls.rootCertificates[0] ?? "");

const mockCertificateFetch = () =>
  vi.spyOn(tls, "connect").mockImplementation(((_options: tls.ConnectionOptions, callback?: () => void) => {
    queueMicrotask(() => callback?.());
    return {
      getPeerX509Certificate: () => peerCertificate,
      destroy: vi.fn(),
      once: vi.fn(),
    } as unknown as tls.TLSSocket;
  }) as unknown as typeof tls.connect);

describe("WazuhIntegration certificates", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    trustedFetchMock.mockImplementation((input: unknown) => Promise.resolve(respond(toUrl(input))));
    testFetchMock.mockImplementation((input: unknown) => Promise.resolve(respond(toUrl(input))));
  });

  test("requests the server API and the indexer with Homarr's trusted certificates", async () => {
    const integration = createIntegration(API_URL);

    await integration.getAgentsOverviewAsync();
    await integration.getRecentAlertsAsync({ minLevel: 0, limit: 5, hours: 24 });

    const urls = trustedFetchMock.mock.calls.map(([input]) => toUrl(input));
    expect(urls.some((url) => url.startsWith(`${API_URL}/agents`))).toBe(true);
    expect(urls.some((url) => url.startsWith(`${INDEXER_URL}/wazuh-alerts-*/_search`))).toBe(true);
  });

  test("test connection offers the indexer certificate when only the indexer certificate is untrusted", async () => {
    const connectSpy = mockCertificateFetch();
    testFetchMock.mockImplementation((input: unknown) => {
      const url = toUrl(input);
      if (url.startsWith(INDEXER_URL)) return Promise.reject(createTlsError("UNABLE_TO_VERIFY_LEAF_SIGNATURE"));
      return Promise.resolve(respond(url));
    });

    const result = await createIntegration(API_URL).testConnectionAsync();

    expect(result.success).toBe(false);
    if (result.success || result.error.type !== "certificate") throw new Error("Expected a certificate error");
    expect(result.error.data.requestError.reason).toBe("untrusted");
    expect(result.error.data.url).toBe(`${INDEXER_URL}/`);
    expect(connectSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "wazuh-indexer.example.com",
        servername: "wazuh-indexer.example.com",
        port: 9200,
      }),
      expect.any(Function),
    );
  });

  test("test connection offers the server API certificate when the server API certificate is untrusted", async () => {
    const connectSpy = mockCertificateFetch();
    testFetchMock.mockImplementation((input: unknown) => {
      const url = toUrl(input);
      if (url.startsWith(API_URL)) return Promise.reject(createTlsError("DEPTH_ZERO_SELF_SIGNED_CERT"));
      return Promise.resolve(respond(url));
    });

    const result = await createIntegration(API_URL).testConnectionAsync();

    expect(result.success).toBe(false);
    if (result.success || result.error.type !== "certificate") throw new Error("Expected a certificate error");
    expect(result.error.data.url).toBe(`${API_URL}/`);
    expect(connectSpy).toHaveBeenCalledWith(
      expect.objectContaining({ host: "wazuh-manager.example.com", port: 55000 }),
      expect.any(Function),
    );
  });

  test("test connection reads the certificate of an IP address without sending it as SNI", async () => {
    const connectSpy = mockCertificateFetch();
    const indexerUrl = "https://10.0.0.5:9200";
    testFetchMock.mockImplementation((input: unknown) => {
      const url = toUrl(input);
      if (url.startsWith(indexerUrl)) return Promise.reject(createTlsError("UNABLE_TO_VERIFY_LEAF_SIGNATURE"));
      return Promise.resolve(respond(url));
    });

    const result = await createIntegration(indexerUrl, {
      wazuhIndexerUsername: "homarr",
      wazuhIndexerPassword: "indexer-password",
    }).testConnectionAsync();

    expect(result.success).toBe(false);
    if (result.success || result.error.type !== "certificate") throw new Error("Expected a certificate error");
    expect(result.error.data.url).toBe(`${indexerUrl}/`);
    const [options] = connectSpy.mock.calls[0] as unknown as [tls.ConnectionOptions];
    expect(options).toMatchObject({ host: "10.0.0.5", port: 9200 });
    expect(options.servername).toBeUndefined();
  });

  test("test connection reports other indexer request errors without offering a certificate", async () => {
    const connectSpy = mockCertificateFetch();
    testFetchMock.mockImplementation((input: unknown) => {
      const url = toUrl(input);
      if (url.startsWith(INDEXER_URL)) return Promise.reject(createTlsError("ECONNREFUSED"));
      return Promise.resolve(respond(url));
    });

    const result = await createIntegration(API_URL).testConnectionAsync();

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.type).toBe("request");
    expect(connectSpy).not.toHaveBeenCalled();
  });

  test.each([
    ["DEPTH_ZERO_SELF_SIGNED_CERT", "certificate"],
    ["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "certificate"],
    ["ERR_TLS_CERT_ALTNAME_INVALID", "certificateHostname"],
    ["CERT_HAS_EXPIRED", "certificateExpired"],
    ["CERT_NOT_YET_VALID", "certificateExpired"],
  ] as const)("maps %s to the %s widget error", (code, reason) => {
    const error = WazuhRequestError.fromFetchError("indexer", createTlsError(code));

    expect(toWazuhPublicError(new Error("wrapped", { cause: error }))).toEqual({ reason, target: "indexer" });
  });
});
