import type { StartedTestContainer } from "testcontainers";
import { GenericContainer, Wait } from "testcontainers";
import { afterEach, describe, expect, test } from "vitest";

import { PiHoleIntegrationV5, PiHoleIntegrationV6 } from "../src";

const DEFAULT_PASSWORD = "12341234";
const DEFAULT_API_KEY = "3b1434980677dcf53fa8c4a611db3b1f0f88478790097515c0abb539102778b9"; // Some hash generated from password

describe("Pi-hole v5 integration", () => {
  test("getSummaryAsync should return summary from pi-hole", async () => {
    // Arrange
    const piholeContainer = await createPiHoleV5Container(DEFAULT_PASSWORD).start();
    const piHoleIntegration = createPiHoleIntegrationV5(piholeContainer, DEFAULT_API_KEY);

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
    const piholeContainer = await createPiHoleV5Container(DEFAULT_PASSWORD).start();
    const piHoleIntegration = createPiHoleIntegrationV5(piholeContainer, DEFAULT_API_KEY);

    // Act
    const actAsync = async () => await piHoleIntegration.testConnectionAsync();

    // Assert
    await expect(actAsync()).resolves.not.toThrow();

    // Cleanup
    await piholeContainer.stop();
  }, 20_000); // Timeout of 20 seconds

  test("testConnectionAsync should throw with wrong credentials", async () => {
    // Arrange
    const piholeContainer = await createPiHoleV5Container(DEFAULT_PASSWORD).start();
    const piHoleIntegration = createPiHoleIntegrationV5(piholeContainer, "wrong-api-key");

    // Act
    const actAsync = async () => await piHoleIntegration.testConnectionAsync();

    // Assert
    await expect(actAsync()).rejects.toThrow();

    // Cleanup
    await piholeContainer.stop();
  }, 20_000); // Timeout of 20 seconds
});

describe("Pi-hole v6 integration", () => {
  afterEach(() => {
    PiHoleIntegrationV6.clearActiveSessionIds();
  });

  test("getSummaryAsync should return summary from pi-hole", async () => {
    // Arrange
    const piholeContainer = await createPiHoleV6Container(DEFAULT_PASSWORD).start();
    const piHoleIntegration = createPiHoleIntegrationV6(piholeContainer, DEFAULT_PASSWORD);

    // Act
    const result = await piHoleIntegration.getSummaryAsync();

    // Assert
    expect(result.status).toBe("enabled");
    expect(result.adsBlockedToday).toBe(0);
    expect(result.adsBlockedTodayPercentage).toBe(0);
    expect(result.dnsQueriesToday).toBe(0);
    expect(result.domainsBeingBlocked).toBeGreaterThanOrEqual(0);

    // Cleanup
    await piholeContainer.stop();
  }, 20_000); // Timeout of 20 seconds

  test("enableAsync should enable pi-hole", async () => {
    // Arrange
    const piholeContainer = await createPiHoleV6Container(DEFAULT_PASSWORD).start();
    const piHoleIntegration = createPiHoleIntegrationV6(piholeContainer, DEFAULT_PASSWORD);

    // Disable pi-hole
    await piholeContainer.exec(["pihole", "disable"]);

    // Act
    await piHoleIntegration.enableAsync();

    // Assert
    const status = await piHoleIntegration.getDnsBlockingStatusAsync();
    expect(status.blocking).toContain("enabled");
  }, 20_000); // Timeout of 20 seconds

  test("disableAsync should disable pi-hole", async () => {
    // Arrange
    const piholeContainer = await createPiHoleV6Container(DEFAULT_PASSWORD).start();
    const piHoleIntegration = createPiHoleIntegrationV6(piholeContainer, DEFAULT_PASSWORD);

    // Act
    await piHoleIntegration.disableAsync();

    // Assert
    const status = await piHoleIntegration.getDnsBlockingStatusAsync();
    expect(status.blocking).toBe("disabled");
    expect(status.timer).toBe(null);
  }, 20_000); // Timeout of 20 seconds

  test("disableAsync should disable pi-hole with timer", async () => {
    // Arrange
    const timer = 10 * 60; // 10 minutes
    const piholeContainer = await createPiHoleV6Container(DEFAULT_PASSWORD).start();
    const piHoleIntegration = createPiHoleIntegrationV6(piholeContainer, DEFAULT_PASSWORD);

    // Act
    await piHoleIntegration.disableAsync(timer);

    // Assert
    const status = await piHoleIntegration.getDnsBlockingStatusAsync();
    expect(status.blocking).toBe("disabled");
    expect(status.timer).toBeGreaterThan(timer - 10);
  }, 20_000); // Timeout of 20 seconds

  test("testConnectionAsync should not throw", async () => {
    // Arrange
    const piholeContainer = await createPiHoleV6Container(DEFAULT_PASSWORD).start();
    const piHoleIntegration = createPiHoleIntegrationV6(piholeContainer, DEFAULT_PASSWORD);

    // Act
    const actAsync = async () => await piHoleIntegration.testConnectionAsync();

    // Assert
    await expect(actAsync()).resolves.not.toThrow();

    // Cleanup
    await piholeContainer.stop();
  }, 20_000); // Timeout of 20 seconds

  test("testConnectionAsync should throw with wrong credentials", async () => {
    // Arrange
    const piholeContainer = await createPiHoleV6Container(DEFAULT_PASSWORD).start();
    const piHoleIntegration = createPiHoleIntegrationV6(piholeContainer, "wrong-api-key");

    // Act
    const actAsync = async () => await piHoleIntegration.testConnectionAsync();

    // Assert
    await expect(actAsync()).rejects.toThrow();

    // Cleanup
    await piholeContainer.stop();
  }, 20_000); // Timeout of 20 seconds
});

const createPiHoleV5Container = (password: string) => {
  return new GenericContainer("pihole/pihole:2024.07.0") // v5
    .withEnvironment({
      WEBPASSWORD: password,
    })
    .withExposedPorts(80)
    .withWaitStrategy(Wait.forLogMessage("Pi-hole Enabled"));
};

const createPiHoleIntegrationV5 = (container: StartedTestContainer, apiKey: string) => {
  return new PiHoleIntegrationV5({
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

const createPiHoleV6Container = (password: string) => {
  return new GenericContainer("pihole/pihole:latest")
    .withEnvironment({
      FTLCONF_webserver_api_password: password,
    })
    .withExposedPorts(80)
    .withWaitStrategy(Wait.forHttp("/admin", 80));
};

const createPiHoleIntegrationV6 = (container: StartedTestContainer, apiKey: string) => {
  return new PiHoleIntegrationV6({
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
