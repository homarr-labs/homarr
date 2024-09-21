import { join } from "path";
import type { StartedTestContainer } from "testcontainers";
import { GenericContainer, getContainerRuntimeClient, ImageName, Wait } from "testcontainers";
import { beforeAll, describe, expect, test } from "vitest";
import { NzbGetIntegration } from "../src/download-client/nzbget/nzbget-integration";

const username = "nzbget";
const password = "tegbzn6789";
const IMAGE_NAME = "linuxserver/nzbget:latest";

describe("Nzbget integration", () => {
  beforeAll(async () => {
    const containerRuntimeClient = await getContainerRuntimeClient();
    await containerRuntimeClient.image.pull(ImageName.fromString(IMAGE_NAME));
  }, 100_000);

  test("Test connection should work", async () => {
    // Arrange
    const startedContainer = await createNzbGetContainer().start();
    const nzbGetIntegration = createNzbGetIntegration(startedContainer, username, password);

    // Act
    const actAsync = async () => await nzbGetIntegration.testConnectionAsync();

    // Assert
    await expect(actAsync()).resolves.not.toThrow();

    // Cleanup
    await startedContainer.stop();
  }, 20_000);

  test("Test connection should fail with wrong credentials", async () => {
    // Arrange
    const startedContainer = await createNzbGetContainer().start();
    const nzbGetIntegration = createNzbGetIntegration(startedContainer, "wrong-user", "wrong-password");

    // Act
    const actAsync = async () => await nzbGetIntegration.testConnectionAsync();

    // Assert
    await expect(actAsync()).rejects.toThrow();

    // Cleanup
    await startedContainer.stop();
  }, 20_000); // Timeout of 20 seconds

  test("pauseQueueAsync should work", async () => {
    // Arrange
    const startedContainer = await createNzbGetContainer().start();
    const nzbGetIntegration = createNzbGetIntegration(startedContainer, username, password);

    // Acts
    const actAsync = async () => await nzbGetIntegration.pauseQueueAsync();
    const getAsync = async () => await nzbGetIntegration.getClientJobsAndStatusAsync();

    // Assert
    await expect(actAsync()).resolves.not.toThrow();
    await expect(getAsync()).resolves.toMatchObject({ status: { paused: true } });

    // Cleanup
    await startedContainer.stop();
  }, 20_000); // Timeout of 20 seconds

  test("resumeQueueAsync should work", async () => {
    // Arrange
    const startedContainer = await createNzbGetContainer().start();
    const nzbGetIntegration = createNzbGetIntegration(startedContainer, username, password);
    await nzbGetIntegration.pauseQueueAsync();

    // Acts
    const actAsync = async () => await nzbGetIntegration.resumeQueueAsync();
    const getAsync = async () => await nzbGetIntegration.getClientJobsAndStatusAsync();

    // Assert
    await expect(actAsync()).resolves.not.toThrow();
    await expect(getAsync()).resolves.toMatchObject({
      status: { paused: false },
    });

    // Cleanup
    await startedContainer.stop();
  }, 20_000); // Timeout of 20 seconds

  test("Items should be empty", async () => {
    // Arrange
    const startedContainer = await createNzbGetContainer().start();
    const nzbGetIntegration = createNzbGetIntegration(startedContainer, username, password);

    // Act
    const getAsync = async () => await nzbGetIntegration.getClientJobsAndStatusAsync();

    // Assert
    await expect(getAsync()).resolves.not.toThrow();
    await expect(getAsync()).resolves.toMatchObject({
      items: [],
    });

    // Cleanup
    await startedContainer.stop();
  }, 20_000); // Timeout of 20 seconds

  test("1 Items should exist after adding one", async () => {
    // Arrange
    const startedContainer = await createNzbGetContainer().start();
    const nzbGetIntegration = createNzbGetIntegration(startedContainer, username, password);
    await nzbGetAddItemAsync(startedContainer, username, password, nzbGetIntegration);

    // Act
    const getAsync = async () => await nzbGetIntegration.getClientJobsAndStatusAsync();

    // Assert
    await expect(getAsync()).resolves.not.toThrow();
    expect((await getAsync()).items).toHaveLength(1);

    // Cleanup
    await startedContainer.stop();
  }, 20_000); // Timeout of 20 seconds

  test("Delete item should result in empty items", async () => {
    // Arrange
    const startedContainer = await createNzbGetContainer().start();
    const nzbGetIntegration = createNzbGetIntegration(startedContainer, username, password);
    const item = await nzbGetAddItemAsync(startedContainer, username, password, nzbGetIntegration);

    // Act
    const getAsync = async () => await nzbGetIntegration.getClientJobsAndStatusAsync();
    const actAsync = async () => await nzbGetIntegration.deleteItemAsync(item, true);

    // Assert
    await expect(actAsync()).resolves.not.toThrow();
    await expect(getAsync()).resolves.toMatchObject({ items: [] });

    // Cleanup
    await startedContainer.stop();
  }, 20_000); // Timeout of 20 seconds*/
});

const createNzbGetContainer = () => {
  return new GenericContainer(IMAGE_NAME)
    .withExposedPorts(6789)
    .withEnvironment({ PUID: "0", PGID: "0" })
    .withWaitStrategy(Wait.forLogMessage("[ls.io-init] done."));
};

const createNzbGetIntegration = (container: StartedTestContainer, username: string, password: string) => {
  return new NzbGetIntegration({
    id: "1",
    decryptedSecrets: [
      {
        kind: "username",
        value: username,
      },
      {
        kind: "password",
        value: password,
      },
    ],
    name: "NzbGet",
    url: `http://${container.getHost()}:${container.getMappedPort(6789)}`,
  });
};

const nzbGetAddItemAsync = async (
  container: StartedTestContainer,
  username: string,
  password: string,
  integration: NzbGetIntegration,
) => {
  // Add nzb file in the watch folder
  await container.copyFilesToContainer([
    {
      source: join(__dirname, "/volumes/usenet/test_download_100MB.nzb"),
      target: "/downloads/nzb/test_download_100MB.nzb",
    },
  ]);
  // Trigger scanning of the watch folder (Only available way to add an item except "append" which is too complex and unnecessary)
  await fetch(`http://${container.getHost()}:${container.getMappedPort(6789)}/${username}:${password}/jsonrpc`, {
    method: "POST",
    body: JSON.stringify({ method: "scan" }),
  });
  // Retries up to 10000 times to let NzbGet scan and process the nzb (1 retry should suffice tbh but NzbGet is slow)
  for (let i = 0; i < 10000; i++) {
    const {
      items: [item],
    } = await integration.getClientJobsAndStatusAsync();
    if (item) {
      // Remove the added time because NzbGet doesn't return it properly in this specific case
      const { added: _, ...itemRest } = item;
      return itemRest;
    }
  }
  // Throws if it can't find the item
  throw new Error("No item found");
};
