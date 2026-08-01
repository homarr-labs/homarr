import { GenericContainer, Wait } from "testcontainers";
import { Environment } from "testcontainers/build/types";

export const createHomarrContainer = (
  options: {
    environment?: Environment;
    mounts?: {
      "/appdata"?: string;
      "/var/run/docker.sock"?: string;
    };
  } = {},
) => {
  const configuredImage = process.env.HOMARR_E2E_IMAGE?.trim();
  const image = configuredImage || "homarr-e2e";
  if (!process.env.CI && !configuredImage) {
    throw new Error(`This test should only be run in CI or with a local Homarr image (configured: '${image}')`);
  }

  const container = new GenericContainer(image)
    .withExposedPorts(7575)
    .withEnvironment({
      ...options.environment,
      // We disable external connections due to the following reasons:
      // - No icons have to be downloaded (11k)
      // - No analytics data is sent
      // - It is just faster and makes the tests more reliable (better performance)
      NO_EXTERNAL_CONNECTION: true.toString(),
      SECRET_ENCRYPTION_KEY: "0".repeat(64),
    })
    .withBindMounts(
      Object.entries(options.mounts ?? {})
        .filter((item) => item?.[0] !== undefined)
        .map(([container, local]) => ({
          source: local,
          target: container,
        })),
    )
    .withWaitStrategy(Wait.forHttp("/api/health/ready", 7575))
    .withExtraHosts([
      {
        // This enabled the usage of host.docker.internal as hostname in the container
        host: "host.docker.internal",
        ipAddress: "host-gateway",
      },
    ]);

  return withLogs(container);
};

export const withLogs = (container: GenericContainer) => {
  container.withLogConsumer((stream) =>
    stream
      .on("data", (line) => console.log(line))
      .on("err", (line) => console.error(line))
      .on("end", () => console.log("Stream closed")),
  );
  return container;
};
