import { createServer } from "node:http";

import type { Server } from "node:http";

export interface MockApiServer {
  url: string;
  port: number;
  close: () => Promise<void>;
}

export const startMockApiServerAsync = async (responseBody: unknown): Promise<MockApiServer> => {
  const body = JSON.stringify(responseBody);

  const server: Server = await new Promise((resolve) => {
    const s = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(body);
    });
    s.listen(0, "0.0.0.0", () => resolve(s));
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start mock API server");
  }

  return {
    port: address.port,
    url: `http://host.docker.internal:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
};
