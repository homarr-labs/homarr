import { GenericContainer, Wait } from "testcontainers";

import type { StartedTestContainer } from "testcontainers";

export interface MockApiContainer {
  url: string;
  stop: () => Promise<void>;
}

export async function startMockApiContainerAsync(responseBody: unknown): Promise<MockApiContainer> {
  const body = JSON.stringify(responseBody);
  const script = [
    'const { createServer } = require("node:http");',
    `const body = ${JSON.stringify(body)};`,
    'createServer((_request, response) => { response.writeHead(200, { "content-type": "application/json" }); response.end(body); }).listen(8080, "0.0.0.0");',
  ].join("\n");
  const container: StartedTestContainer = await new GenericContainer("node:24-alpine")
    .withCommand(["node", "-e", script])
    .withExposedPorts(8080)
    .withWaitStrategy(Wait.forHttp("/status", 8080))
    .start();

  return {
    url: `http://${container.getIpAddress("bridge")}:8080`,
    stop: async () => void (await container.stop()),
  };
}
