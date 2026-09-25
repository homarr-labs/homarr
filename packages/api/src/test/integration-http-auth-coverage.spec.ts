import { describe, expect, test } from "vitest";

import { httpIntegrationKinds, integrationDefs, integrationKinds } from "@homarr/definitions/integration";
import { widgetIntegrationConfigs } from "@homarr/definitions";
import { getIntegrationHttpAuthenticationAsync } from "@homarr/integrations/factory";
import { getStatsMetrics } from "@homarr/integrations/stats";

describe("reusable HTTP integration authentication", () => {
  test("every integration declares an authentication contract", () => {
    for (const kind of integrationKinds) expect(integrationDefs[kind].httpAuth).toBeDefined();
  });

  test("only iCalendar feeds and TrueNAS are excluded from generic HTTP sources", () => {
    const available = new Set<string>(httpIntegrationKinds);
    expect(integrationKinds.filter((kind) => !available.has(kind))).toEqual(["ical", "truenas"]);
  });

  test("iCalendar feeds remain available to Calendar but not Stats", () => {
    expect(widgetIntegrationConfigs.calendar.supportedIntegrations).toContain("ical");
    expect(widgetIntegrationConfigs.stats.supportedIntegrations).not.toContain("ical");
    expect(getStatsMetrics("ical")).toEqual([]);
  });

  const declaredKinds = integrationKinds.filter((kind) => integrationDefs[kind].httpAuth.type !== "adapter");
  test.each(declaredKinds)("%s resolves each supported saved credential mode", async (kind) => {
    const definition = integrationDefs[kind];
    for (const secretKinds of definition.secretKinds) {
      if (kind === "qBittorrent" && secretKinds.join(",") === "username,password") continue;
      const authentication = await getIntegrationHttpAuthenticationAsync({
        id: `test-${kind}`,
        kind,
        name: definition.name,
        url: "http://integration.test",
        externalUrl: null,
        decryptedSecrets: secretKinds.map((secretKind) => ({ kind: secretKind, value: `test-${secretKind}` })),
      });

      expect(authentication.headers).toEqual(expect.any(Object));
      for (const [name, value] of Object.entries(authentication.headers)) {
        expect(name).not.toHaveLength(0);
        expect(value).not.toHaveLength(0);
      }
    }
  });

  test("qBittorrent keeps generic requests limited to API-key bearer auth", async () => {
    const input = {
      id: "qbittorrent",
      kind: "qBittorrent" as const,
      name: "qBittorrent",
      url: "http://integration.test",
      externalUrl: null,
    };
    await expect(
      getIntegrationHttpAuthenticationAsync({
        ...input,
        decryptedSecrets: [{ kind: "apiKey" as const, value: "test-key" }],
      }),
    ).resolves.toMatchObject({ headers: { Authorization: "Bearer test-key" } });
    await expect(
      getIntegrationHttpAuthenticationAsync({
        ...input,
        decryptedSecrets: [
          { kind: "username" as const, value: "test-user" },
          { kind: "password" as const, value: "test-password" },
        ],
      }),
    ).rejects.toThrow();
  });
});
