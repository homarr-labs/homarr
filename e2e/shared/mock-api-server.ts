import { createServer } from "node:http";

import type { Server } from "node:http";

export interface MockApiServer {
  url: string;
  close: () => Promise<void>;
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
  return {
    url: `http://host.docker.internal:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
