import { rmdir } from "fs/promises";
import { join } from "path";
import type { StartedTestContainer } from "testcontainers";
import { GenericContainer, Wait } from "testcontainers";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

import { createId } from "@homarr/common";
import { createDb } from "@homarr/db/test";

import { BeszelIntegration } from "../src/beszel/beszel-integration";

vi.mock("@homarr/db", async (importActual) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importActual<typeof import("@homarr/db")>();
  return {
    ...actual,
    db: createDb(),
  };
});

const email = "e2e@homarr.dev";
const password = "12341234";
const publicKey = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAID5PFut0emFoQQ53LlLGfFYA/U1Noe6WPqYN/97LJTvR";
const token = "4af8b512-afdc-4e42-a478-d0a3bfbbb4a8";
const IMAGE_NAME = "henrygd/beszel:latest";
const AGENT_IMAGE_NAME = "henrygd/beszel-agent:latest";
const systemId = "nj259tge7e4h7xy";

describe("Beszel integration", () => {
  let socketPathId: string;
  let beszelContainer: StartedTestContainer;
  let beszelAgentContainer: StartedTestContainer;

  beforeAll(async () => {
    socketPathId = createId();
    beszelContainer = await createBeszelContainer(socketPathId).start();
    beszelAgentContainer = await createBeszelAgentContainer(socketPathId, beszelContainer.getMappedPort(8090)).start();

    await new Promise((resolve) => setTimeout(resolve, 5_000)); // Wait for Beszel to be ready and have some system_data
  }, 100_000);

  afterAll(async () => {
    await beszelContainer.stop();
    await beszelAgentContainer.stop();
    await rmdir(createSocketPath(socketPathId), { recursive: true });
  }, 30_000);

  test("Can get systems", async () => {
    // Arrange
    const integration = createIntegration(beszelContainer.getMappedPort(8090));

    // Act
    const systems = await integration.getSystemsAsync();

    // Assert
    expect(systems.length).toBe(1);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(systems[0]!.name).toBe("localhost");
  });

  test("Can get system details", async () => {
    // Arrange
    const integration = createIntegration(beszelContainer.getMappedPort(8090));

    // Act
    const system = await integration.getSystemDetailsAsync(systemId);

    // Assert
    console.log(system);
    expect(system.id).toBe(systemId);
    expect(system.name).toBe("localhost");
    expect(system.agent.connectionType).toBe("webSocket");
    expect(system.agent.version).toBeDefined();
    expect(system.status).toBe("up");
    expect(system.usage.cpuPercentage).toBeGreaterThanOrEqual(0);
    expect(system.usage.memoryPercentage).toBeGreaterThanOrEqual(0);
    expect(system.usage.diskPercentage).toBeGreaterThanOrEqual(0);
    expect(system.usage.load.averages.one).toBeGreaterThanOrEqual(0);
    expect(system.usage.networkBytes).toBeGreaterThanOrEqual(0);
  });
});

const createIntegration = (port: number) =>
  new BeszelIntegration({
    id: createId(),
    name: "Beszel E2E",
    url: `http://localhost:${port}`,
    decryptedSecrets: [
      {
        kind: "username",
        value: email,
      },
      {
        kind: "password",
        value: password,
      },
    ],
  });

const files = ["data.db", "data.db-shm", "data.db-wal", "id_ed25519"];

const createBeszelContainer = (id: string) => {
  return new GenericContainer(IMAGE_NAME)
    .withCopyFilesToContainer(
      files.map((file) => ({
        source: join(__dirname, `/volumes/beszel/${file}`),
        target: `/beszel_data/${file}`,
      })),
    )
    .withExposedPorts(8090)
    .withBindMounts([
      {
        source: createSocketPath(id),
        target: "/beszel_socket",
        mode: "rw",
      },
    ])
    .withLogConsumer((stream) => {
      stream.on("data", (line) => console.log(`[Beszel]: ${line}`));
      stream.on("error", (err) => console.error(`[Beszel][ERROR]: ${err}`));
    })
    .withWaitStrategy(Wait.forHttp("/", 8090));
};

const createBeszelAgentContainer = (id: string, port: number) => {
  return new GenericContainer(AGENT_IMAGE_NAME)
    .withBindMounts([
      {
        source: "/var/run/docker.sock",
        target: "/var/run/docker.sock",
        mode: "ro",
      },
      {
        source: createSocketPath(id),
        target: "/beszel_socket",
        mode: "rw",
      },
    ])
    .withLogConsumer((stream) => {
      stream.on("data", (line) => console.log(`[Beszel Agent]: ${line}`));
      stream.on("error", (err) => console.error(`[Beszel Agent][ERROR]: ${err}`));
    })
    .withEnvironment({
      LISTEN: "/beszel_socket/beszel.sock",
      HUB_URL: `http://host.docker.internal:${port}`,
      TOKEN: token,
      KEY: publicKey,
    })
    .withExtraHosts([
      {
        // This enabled the usage of host.docker.internal as hostname in the container
        host: "host.docker.internal",
        ipAddress: "host-gateway",
      },
    ]);
};

const createSocketPath = (id: string) => {
  /*if (process.env.CI) {
    return join("/tmp", `beszel_socket_${id}`);
  }*/
  return join(__dirname, `/volumes/beszel/socket-${id}`);
};
