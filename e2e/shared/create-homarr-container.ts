import { GenericContainer, Wait } from "testcontainers";

export const createHomarrContainer = () => {
  if (!process.env.CI) {
    throw new Error("This test should only be run in CI or with a homarr image named 'homarr-e2e'");
  }

  return new GenericContainer("homarr-e2e")
    .withExposedPorts(7575)
    .withEnvironment({
      AUTH_SECRET: "0".repeat(64),
      SECRET_ENCRYPTION_KEY: "0".repeat(64),
    })
    .withWaitStrategy(Wait.forHttp("/api/health/ready", 7575));
};
