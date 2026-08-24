// @vitest-environment node

import { createServer } from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { RequestInit } from "undici";

import { describe, expect, test, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync, mergeHeadersWithUserAgent } from "@homarr/core/infrastructure/http";

vi.mock("@homarr/core/infrastructure/certificates", () => ({
  getAllTrustedCertificatesAsync: vi.fn(async () => []),
  getTrustedCertificateHostnamesAsync: vi.fn(async () => []),
}));

describe("mergeHeadersWithUserAgent", () => {
  test("should keep existing headers when given a Headers instance", () => {
    // Arrange
    const headers = new Headers({ "x-api-key": "some-api-key", Accept: "application/json" });

    // Act
    const merged = mergeHeadersWithUserAgent(headers);

    // Assert
    expect(merged.get("x-api-key")).toBe("some-api-key");
    expect(merged.get("accept")).toBe("application/json");
    expect(merged.get("user-agent")).toContain("Homarr/");
  });

  test("should keep existing headers when given a record", () => {
    // Arrange
    const headers = { "x-api-key": "some-api-key", Accept: "application/json" };

    // Act
    const merged = mergeHeadersWithUserAgent(headers);

    // Assert
    expect(merged.get("x-api-key")).toBe("some-api-key");
    expect(merged.get("accept")).toBe("application/json");
    expect(merged.get("user-agent")).toContain("Homarr/");
  });

  test("should keep existing headers when given a tuple array", () => {
    // Arrange
    const headers: [string, string][] = [
      ["x-api-key", "some-api-key"],
      ["Accept", "application/json"],
    ];

    // Act
    const merged = mergeHeadersWithUserAgent(headers);

    // Assert
    expect(merged.get("x-api-key")).toBe("some-api-key");
    expect(merged.get("accept")).toBe("application/json");
    expect(merged.get("user-agent")).toContain("Homarr/");
  });

  test("should not override an existing user-agent in any casing", () => {
    // Arrange
    const headers = new Headers({ "USER-AGENT": "custom-agent" });

    // Act
    const merged = mergeHeadersWithUserAgent(headers);

    // Assert
    expect(merged.get("user-agent")).toBe("custom-agent");
  });

  test("should fall back to the default user agent when no headers are provided", () => {
    // Act
    const merged = mergeHeadersWithUserAgent(undefined);

    // Assert
    expect(merged.get("user-agent")).toContain("Homarr/");
  });
});

const startCaptureServerAsync = async (): Promise<{
  server: Server;
  getReceivedHeaders: () => Record<string, string | string[] | undefined>;
  port: number;
}> => {
  let receivedHeaders: Record<string, string | string[] | undefined> = {};
  const server = createServer((req, res) => {
    receivedHeaders = req.headers;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end("{}");
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  return {
    server,
    port,
    getReceivedHeaders: () => receivedHeaders,
  };
};

describe("fetchWithTrustedCertificatesAsync", () => {
  test("should deliver a Headers instance with all headers to the remote server", async () => {
    // Arrange - the @immich/sdk hands over a Headers instance after merging its defaults
    const { server, port, getReceivedHeaders } = await startCaptureServerAsync();
    const headers = new Headers({ "x-api-key": "immich-api-key", Accept: "application/json" });

    // Act
    try {
      const response = await fetchWithTrustedCertificatesAsync(`http://127.0.0.1:${port}/api/server/statistics`, {
        headers: headers as unknown as RequestInit["headers"],
      });

      // Assert
      expect(response.status).toBe(200);
      expect(getReceivedHeaders()["x-api-key"]).toBe("immich-api-key");
      expect(getReceivedHeaders()["user-agent"]).toContain("Homarr/");
    } finally {
      server.close();
    }
  });
});
