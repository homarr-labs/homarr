// @vitest-environment node

import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
});

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { GluetunIntegration } from "../gluetun-integration";

vi.mock("@homarr/core/infrastructure/http", () => ({ fetchWithTrustedCertificatesAsync: vi.fn() }));

const fetchMock = vi.mocked(fetchWithTrustedCertificatesAsync);
const integration = new GluetunIntegration({
  id: "private-vpn",
  kind: "gluetun",
  name: "Private VPN",
  url: "https://gluetun.example.com",
  externalUrl: null,
  decryptedSecrets: [{ kind: "apiKey", value: "fixture-control-key" }],
});

function controlResponses(status: unknown, publicIp: unknown) {
  fetchMock.mockImplementation(async (url) => {
    switch (new URL(url.toString()).pathname) {
      case "/v1/vpn/status":
        return Response.json(status);
      case "/v1/publicip/ip":
        return Response.json(publicIp);
      default:
        return new Response(null, { status: 403 });
    }
  });
}

describe("Gluetun summary with the private read-only control role", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  test("reads useful native data without requesting provider secrets or DNS grants", async () => {
    controlResponses({ status: "running" }, { public_ip: "203.0.113.42", country: "Germany" });
    await expect(integration.getSummaryAsync()).resolves.toEqual({
      vpnStatus: "running",
      publicIp: "203.0.113.42",
      country: "Germany",
      city: undefined,
    });
    expect(fetchMock.mock.calls.map(([url]) => new URL(url.toString()).pathname)).toEqual([
      "/v1/vpn/status",
      "/v1/publicip/ip",
    ]);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init?.headers).toEqual({ "X-API-Key": "fixture-control-key" });
    }
  });

  test.each(["stopped", "starting", "stopping", "crashed"])(
    "preserves %s without fabricating a public IP",
    async (status) => {
      controlResponses({ status }, { public_ip: "" });
      await expect(integration.getSummaryAsync()).resolves.toMatchObject({ vpnStatus: status, publicIp: "" });
    },
  );

  test.each([
    [{ status: "running" }, { public_ip: "not-an-ip" }],
    [{ status: "running" }, { public_ip: 123 }],
    [{ status: "running" }, { public_ip: "203.0.113.42", country: 123 }],
    [{ status: "running" }, {}],
    [{ status: "unexpected" }, { public_ip: "" }],
    [{}, { public_ip: "" }],
  ])("rejects malformed supplied control data %#", async (status, publicIp) => {
    controlResponses(status, publicIp);
    await expect(integration.getSummaryAsync()).rejects.toThrow();
  });

  test("retains authentication failure instead of reporting disconnected success", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    await expect(integration.getSummaryAsync()).rejects.toThrow();
  });
});
