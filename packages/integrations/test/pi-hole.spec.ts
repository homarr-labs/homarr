import { GenericContainer } from "testcontainers";
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
      .start();

    // We need to wait until pi hole has actually started and is ready to get requests
    await sleep(5000);

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

    // Cleanup
    await piholeContainer.stop();
  }, 20_000); // Timeout of 20 seconds
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
