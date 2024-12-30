import { GenericContainer, Wait } from "testcontainers";

export const createHomarrContainer = () => {
  if (!process.env.CI) {
    throw new Error("This test should only be run in CI or with a homarr image named 'homarr-e2e'");
  }

  return withLogs(
    new GenericContainer("homarr-e2e")
      .withExposedPorts(7575)
      .withEnvironment({
        SECRET_ENCRYPTION_KEY: "0".repeat(64),
      })
      .withWaitStrategy(Wait.forHttp("/api/health/ready", 7575)),
  );
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
