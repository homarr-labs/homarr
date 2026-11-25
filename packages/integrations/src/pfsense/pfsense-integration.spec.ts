// @vitest-environment node

import { MockAgent, Response, fetch } from "undici";
import { expect, test, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { PfSenseIntegration } from "./pfsense-integration";

const createDispatcher = vi.hoisted(() => vi.fn<() => Promise<MockAgent>>());

vi.mock("@homarr/core/infrastructure/http", () => ({
  createAxiosCertificateInstanceAsync: vi.fn(),
  createCertificateAgentAsync: createDispatcher,
  createCustomCheckServerIdentity: vi.fn(),
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));
vi.mock("@homarr/core/infrastructure/certificates", () => ({
  getAllTrustedCertificatesAsync: vi.fn().mockResolvedValue([]),
  getTrustedCertificateHostnamesAsync: vi.fn().mockResolvedValue([]),
}));

const origin = "https://pfsense.test";
const apiKey = "fixture-key";
const createIntegration = () =>
  new PfSenseIntegration({
    id: "pfsense-test",
    kind: "pfsense",
    name: "pfSense",
    url: origin,
    externalUrl: null,
    decryptedSecrets: [{ kind: "apiKey", value: apiKey }],
  });

test("rejects redirects on the connection test and widget reads without contacting the destination", async () => {
  const dispatcher = new MockAgent();
  dispatcher.disableNetConnect();
  createDispatcher.mockResolvedValue(dispatcher);
  vi.mocked(fetchWithTrustedCertificatesAsync).mockImplementation((url, options) =>
    fetch(url, { ...options, dispatcher }),
  );

  const headers = { "x-api-key": apiKey };
  const server = dispatcher.get(origin);
  const otherOrigin = "https://redirect.test";
  server
    .intercept({ path: "/api/v2/system/version", headers })
    .reply(302, "", { headers: { location: otherOrigin } })
    .times(2);
  server.intercept({ path: "/api/v2/status/system", headers }).reply(200, { data: { cpu_usage: null, mem_usage: 23 } });
  server.intercept({ path: "/api/v2/status/interfaces", headers }).reply(200, { data: [] });
  dispatcher
    .get(otherOrigin)
    .intercept({ path: "/" })
    .reply(200, { data: { version: "2.9.0" } });

  try {
    const integration = createIntegration();
    await expect(integration.testConnectionAsync()).resolves.toMatchObject({ success: false });
    await expect(integration.getFirewallVersionAsync()).rejects.toThrow();
    expect(dispatcher.pendingInterceptors().map(({ origin: target }) => target)).toEqual([otherOrigin]);
  } finally {
    await dispatcher.close();
  }
});

test.each([
  [
    { cpu_usage: 0, mem_usage: null },
    { cpu: { total: 0 }, memory: null },
  ],
  [
    { cpu_usage: null, mem_usage: 23 },
    { cpu: null, memory: { used: 23, total: 100, percent: 23 } },
  ],
  [{}, { cpu: null, memory: null }],
])("preserves available metrics when pfREST returns %j", async (data, expected) => {
  vi.mocked(fetchWithTrustedCertificatesAsync).mockResolvedValue(Response.json({ data }));
  await expect(createIntegration().getFirewallUsageAsync()).resolves.toEqual(expected);
});
