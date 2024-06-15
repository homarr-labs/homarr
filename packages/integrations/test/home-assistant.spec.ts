import type { StartedTestContainer } from "testcontainers";
import { GenericContainer, Wait } from "testcontainers";
import { describe, expect, test } from "vitest";

import { HomeAssistantIntegration, IntegrationTestConnectionError } from "../src";

const DEFAULT_API_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkNjQwY2VjNDFjOGU0NGM5YmRlNWQ4ZmFjMjUzYWViZiIsImlhdCI6MTcxODQ3MTE1MSwiZXhwIjoyMDMzODMxMTUxfQ.uQCZ5FZTokipa6N27DtFhLHkwYEXU1LZr0fsVTryL2Q";

describe("Home Assistant integration", () => {
  test("Test connection should work", async () => {
    // Arrange
    const startedContainer = await prepareHomeAssistantContainerAsync();
    const homeAssistantIntegration = createHomeAssistantIntegration(startedContainer);

    // Act
    const actAsync = async () => await homeAssistantIntegration.testConnectionAsync();

    // Assert
    await expect(actAsync()).resolves.not.toThrow();

    // Cleanup
    await startedContainer.stop();
  }, 20_000); // Timeout of 20 seconds
  test("Test connection should fail with wrong credentials", async () => {
    // Arrange
    const startedContainer = await prepareHomeAssistantContainerAsync();
    const homeAssistantIntegration = createHomeAssistantIntegration(startedContainer, "wrong-api-key");

    // Act
    const actAsync = async () => await homeAssistantIntegration.testConnectionAsync();

    // Assert
    await expect(actAsync()).rejects.toThrow(IntegrationTestConnectionError);

    // Cleanup
    await startedContainer.stop();
  }, 20_000); // Timeout of 20 seconds
});

const prepareHomeAssistantContainerAsync = async () => {
  const homeAssistantContainer = createHomeAssistantContainer();
  const startedContainer = await homeAssistantContainer.start();

  await startedContainer.exec(["unzip", "-o", "/tmp/config.zip", "-d", "/config"]);
  await startedContainer.restart();
  return startedContainer;
};

const createHomeAssistantContainer = () => {
  return new GenericContainer("ghcr.io/home-assistant/home-assistant:stable")
    .withCopyFilesToContainer([
      {
        source: __dirname + "/volumes/home-assistant-config.zip",
        target: "/tmp/config.zip",
      },
    ])
    .withPrivilegedMode()
    .withExposedPorts(8123)
    .withWaitStrategy(Wait.forHttp("/", 8123));
};

const createHomeAssistantIntegration = (container: StartedTestContainer, apiKeyOverride?: string) => {
  return new HomeAssistantIntegration({
    id: "1",
    decryptedSecrets: [
      {
        kind: "apiKey",
        value: apiKeyOverride ?? DEFAULT_API_KEY,
      },
    ],
    name: "Home assistant",
    url: `http://${container.getHost()}:${container.getMappedPort(8123)}`,
  });
};
