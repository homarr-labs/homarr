// @vitest-environment node

import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import { getServerStatistics, init } from "@immich/sdk";
import { describe, expect, test, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

vi.mock("@homarr/core/infrastructure/certificates", () => ({
  getAllTrustedCertificatesAsync: vi.fn(async () => []),
  getTrustedCertificateHostnamesAsync: vi.fn(async () => []),
}));

describe("real @immich/sdk end-to-end through fetchWithTrustedCertificatesAsync", () => {
  test("x-api-key set via init() reaches the server", async () => {
    let receivedXApiKey: string | string[] | undefined;
    const server = createServer((req, res) => {
      receivedXApiKey = req.headers["x-api-key"];
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ usage: 1000, photos: 5, videos: 2 }));
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;

    init({ baseUrl: `http://127.0.0.1:${port}/api`, apiKey: "sdk-configured-key" });
    try {
      const stats = await getServerStatistics({
        fetch: fetchWithTrustedCertificatesAsync as unknown as typeof fetch,
      });

      expect(receivedXApiKey).toBe("sdk-configured-key");
      expect(stats).toMatchObject({ usage: 1000, photos: 5, videos: 2 });
    } finally {
      server.close();
    }
  });
});
