import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, test } from "vitest";

import type { Session } from "@homarr/auth";
import { encryptSecret } from "@homarr/common/server";
import { createDb } from "@homarr/db/test";
import {
  federationConnections,
  integrationOrigins,
  integrations,
  integrationSecrets,
  integrationUserPermissions,
  users,
} from "@homarr/db/schema";

import { createCallerFactory, createApiRouter } from "../../../procedure";
import { federationSourceProcedures } from "../../custom-widget/federation-source";

const userId = "custom-source-user";
const integrationId = "custom-source-integration";
const secret = "private-source-api-key";
const session = {
  user: { id: userId, permissions: [], colorScheme: "light" },
  expires: new Date(Date.now() + 3600_000).toISOString(),
} satisfies Session;

async function prepare(url: string, permission: "use" | "full" = "full") {
  const db = createDb();
  await db.insert(users).values({ id: userId });
  await db.insert(integrations).values({ id: integrationId, name: "Source", kind: "jellyfin", url });
  await db.insert(integrationSecrets).values({ integrationId, kind: "apiKey", value: encryptSecret(secret) });
  await db.insert(integrationUserPermissions).values({ integrationId, userId, permission });
  return {
    db,
    caller: createCallerFactory(createApiRouter(federationSourceProcedures))({ db, session, deviceType: undefined }),
  };
}

describe("federated Custom Widget execution", () => {
  test("executes on the source using its private base path and redacts saved credentials", async () => {
    let received: { url?: string; token?: string | string[] } = {};
    const server = createServer((request, response) => {
      received = { url: request.url, token: request.headers.authorization };
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ count: 4, token: secret }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const { caller } = await prepare(`http://127.0.0.1:${(server.address() as AddressInfo).port}/private-api`);
      const result = await caller.executeSource({
        integrationId,
        operation: { path: "/Items/Counts?limit=2", method: "GET", kind: "query", authenticate: true },
      });
      expect(received).toEqual({
        url: "/private-api/Items/Counts?limit=2",
        token:
          'MediaBrowser Client="Homarr", Device="Homarr", DeviceId="homarr", Version="0.0.1", Token="private-source-api-key"',
      });
      expect(result).toMatchObject({ ok: true, status: 200, data: { count: 4 } });
      expect(JSON.stringify(result)).not.toContain(secret);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        }),
      );
    }
  });

  test("refuses query-only access even when the operation asks for no credentials", async () => {
    const { caller } = await prepare("http://127.0.0.1:1/private-api", "use");
    await expect(
      caller.executeSource({
        integrationId,
        operation: { path: "/status", method: "GET", kind: "query", authenticate: false },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  test.each([
    "https://elsewhere.invalid/api",
    "//elsewhere.invalid/api",
    "/../outside",
    "/%252e%252e/outside",
    "/%5c..%5coutside",
    "/status#private",
    "/\nstatus",
  ])("refuses path escape %j before contacting the integration", async (path) => {
    const { caller } = await prepare("http://127.0.0.1:1/private-api");
    await expect(
      caller.executeSource({
        integrationId,
        operation: { path, method: "GET", kind: "query", authenticate: true },
      }),
    ).rejects.toMatchObject({ code: expect.stringMatching(/BAD_REQUEST|FORBIDDEN/u) });
  });

  test("refuses transport credentials and unsafe request headers", async () => {
    const { caller } = await prepare("http://127.0.0.1:1/private-api");
    const operation = { path: "/status", method: "GET" as const, kind: "query" as const, authenticate: true };
    await expect(
      caller.executeSource({
        integrationId,
        operation: { ...operation, staticHeaders: { Authorization: "Bearer injected" } },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.executeSource({
        integrationId,
        operation: { ...operation, baseUrl: "https://elsewhere.invalid/" } as typeof operation,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.executeSource({
        integrationId,
        operation: { ...operation, body: "é".repeat(6000) },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  test("refuses cascaded aliases instead of accessing their public descriptor locally", async () => {
    const { db, caller } = await prepare("http://127.0.0.1:1/private-api");
    await db.insert(federationConnections).values({
      id: "another-connection",
      workerId: "another-worker",
      name: "Another worker",
      publicKey: "{}",
      encryptedConfiguration: encryptSecret("{}"),
    });
    await db
      .insert(integrationOrigins)
      .values({ integrationId, connectionId: "another-connection", remoteIntegrationId: "remote-integration" });
    await expect(
      caller.executeSource({
        integrationId,
        operation: { path: "/status", method: "GET", kind: "query", authenticate: true },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  test("runs action bodies on the source without authentication when explicitly disabled", async () => {
    let received: { url?: string; body?: string; auth?: string } = {};
    const server = createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      received = { url: request.url, body: Buffer.concat(chunks).toString(), auth: request.headers.authorization };
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ removed: 7, token: secret }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const { caller } = await prepare(`http://127.0.0.1:${(server.address() as AddressInfo).port}/private-api`);
      const result = await caller.executeSource({
        integrationId,
        operation: {
          path: "/queue/remove",
          method: "POST",
          kind: "action",
          authenticate: false,
          body: '{"id":7}',
          staticHeaders: { "Content-Type": "application/json" },
        },
      });
      expect(result).toMatchObject({ data: { removed: 7 } });
      expect(JSON.stringify(result)).not.toContain(secret);
      expect(received).toEqual({ url: "/private-api/queue/remove", body: '{"id":7}', auth: undefined });
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        }),
      );
    }
  });
});
