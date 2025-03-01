import type { StartedTestContainer } from "testcontainers";
import { GenericContainer, Wait } from "testcontainers";
import { describe, expect, test } from "vitest";

import { PiHoleIntegration } from "../src";

const DEFAULT_PASSWORD = "12341234";
const DEFAULT_API_KEY = "3b1434980677dcf53fa8c4a611db3b1f0f88478790097515c0abb539102778b9"; // Some hash generated from password

describe("Pi-hole integration", () => {
  test("getSummaryAsync should return summary from pi-hole", async () => {
    // Arrange
    const piholeContainer = await createPiHoleContainer(DEFAULT_PASSWORD).start();
    const piHoleIntegration = createPiHoleIntegration(piholeContainer, DEFAULT_API_KEY);

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

  test("testConnectionAsync should not throw", async () => {
    // Arrange
    const piholeContainer = await createPiHoleContainer(DEFAULT_PASSWORD).start();
    const piHoleIntegration = createPiHoleIntegration(piholeContainer, DEFAULT_API_KEY);

    // Act
    const actAsync = async () => await piHoleIntegration.testConnectionAsync();

    // Assert
    await expect(actAsync()).resolves.not.toThrow();

    // Cleanup
    await piholeContainer.stop();
  }, 20_000); // Timeout of 20 seconds

  test("testConnectionAsync should throw with wrong credentials", async () => {
    // Arrange
    const piholeContainer = await createPiHoleContainer(DEFAULT_PASSWORD).start();
    const piHoleIntegration = createPiHoleIntegration(piholeContainer, "wrong-api-key");

    // Act
    const actAsync = async () => await piHoleIntegration.testConnectionAsync();

    // Assert
    await expect(actAsync()).rejects.toThrow();

    // Cleanup
    await piholeContainer.stop();
  }, 20_000); // Timeout of 20 seconds
});

const createPiHoleContainer = (password: string) => {
  return new GenericContainer("pihole/pihole:2024.07.0") // v5
    .withEnvironment({
      WEBPASSWORD: password,
    })
    .withExposedPorts(80)
    .withWaitStrategy(Wait.forLogMessage("Pi-hole Enabled"));
};

const createPiHoleIntegration = (container: StartedTestContainer, apiKey: string) => {
  return new PiHoleIntegration({
    id: "1",
    decryptedSecrets: [
      {
        kind: "apiKey",
        value: apiKey,
      },
    ],
    name: "Pi hole",
    url: `http://${container.getHost()}:${container.getMappedPort(80)}`,
  });
};
