import { GenericContainer, Wait } from "testcontainers";
import { describe, expect, test } from "vitest";

import { PiHoleIntegration } from "../src";

describe("Pi-hole integration", () => {
  test("getSummaryAsync should return summary from pi-hole", async () => {
    // Arrange
    const password = "12341234";
    const apiKey = "3b1434980677dcf53fa8c4a611db3b1f0f88478790097515c0abb539102778b9";

    const piholeContainer = await new GenericContainer("pihole/pihole:latest")
      .withEnvironment({
        WEBPASSWORD: password,
      })
      .withExposedPorts(80)
      .withWaitStrategy(Wait.forLogMessage(/Pi-hole Enabled/))
      .start();

    const piHoleIntegration = new PiHoleIntegration({
      id: "1",
      decryptedSecrets: [
        {
          kind: "apiKey",
          value: apiKey,
        },
      ],
      name: "Pi hole",
      url: `http://${piholeContainer.getHost()}:${piholeContainer.getMappedPort(80)}`,
    });

    // Act
    const result = await piHoleIntegration.getSummaryAsync();

    // Assert
    expect(result.adsBlockedToday).toBe(0);
    expect(result.adsBlockedTodayPercentage).toBe(0);
    expect(result.dnsQueriesToday).toBe(0);
    expect(result.domainsBeingBlocked).toBeGreaterThan(1);

    // Cleanup
    await piholeContainer.stop();
  }, 20_000); // Timeout of 20 seconds
});
