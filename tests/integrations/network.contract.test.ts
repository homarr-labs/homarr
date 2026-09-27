import { describe, expect, test } from "vitest";

import { createIntegrationAsync } from "@homarr/integrations/factory";

import gluetunOpenvpn from "../fixtures/network/gluetun-openvpn.json";
import gluetunWireguard from "../fixtures/network/gluetun-wireguard.json";
import wudContainers from "../fixtures/network/wud-containers.json";
import { startHttpService } from "../support/http-service";
import type { HttpRoute } from "../support/http-service";

const basicHeaders = { authorization: "Basic dXNlcjpwQHNz" };
const basicSecrets = [
  { kind: "username" as const, value: "user" },
  { kind: "password" as const, value: "p@ss" },
];
const apiKeyHeaders = { "x-api-key": "contract-api-key" };
const apiKeySecrets = [{ kind: "apiKey" as const, value: "contract-api-key" }];

function gluetunRoutes(
  payload: typeof gluetunWireguard | typeof gluetunOpenvpn,
  headers: Record<string, string>,
  settingsResponse: HttpRoute["response"] = { body: payload.settings },
): HttpRoute[] {
  return [
    { method: "GET", path: "/vpn/v1/vpn/status", headers, response: { body: payload.vpnStatus } },
    { method: "GET", path: "/vpn/v1/dns/status", headers, response: { body: payload.dnsStatus } },
    { method: "GET", path: "/vpn/v1/publicip/ip", headers, response: { body: payload.publicIp } },
    { method: "GET", path: "/vpn/v1/vpn/settings", headers, response: settingsResponse },
  ];
}

describe("network integration HTTP contracts", () => {
  test("WUD connects behind a subpath with Basic auth and returns the complete update list", async () => {
    const route: HttpRoute = {
      method: "GET",
      path: "/updates/api/containers",
      headers: basicHeaders,
      response: { body: wudContainers },
    };
    const service = await startHttpService([route, route]);
    try {
      const integration = await createIntegrationAsync({
        id: "contract-wud",
        kind: "wud",
        name: "WUD contract",
        url: `${service.origin}/updates/`,
        externalUrl: null,
        decryptedSecrets: basicSecrets,
      });

      expect(await integration.testConnectionAsync()).toEqual({ success: true });
      expect(await integration.getStatsAsync()).toEqual({
        totalContainers: 3,
        updatesAvailable: 2,
        updates: [
          {
            id: "1",
            name: "Home Assistant",
            currentVersion: "2023.12.0",
            newVersion: "2024.1.0",
            link: "https://github.com/home-assistant/core/releases/tag/2024.1.0",
          },
          { id: "3", name: "grafana", currentVersion: "10.0.0", newVersion: "10.1.0", link: null },
        ],
      });
    } finally {
      try {
        await service.assertComplete();
      } finally {
        await service.close();
      }
    }
  });

  test("WUD distinguishes upstream HTTP failures from invalid JSON and invalid container data", async () => {
    const failures = [
      {
        response: { status: 503, body: { error: "unavailable" } },
        expected: { name: "IntegrationResponseError", cause: { statusCode: 503 } },
      },
      { response: { body: "{" }, expected: { name: "IntegrationParseError" } },
      {
        response: { body: [{ id: "broken", name: "missing-update-flag" }] },
        expected: { name: "IntegrationParseError" },
      },
    ];
    for (const failure of failures) {
      const service = await startHttpService([
        { method: "GET", path: "/updates/api/containers", headers: basicHeaders, response: failure.response },
      ]);
      try {
        const integration = await createIntegrationAsync({
          id: "contract-wud-failure",
          kind: "wud",
          name: "WUD failure contract",
          url: `${service.origin}/updates`,
          externalUrl: null,
          decryptedSecrets: basicSecrets,
        });
        await expect(integration.getStatsAsync()).rejects.toMatchObject(failure.expected);
      } finally {
        try {
          await service.assertComplete();
        } finally {
          await service.close();
        }
      }
    }
  });

  test("Gluetun connects with an API key and maps every VPN summary field behind a subpath", async () => {
    const service = await startHttpService([
      {
        method: "GET",
        path: "/vpn/v1/vpn/status",
        headers: apiKeyHeaders,
        response: { body: gluetunWireguard.vpnStatus },
      },
      ...gluetunRoutes(gluetunWireguard, apiKeyHeaders),
    ]);
    try {
      const integration = await createIntegrationAsync({
        id: "contract-gluetun-key",
        kind: "gluetun",
        name: "Gluetun API-key contract",
        url: `${service.origin}/vpn/`,
        externalUrl: null,
        decryptedSecrets: apiKeySecrets,
      });
      expect(await integration.testConnectionAsync()).toEqual({ success: true });
      expect(await integration.getSummaryAsync()).toEqual({
        vpnStatus: "running",
        dnsStatus: "stopped",
        publicIp: "203.0.113.42",
        country: "Germany",
        city: "Berlin",
        vpnProvider: { protocol: "wireguard", provider: "mullvad" },
      });
    } finally {
      try {
        await service.assertComplete();
      } finally {
        await service.close();
      }
    }
  });

  test("Gluetun Basic auth accepts nullable custom OpenVPN settings and preserves the summary", async () => {
    const service = await startHttpService(gluetunRoutes(gluetunOpenvpn, basicHeaders));
    try {
      const integration = await createIntegrationAsync({
        id: "contract-gluetun-basic",
        kind: "gluetun",
        name: "Gluetun Basic contract",
        url: `${service.origin}/vpn`,
        externalUrl: null,
        decryptedSecrets: basicSecrets,
      });
      expect(await integration.getSummaryAsync()).toEqual({
        vpnStatus: "running",
        dnsStatus: "running",
        publicIp: "203.0.113.42",
        country: "Germany",
        city: "Berlin",
        vpnProvider: { protocol: "openvpn", provider: "custom" },
      });
    } finally {
      try {
        await service.assertComplete();
      } finally {
        await service.close();
      }
    }
  });

  test("Gluetun rejects an HTTP failure or malformed settings while all sibling endpoints remain valid", async () => {
    const failures = [
      {
        response: { status: 503, body: { error: "unavailable" } },
        expected: { name: "IntegrationResponseError", cause: { statusCode: 503 } },
      },
      { response: { body: { ...gluetunWireguard.settings, type: 42 } }, expected: { name: "IntegrationParseError" } },
    ];
    for (const failure of failures) {
      const service = await startHttpService(gluetunRoutes(gluetunWireguard, apiKeyHeaders, failure.response));
      try {
        const integration = await createIntegrationAsync({
          id: "contract-gluetun-failure",
          kind: "gluetun",
          name: "Gluetun failure contract",
          url: `${service.origin}/vpn`,
          externalUrl: null,
          decryptedSecrets: apiKeySecrets,
        });
        await expect(integration.getSummaryAsync()).rejects.toMatchObject(failure.expected);
      } finally {
        try {
          await service.assertComplete();
        } finally {
          await service.close();
        }
      }
    }
  });
});
