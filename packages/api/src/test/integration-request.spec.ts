import { readFileSync } from "node:fs";
import { X509Certificate } from "node:crypto";
import { createServer as createHttpsServer } from "node:https";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { brotliCompressSync, deflateSync, gzipSync } from "node:zlib";
import { createOpenApiFetchHandler } from "trpc-to-openapi";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import type { z } from "zod/v4";

import type { Session } from "@homarr/auth";
import { encryptSecret } from "@homarr/common/server";
import { executeCustomWidgetRequest } from "@homarr/custom-widgets/server";
import { eq } from "@homarr/db";
import { createDb } from "@homarr/db/test";
import { integrations, integrationSecrets, integrationUserPermissions, users } from "@homarr/db/schema";
import type { IntegrationPermission } from "@homarr/definitions";

import { getIntegrationHttpAuthenticationAsync } from "@homarr/integrations/factory";

import { callMcpTool, extractMcpToolsFromProcedures } from "../mcp-tools";
import { openApiRouter } from "../open-api";
import { createTRPCRouter } from "../trpc";
import {
  integrationRequestProcedure,
  integrationRequestSchema,
  redactIntegrationResponse,
  resolveIntegrationRequestUrl,
} from "../router/integration/integration-request";

vi.mock("@homarr/auth", () => ({}));
const trust = vi.hoisted(() => ({
  certificates: vi.fn(async (): Promise<string[]> => []),
  hostnames: vi.fn(async (): Promise<{ hostname: string; thumbprint: string }[]> => []),
}));
vi.mock("@homarr/core/infrastructure/certificates", () => ({
  getAllTrustedCertificatesAsync: trust.certificates,
  getTrustedCertificateHostnamesAsync: trust.hostnames,
}));

const router = createTRPCRouter({ request: integrationRequestProcedure });
const secret = "test-credential-not-for-output";
const calls: { method: string | undefined; path: string | undefined; auth: string | undefined; body: string }[] = [];
const compressors = { gzip: gzipSync, deflate: deflateSync, br: brotliCompressSync };
const server = createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += String(chunk);
  calls.push({
    method: req.method,
    path: req.url,
    auth: (req.headers["x-api-key"] ?? req.headers.authorization) as string | undefined,
    body,
  });
  if (req.url === "/slow") return;
  if (req.url === "/inspect") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ body, contentType: req.headers["content-type"], auth: req.headers["x-api-key"] }));
    return;
  }
  if (req.method === "HEAD") {
    res.writeHead(200, { "Content-Length": "9000000", "Content-Encoding": "gzip" });
    res.end();
    return;
  }
  if (req.url?.startsWith("/compressed")) {
    const encoding = req.headers["accept-encoding"] ?? "gzip";
    let bytes = Buffer.from(JSON.stringify({ value: "decoded", secret }));
    if (req.url === "/compressed-large") bytes = Buffer.from("x".repeat(1024 * 1024 + 1));
    for (const name of encoding.split(", ")) {
      const compress = compressors[name as keyof typeof compressors];
      if (compress) bytes = compress(bytes);
    }
    if (req.url === "/compressed-invalid") bytes = Buffer.from(secret);
    res.writeHead(200, { "Content-Type": "application/json", "Content-Encoding": encoding });
    res.end(bytes);
    return;
  }
  if (req.url === "/redirect") {
    res.writeHead(302, { Location: "/echo" });
    res.end();
    return;
  }
  if (req.url === "/large") {
    res.end("x".repeat(1024 * 1024 + 1));
    return;
  }
  if (req.url === "/echo") {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ [secret]: [secret, encodeURIComponent(secret), Buffer.from(secret).toString("base64")] }));
    return;
  }
  if (req.url === "/text") {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(`invalid JSON ${secret}`);
    return;
  }
  if (req.url === "/boolean") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ healthy: true }));
    return;
  }
  if (req.method === "DELETE") {
    res.writeHead(204);
    res.end();
    return;
  }
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify([{ id: 42, title: "Example series" }]));
});
let baseUrl: string;
beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    }),
  );
});

async function fixtureContext(
  permission?: IntegrationPermission,
  setup?: (db: ReturnType<typeof createDb>) => Promise<void>,
) {
  const db = createDb();
  await db.insert(users).values([{ id: "reader" }, { id: "other" }]);
  await db.insert(integrations).values({ id: "sonarr", name: "Sonarr", kind: "sonarr", url: baseUrl });
  await db.insert(integrationSecrets).values({ integrationId: "sonarr", kind: "apiKey", value: encryptSecret(secret) });
  // Another user's full permission must never grant this caller access.
  await db.insert(integrationUserPermissions).values({ integrationId: "sonarr", userId: "other", permission: "full" });
  if (permission)
    await db.insert(integrationUserPermissions).values({ integrationId: "sonarr", userId: "reader", permission });
  const session = {
    user: { id: "reader", permissions: [], colorScheme: "light" },
    expires: new Date().toISOString(),
  } satisfies Session;
  await setup?.(db);
  return { db, session, deviceType: undefined };
}

async function fixture(permission?: IntegrationPermission, setup?: (db: ReturnType<typeof createDb>) => Promise<void>) {
  return router.createCaller(await fixtureContext(permission, setup));
}

const get = { integrationId: "sonarr", method: "GET", path: "/api/v3/series" } as const;

describe("integration_request validation", () => {
  test.each([
    "https://evil.com/x",
    "https://example.com/x",
    "//evil.com/x",
    "\\\\evil.com/x",
    "/\\evil.com",
    " https://evil.com",
    "https:\nevil.com",
    "/x#fragment",
  ])("rejects %s", (path) => {
    expect(() => resolveIntegrationRequestUrl("https://example.com/base/", path)).toThrow();
  });
  test.each(["../series", "../../series", "%2e%2e/series"])(
    "rejects traversal outside the configured path %s",
    (path) => {
      expect(() => resolveIntegrationRequestUrl("https://example.com/base/", path)).toThrow();
    },
  );
  test("preserves URL resolution semantics and query parameters", () => {
    expect(resolveIntegrationRequestUrl("https://example.com/base/", "series?id=42").href).toBe(
      "https://example.com/base/series?id=42",
    );
    expect(resolveIntegrationRequestUrl("https://example.com/base/", "/series").pathname).toBe("/base/series");
  });
  test("accepts only JSON bodies and the specified methods", () => {
    expect(integrationRequestSchema.safeParse({ ...get, body: new Date() }).success).toBe(false);
    expect(integrationRequestSchema.safeParse({ ...get, method: "TRACE" }).success).toBe(false);
  });
  test("resolves native authentication and rejects unsupported or incomplete credentials", async () => {
    const input = {
      id: "test",
      name: "Test",
      externalUrl: null,
      url: baseUrl,
      decryptedSecrets: [{ kind: "apiKey" as const, value: secret }],
    };
    await expect(getIntegrationHttpAuthenticationAsync({ ...input, kind: "sonarr" })).resolves.toMatchObject({
      headers: { "X-API-Key": secret },
    });
    await expect(getIntegrationHttpAuthenticationAsync({ ...input, kind: "homeAssistant" })).resolves.toMatchObject({
      headers: { Authorization: `Bearer ${secret}` },
    });
    await expect(getIntegrationHttpAuthenticationAsync({ ...input, kind: "qBittorrent" })).rejects.toThrow(
      "does not support",
    );
    await expect(
      getIntegrationHttpAuthenticationAsync({ ...input, kind: "sonarr", decryptedSecrets: [] }),
    ).rejects.toThrow();
  });
  test.each([42, true, false, null])("redacts echoed primitive credential %s", (value) => {
    expect(redactIntegrationResponse(value, [{ kind: "password", value: String(value) }])).toBe("[REDACTED]");
  });
  test("redacts JSON-escaped credentials embedded in text", () => {
    const password = 'quoted"password\\with-newline\n';
    const encoded = JSON.stringify(password).slice(1, -1);
    expect(
      redactIntegrationResponse({ message: `password=${encoded}` }, [{ kind: "password", value: password }]),
    ).toEqual({ message: "password=[REDACTED]" });
  });
  test("redacts basic credentials and JSON keys without damaging JSON", () => {
    const credentials = Buffer.from(`user:${secret}`).toString("base64");
    expect(
      redactIntegrationResponse({ [secret]: `Basic ${credentials}` }, [
        { kind: "username", value: "user" },
        { kind: "password", value: secret },
      ]),
    ).toEqual({ "[REDACTED]": "Basic [REDACTED]" });
  });
});

describe("integration_request with a mock integration server", () => {
  test("GET authenticates with stored credentials and full permission", async () => {
    const caller = await fixture("full");
    await expect(caller.request(get)).resolves.toMatchObject({
      status: 200,
      data: [{ id: 42, title: "Example series" }],
    });
    expect(calls.at(-1)).toMatchObject({ method: "GET", path: "/api/v3/series", auth: secret });
  });
  test("reuses the Custom Widget authentication resolver for every HTTP-capable kind", async () => {
    const caller = await fixture("full", async (db) => {
      await db.update(integrations).set({ kind: "mealie" }).where(eq(integrations.id, "sonarr"));
    });
    await expect(caller.request({ ...get, path: "/api/households/statistics" })).resolves.toMatchObject({
      status: 200,
    });
    expect(calls.at(-1)?.auth).toBe(`Bearer ${secret}`);
  });
  test("does not redact ordinary response values that match constant adapter headers", async () => {
    const caller = await fixture("full", async (db) => {
      await db.update(integrations).set({ kind: "nextcloud" }).where(eq(integrations.id, "sonarr"));
      await db.delete(integrationSecrets).where(eq(integrationSecrets.integrationId, "sonarr"));
      await db.insert(integrationSecrets).values([
        { integrationId: "sonarr", kind: "username", value: encryptSecret("reader") },
        { integrationId: "sonarr", kind: "password", value: encryptSecret(secret) },
      ]);
    });
    await expect(caller.request({ ...get, path: "/boolean" })).resolves.toEqual({
      status: 200,
      data: { healthy: true },
    });
  });
  test("keeps credentials and URL from the same integration snapshot", async () => {
    const rotated = "credential-for-the-new-origin";
    const caller = await fixture("full", async (db) => {
      const snapshot = await db.query.integrations.findFirst({
        where: eq(integrations.id, "sonarr"),
        with: {
          secrets: true,
          userPermissions: { where: eq(integrationUserPermissions.userId, "reader") },
          groupPermissions: true,
        },
      });
      // Simulate a URL/key rotation immediately after the first SELECT completed.
      await db.update(integrations).set({ url: "https://new-origin.example" }).where(eq(integrations.id, "sonarr"));
      await db.update(integrationSecrets).set({ value: encryptSecret(rotated) });
      vi.spyOn(db.query.integrations, "findFirst").mockResolvedValueOnce(snapshot);
    });
    await caller.request(get);
    expect(calls.at(-1)?.auth).toBe(secret);
  });
  test("uses Homarr's trusted certificates and hostname exceptions without disabling TLS checks", async () => {
    // This committed certificate/key pair is only for the loopback mock server.
    const cert = readFileSync(new URL("./fixtures/integration-request-cert.pem", import.meta.url), "utf8");
    const key = readFileSync(new URL("./fixtures/integration-request-key.pem", import.meta.url), "utf8");
    const https = createHttpsServer({ cert, key }, (_req, res) => res.end('{"trusted":true}'));
    await new Promise<void>((resolve) => https.listen(0, "127.0.0.1", resolve));
    try {
      const caller = await fixture("full", async (db) => {
        await db.update(integrations).set({ url: `https://127.0.0.1:${(https.address() as AddressInfo).port}` });
      });
      await expect(caller.request(get)).rejects.toMatchObject({ code: "BAD_GATEWAY" });
      trust.certificates.mockResolvedValue([cert]);
      await expect(caller.request(get)).rejects.toMatchObject({ code: "BAD_GATEWAY" });
      trust.hostnames.mockResolvedValue([
        { hostname: "127.0.0.1", thumbprint: new X509Certificate(cert).fingerprint256 },
      ]);
      await expect(caller.request(get)).resolves.toMatchObject({ status: 200, data: { trusted: true } });
    } finally {
      trust.certificates.mockResolvedValue([]);
      trust.hostnames.mockResolvedValue([]);
      https.closeAllConnections();
      await new Promise<void>((resolve) => https.close(() => resolve()));
    }
  });
  test("denies GET without full permission even when another user has full access", async () => {
    const caller = await fixture();
    const before = calls.length;
    await expect(caller.request(get)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Arbitrary integration requests require full integration access",
    });
    expect(calls).toHaveLength(before);
  });
  test.each(["GET", "POST", "PUT", "PATCH", "DELETE"] as const)(
    "denies %s with only use permission",
    async (method) => {
      const caller = await fixture("use");
      const before = calls.length;
      await expect(caller.request({ ...get, method, confirmed: true })).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Arbitrary integration requests require full integration access",
      });
      expect(calls).toHaveLength(before);
    },
  );
  test("interact access does not authorize arbitrary endpoints", async () => {
    const caller = await fixture("interact");
    await expect(caller.request(get)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Arbitrary integration requests require full integration access",
    });
  });
  test("DELETE requires confirmation and preserves deleteFiles", async () => {
    const caller = await fixture("full");
    const input = { ...get, method: "DELETE", path: "/api/v3/series/42?deleteFiles=true" } as const;
    const before = calls.length;
    await expect(caller.request(input)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(calls).toHaveLength(before);
    await expect(caller.request({ ...input, confirmed: true })).resolves.toMatchObject({ status: 204, data: null });
    expect(calls.at(-1)).toMatchObject({ method: "DELETE", path: input.path, auth: secret });
  });
  test("sends a JSON body with full access", async () => {
    const caller = await fixture("full");
    await caller.request({ ...get, method: "PATCH", body: { monitored: false } });
    expect(calls.at(-1)?.body).toBe('{"monitored":false}');
  });
  test.each(["https://evil.com/x", "//evil.com/x"])("rejects %s before HTTP", async (path) => {
    const caller = await fixture("full");
    const before = calls.length;
    await expect(caller.request({ ...get, path })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(calls).toHaveLength(before);
  });
  test("never follows a redirect", async () => {
    const caller = await fixture("full");
    const before = calls.length;
    await expect(caller.request({ ...get, path: "/redirect" })).rejects.toMatchObject({ code: "BAD_GATEWAY" });
    expect(calls).toHaveLength(before + 1);
  });
  test("enforces the response and request caps", async () => {
    const caller = await fixture("full");
    await expect(caller.request({ ...get, path: "/large" })).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
    await expect(caller.request({ ...get, method: "POST", body: "x".repeat(10 * 1024) })).rejects.toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
    });
  });
  test("redacts upstream JSON and text, including error responses", async () => {
    const caller = await fixture("full");
    await expect(caller.request({ ...get, path: "/echo" })).resolves.toMatchObject({
      status: 400,
      data: { "[REDACTED]": ["[REDACTED]", "[REDACTED]", "[REDACTED]"] },
    });
    await expect(caller.request({ ...get, path: "/text" })).resolves.toMatchObject({
      status: 500,
      data: "invalid JSON [REDACTED]",
    });
  });
  test("honors the executor's total deadline without logging credentials", async () => {
    const logError = vi.fn();
    await expect(
      executeCustomWidgetRequest({
        baseUrl,
        targetUrl: `${baseUrl}/slow`,
        method: "GET",
        networkScope: "loopback",
        kind: "action",
        timeoutMs: 30,
        auth: { type: "apiKeyHeader", secrets: [{ kind: "apiKey", value: secret }] },
        logError,
      }),
    ).rejects.toMatchObject({ code: "BAD_GATEWAY", reason: "timeout" });
    expect(JSON.stringify(logError.mock.calls)).not.toContain(secret);
  });
});

describe("integration proxy public contract", () => {
  test.each([{ integrationKind: "sonarr" as const }, { integrationName: "Sonarr" }])(
    "selects the first authorized instance with %j",
    async (selector) => {
      const caller = await fixture(undefined, async (db) => {
        await db.insert(integrations).values([
          { id: "b", name: "Sonarr", kind: "sonarr", url: baseUrl },
          { id: "a-denied", name: "Sonarr", kind: "sonarr", url: baseUrl },
          { id: "c", name: "Sonarr", kind: "sonarr", url: baseUrl },
        ]);
        for (const id of ["b", "c"]) {
          await db
            .insert(integrationSecrets)
            .values({ integrationId: id, kind: "apiKey", value: encryptSecret(secret) });
          await db
            .insert(integrationUserPermissions)
            .values({ integrationId: id, userId: "reader", permission: "full" });
        }
      });
      await expect(caller.request({ ...selector, path: "/api/v3/series" })).resolves.toMatchObject({
        integration: { id: "b", name: "Sonarr", kind: "sonarr" },
        ok: true,
      });
    },
  );

  test.each<z.input<typeof integrationRequestSchema>>([
    { path: "/x" },
    { integrationId: "sonarr", integrationName: "Sonarr", path: "/x" },
    { integrationName: "missing", path: "/x" },
    { integrationId: "sonarr", method: "HEAD" as const, path: "/x", body: "invalid" },
    { integrationId: "sonarr", method: "POST" as const, path: "/x", bodyEncoding: "raw" as const, body: {} },
    { integrationId: "sonarr", path: "/x", headers: { Host: "another-host" } },
    { integrationId: "sonarr", path: "/x", headers: { Authorization: "another-credential" } },
    { integrationId: "sonarr", path: "/x", headers: { a: "x".repeat(8192), b: "y".repeat(8192) } },
  ])("rejects invalid or unauthorized input before transmission (%#)", async (input) => {
    const caller = await fixture("full");
    const count = calls.length;
    await expect(caller.request(input)).rejects.toThrow();
    expect(calls).toHaveLength(count);
  });

  test("preserves reverse-proxy subpaths and rejects encoded path escapes before transmission", async () => {
    const caller = await fixture("full", async (db) => {
      await db.update(integrations).set({ url: `${baseUrl}/sonarr` });
    });
    await caller.request(get);
    expect(calls.at(-1)?.path).toBe("/sonarr/api/v3/series");
    const count = calls.length;
    for (const path of ["../escape", "/%252e%252e/escape", "/%2f..%2fescape"])
      await expect(caller.request({ ...get, path })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(calls).toHaveLength(count);
  });

  test("keeps native authentication while forwarding raw form bodies and their content type", async () => {
    const caller = await fixture("full");
    await expect(
      caller.request({
        ...get,
        method: "POST",
        path: "/inspect",
        bodyEncoding: "raw",
        body: "name=Example&enabled=true",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "X-API-Key": "caller-cannot-override" },
      }),
    ).resolves.toMatchObject({
      data: {
        body: "name=Example&enabled=true",
        contentType: "application/x-www-form-urlencoded",
        auth: "[REDACTED]",
      },
    });
    expect(calls.at(-1)?.auth).toBe(secret);
  });

  test.each(["HEAD", "OPTIONS"] as const)("supports %s without a body", async (method) => {
    const caller = await fixture("full");
    const result = await caller.request({ ...get, method });
    expect(result.ok).toBe(true);
    if (method === "HEAD") expect(result.data).toBeNull();
    expect(calls.at(-1)).toMatchObject({ method, body: "" });
  });

  test.each(["gzip", "deflate", "br", "gzip, br"])("decodes %s and bounds expanded responses", async (encoding) => {
    const caller = await fixture("full");
    const input = { ...get, headers: { "Accept-Encoding": encoding } };
    await expect(caller.request({ ...input, path: "/compressed" })).resolves.toMatchObject({
      ok: true,
      data: { value: "decoded", secret: "[REDACTED]" },
    });
    await expect(caller.request({ ...input, path: "/compressed-large" })).rejects.toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
    });
  });

  test("sanitizes malformed compressed responses", async () => {
    const caller = await fixture("full");
    await expect(caller.request({ ...get, path: "/compressed-invalid" })).rejects.toMatchObject({
      code: "BAD_GATEWAY",
      message: "Invalid compressed upstream response",
    });
  });

  test("REST and MCP expose the same result and permission boundary", async () => {
    const context = await fixtureContext("full");
    const request = () =>
      new Request("http://homarr.local/api/integrations/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...get, path: "/echo" }),
      });
    const response = await createOpenApiFetchHandler({
      req: request(),
      endpoint: "/",
      router: openApiRouter,
      createContext: () => context,
    });
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toMatchObject({ ok: false, status: 400, integration: { id: "sonarr" } });
    expect(JSON.stringify(result)).not.toContain(secret);
    const tool = extractMcpToolsFromProcedures(router).tools.find((entry) => entry.name === "request");
    expect(tool).toBeDefined();
    if (!tool) throw new Error("Missing request MCP tool");
    await expect(callMcpTool(router.createCaller(context), tool, { ...get, path: "/echo" })).resolves.toEqual(result);
    const deniedContext = { ...context, session: null };
    const count = calls.length;
    const denied = await createOpenApiFetchHandler({
      req: request(),
      endpoint: "/",
      router: openApiRouter,
      createContext: () => deniedContext,
    });
    expect(denied.status).toBe(401);
    await expect(callMcpTool(router.createCaller(deniedContext), tool, get)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(calls).toHaveLength(count);
  });
});
