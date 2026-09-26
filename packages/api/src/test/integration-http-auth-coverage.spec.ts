import { describe, expect, test } from "vitest";

import { httpIntegrationKinds, integrationKinds } from "@homarr/definitions/integration";
import { widgetIntegrationConfigs } from "@homarr/definitions";
import { getIntegrationHttpAuthenticationAsync } from "@homarr/integrations/factory";
import { getStatsMetrics } from "@homarr/integrations/stats";

describe("reusable HTTP integration authentication", () => {
  test("only iCalendar feeds and TrueNAS are excluded from generic HTTP sources", () => {
    const available = new Set<string>(httpIntegrationKinds);
    expect(integrationKinds.filter((kind) => !available.has(kind))).toEqual(["ical", "truenas"]);
  });

  test("iCalendar feeds remain available to Calendar but not Stats", () => {
    expect(widgetIntegrationConfigs.calendar.supportedIntegrations).toContain("ical");
    expect(widgetIntegrationConfigs.stats.supportedIntegrations).not.toContain("ical");
    expect(getStatsMetrics("ical")).toEqual([]);
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
