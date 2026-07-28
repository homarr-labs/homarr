import { createServer } from "node:http";
import { getContainerRuntimeClient, TestContainers } from "testcontainers";

import type { Server } from "node:http";

const TESTCONTAINERS_SSHD_LABEL = "org.testcontainers.sshd";

export interface MockApiServer {
  url: string;
  close: () => Promise<void>;
}

export async function exposeHostPortToContainersAsync(port: number): Promise<string> {
  await TestContainers.exposeHostPorts(port);
  const client = await getContainerRuntimeClient();
  const forwarder = (await client.container.list()).find(
    (container) => container.State === "running" && container.Labels[TESTCONTAINERS_SSHD_LABEL] === "true",
  );
  const forwarderAddress = forwarder
    ? Object.values(forwarder.NetworkSettings.Networks).find((network) => network.IPAddress)?.IPAddress
    : undefined;
  if (!forwarderAddress) throw new Error("Failed to locate the Testcontainers host-port forwarder");
  return `http://${forwarderAddress}:${port}`;
}

export async function startMockApiServerAsync(responseBody: unknown): Promise<MockApiServer> {
  const body = JSON.stringify(responseBody);
  const server: Server = await new Promise((resolve) => {
    const candidate = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(body);
    });
    candidate.listen(0, "0.0.0.0", () => resolve(candidate));
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Failed to start mock API server");
  }

  try {
    return {
      url: await exposeHostPortToContainersAsync(address.port),
      close: () =>
        new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    };
  } catch (error) {
    server.close();
    throw error;
  }
}
