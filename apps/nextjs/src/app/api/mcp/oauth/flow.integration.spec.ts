import { createHash, randomBytes } from "crypto";
import { IncomingMessage } from "http";
import { Socket } from "net";

import { NodeNextRequest } from "next/dist/server/base-http/node";
import NextServer from "next/dist/server/next-server";
import { NextRequestAdapter } from "next/dist/server/web/spec-extension/adapters/next-request";

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const transport = vi.hoisted(() => {
  process.env.DB_DRIVER = "better-sqlite3";
  process.env.DB_URL = ":memory:";
  process.env.SECRET_ENCRYPTION_KEY = "0".repeat(64);
  process.env.HOMARR_REQUEST_IDENTITY_SECRET = "1".repeat(64);
  const env: { BASE_URL?: string } = {};
  return {
    auth: vi.fn(),
    env,
    closeDatabase: () => {},
  };
});

vi.mock("@homarr/auth/next", () => ({ auth: transport.auth }));
vi.mock("~/env", () => ({ env: transport.env }));
vi.mock("@homarr/db", async () => {
  const { default: Database } = await import("better-sqlite3");
  const { drizzle } = await import("drizzle-orm/better-sqlite3");
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  const { schema } = await import("@homarr/db/schema");
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema, casing: "snake_case" });
  migrate(db, { migrationsFolder: "./packages/db/migrations/sqlite" });
  sqlite.pragma("foreign_keys = ON");
  transport.closeDatabase = () => sqlite.close();
  return { ...(await import("drizzle-orm")), db };
});

import { sessionTokenCookieName } from "@homarr/auth/server";
import { comparePasswordsAsync } from "@homarr/auth/security";
import { db } from "@homarr/db";
import { apiKeys, users } from "@homarr/db/schema";

import { getMcpConsentBindingCookieName, readMcpConsent } from "./_grant";
import type { McpConsentSession } from "./_grant";
import { GET as authorize, POST as decide } from "./authorize/route";
import { POST as register } from "./register/route";
import { POST as redeem } from "./token/route";

const origin = "https://homarr.test";
const callback = "http://127.0.0.1:8765/callback?keep=one&code=old&error=old&error_description=old&state=old";
const resource = `${origin}/api/mcp`;
let requestSequence = 0;
let session: McpConsentSession | null;

class Browser {
  cookies = new Map<string, string>();

  constructor(token = "session-one") {
    this.cookies.set(sessionTokenCookieName, token);
  }

  request(path: string, body?: string, headers?: HeadersInit) {
    const requestHeaders = new Headers(headers);
    requestHeaders.set("host", "homarr.test");
    if (!requestHeaders.has("x-forwarded-proto")) requestHeaders.set("x-forwarded-proto", "https");
    requestHeaders.set("x-homarr-proxy-secret", "1".repeat(64));
    requestHeaders.set("x-homarr-client-ip", `192.0.${Math.floor(++requestSequence / 256)}.${requestSequence % 256}`);
    requestHeaders.set("cookie", [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; "));
    if (body !== undefined && !requestHeaders.has("content-type"))
      requestHeaders.set("content-type", "application/x-www-form-urlencoded");
    return new Request(`${origin}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: requestHeaders,
      body,
    });
  }

  apply(response: Response) {
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0] ?? "";
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator);
      if (cookie.includes("Max-Age=0")) this.cookies.delete(name);
      else this.cookies.set(name, pair.slice(separator + 1));
    }
  }

  view(pendingId: string) {
    return readMcpConsent({
      pendingId,
      browserBinding: this.cookies.get(getMcpConsentBindingCookieName(pendingId)) ?? null,
      session: session ? { ...session, sessionToken: this.cookies.get(sessionTokenCookieName) ?? "" } : null,
    });
  }
}

async function client(redirectUri = callback, clientName = "Fixture MCP Client") {
  const response = await register(
    new Browser().request(
      "/api/mcp/oauth/register",
      JSON.stringify({ redirect_uris: [redirectUri], client_name: clientName }),
      { "content-type": "application/json" },
    ),
  );
  expect(response.status).toBe(201);
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("client_id" in body) || typeof body.client_id !== "string")
    throw new Error("Expected client registration");
  return { clientId: body.client_id, redirectUri, clientName };
}

async function initiate(
  browser: Browser,
  registration: Awaited<ReturnType<typeof client>>,
  overrides: Record<string, string | undefined> = {},
  requestAdapter?: (request: Request) => Promise<Request>,
) {
  const verifier = randomBytes(32).toString("base64url");
  const params = new URLSearchParams({
    client_id: registration.clientId,
    redirect_uri: registration.redirectUri,
    response_type: "code",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    resource,
    scope: "mcp:tools",
    state: "",
  });
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) params.delete(key);
    else params.set(key, value);
  }
  const source = browser.request(`/api/mcp/oauth/authorize?${params}`);
  const request = requestAdapter ? await requestAdapter(source) : source;
  const response = await authorize(request);
  browser.apply(response);
  const target = new URL(response.headers.get("location") ?? "/", origin);
  const pendingId =
    target.searchParams.get("pending") ??
    new URL(target.searchParams.get("callbackUrl") ?? "/", origin).searchParams.get("pending");
  return { response, pendingId, verifier, registration, request };
}

async function installedNextRequest(request: Request) {
  const source = new IncomingMessage(new Socket());
  source.method = request.method;
  const url = new URL(request.url);
  source.url = `${url.pathname}${url.search}`;
  source.headers = Object.fromEntries(request.headers);
  if (request.body) source.push(Buffer.from(await request.text()));
  source.push(null);
  const incoming = new NodeNextRequest(source);
  const attachRequestMeta: unknown = Reflect.get(NextServer.prototype, "attachRequestMeta");
  if (typeof attachRequestMeta !== "function") throw new Error("Expected installed Next request metadata adapter");
  attachRequestMeta.call(
    { fetchHostname: "0.0.0.0", port: 3000, nextConfig: { experimental: {} } },
    incoming,
    {},
    true,
  );
  return NextRequestAdapter.fromNodeNextRequest(incoming, new AbortController().signal);
}

async function prompt(
  browser = new Browser(),
  registration?: Awaited<ReturnType<typeof client>>,
  overrides: Record<string, string | undefined> = {},
) {
  const grant = await initiate(browser, registration ?? (await client()), overrides);
  expect(grant.response.status).toBe(303);
  if (!grant.pendingId) throw new Error("Expected pending request");
  const result = browser.view(grant.pendingId);
  if (!result.ok) throw new Error(`Expected consent: ${result.error}`);
  return { ...grant, pendingId: grant.pendingId, consent: result.consent, browser };
}

function decisionRequest(
  grant: Awaited<ReturnType<typeof prompt>>,
  overrides: Record<string, string> = {},
  headers: HeadersInit = { origin },
) {
  return grant.browser.request(
    "/api/mcp/oauth/authorize",
    new URLSearchParams({
      pending: grant.pendingId,
      consentToken: grant.consent.consentToken,
      decision: "approve",
      ...overrides,
    }).toString(),
    headers,
  );
}

async function approval(grant: Awaited<ReturnType<typeof prompt>>) {
  const response = await decide(decisionRequest(grant));
  grant.browser.apply(response);
  expect(response.status).toBe(303);
  const code = new URL(response.headers.get("location") ?? origin).searchParams.get("code");
  if (!code) throw new Error("Expected authorization code");
  return code;
}

function tokenRequest(grant: Awaited<ReturnType<typeof prompt>>, code: string, overrides: Record<string, string> = {}) {
  return grant.browser.request(
    "/api/mcp/oauth/token",
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: grant.verifier,
      client_id: grant.registration.clientId,
      redirect_uri: grant.registration.redirectUri,
      resource,
      ...overrides,
    }).toString(),
  );
}

async function expectNativeFailure(
  response: Response,
  reason: "invalid_request" | "access_denied" | "server_error" = "invalid_request",
) {
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe(`/auth/mcp/error?reason=${reason}`);
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.text()).toBe("");
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-10T12:00:00Z"));
  session = { userId: "oauth-user", sessionToken: "session-one", expiresAt: Date.now() + 172_800_000 };
  transport.auth.mockImplementation(async () =>
    session ? { user: { id: session.userId }, expires: new Date(session.expiresAt).toISOString() } : null,
  );
  transport.env.BASE_URL = undefined;
  globalThis.mcpOAuthRateLimits?.attempts.clear();
  globalThis.mcpOAuthRateLimits?.failures.clear();
  globalThis.mcpOAuthRateLimits?.tokenAttempts.clear();
  await db.delete(apiKeys);
  await db.delete(users);
  await db.insert(users).values({ id: "oauth-user", name: "OAuth User" });
});

afterEach(() => vi.useRealTimers());
afterAll(() => {
  transport.closeDatabase();
});

describe("MCP OAuth explicit consent HTTP flow", () => {
  it("requires explicit approval, safely projects consent, then writes the hash and frozen provenance", async () => {
    const grant = await prompt();
    expect(new URL(grant.response.headers.get("location") ?? "/", origin).pathname).toBe("/auth/mcp");
    expect(Object.keys(grant.consent).toSorted()).toEqual([
      "clientId",
      "clientName",
      "consentToken",
      "expiresAt",
      "pendingId",
      "redirectUri",
    ]);
    expect(await db.select().from(apiKeys)).toHaveLength(0);
    expect(grant.response.headers.get("set-cookie")).toContain("HttpOnly; SameSite=Lax; Secure");
    expect(grant.response.headers.get("set-cookie")).not.toContain("Domain=");
    const code = await approval(grant);
    expect(grant.browser.cookies.has(getMcpConsentBindingCookieName(grant.pendingId))).toBe(false);
    const response = await redeem(tokenRequest(grant, code));
    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !("access_token" in body) || typeof body.access_token !== "string")
      throw new Error("Expected access token");
    const [key] = await db.select().from(apiKeys);
    expect(key).toMatchObject({
      userId: "oauth-user",
      oauthClientId: grant.registration.clientId,
      oauthClientName: grant.registration.clientName,
      oauthRedirectUri: callback,
      oauthIssuedAt: new Date(),
    });
    expect(key?.apiKey).not.toContain(body.access_token);
    expect(await comparePasswordsAsync(body.access_token.split(".")[1] ?? "", key?.apiKey ?? "")).toBe(true);
    expect((await redeem(tokenRequest(grant, code))).status).toBe(400);
    expect(await db.select().from(apiKeys)).toHaveLength(1);
    for (const result of [grant.response, response]) {
      expect(result.headers.get("cache-control")).toBe("no-store");
      expect(result.headers.get("referrer-policy")).toBe("no-referrer");
    }
  });

  it("denies once with original empty state, preserving unrelated callback query and clearing conflicting fields", async () => {
    const grant = await prompt();
    const response = await decide(
      decisionRequest(
        grant,
        { decision: "deny" },
        { origin, "sec-fetch-mode": "navigate", "sec-fetch-site": "same-origin" },
      ),
    );
    expect(response.status).toBe(303);
    const destination = new URL(response.headers.get("location") ?? origin);
    expect(destination.searchParams.get("keep")).toBe("one");
    expect(destination.searchParams.get("state")).toBe("");
    expect(destination.searchParams.get("error")).toBe("access_denied");
    expect(destination.searchParams.has("code")).toBe(false);
    expect(destination.searchParams.has("error_description")).toBe(false);
    expect((await decide(decisionRequest(grant))).status).toBe(400);
    expect(await db.select().from(apiKeys)).toHaveLength(0);
  });

  it("login and repeated authorization GETs never grant attacker-owned PKCE automatic access", async () => {
    session = null;
    const browser = new Browser();
    const initiated = await initiate(browser, await client("https://attacker.test/callback"));
    expect(initiated.response.status).toBe(303);
    const login = new URL(initiated.response.headers.get("location") ?? "/", origin);
    expect(login.origin).toBe(origin);
    expect(login.pathname).toBe("/auth/login");
    expect(initiated.pendingId).toBeTruthy();
    session = { userId: "oauth-user", sessionToken: "session-one", expiresAt: Date.now() + 60_000 };
    for (let index = 0; index < 2; index++) {
      const resumed = await authorize(browser.request(`/api/mcp/oauth/authorize?pending=${initiated.pendingId}`));
      expect(resumed.status).toBe(303);
      expect(new URL(resumed.headers.get("location") ?? "/", origin).pathname).toBe("/auth/mcp");
      expect(resumed.headers.get("location")).not.toContain("code=");
      expect(resumed.headers.get("set-cookie")).toBeNull();
    }
    expect(await db.select().from(apiKeys)).toHaveLength(0);
  });

  it("rejects forged decisions, wrong browsers, changed users and same-user relogins without consuming valid consent", async () => {
    const grant = await prompt();
    expect((await decide(decisionRequest(grant, { consentToken: "a".repeat(64) }))).status).toBe(400);
    expect((await decide(decisionRequest(grant, { decision: "anything" }))).status).toBe(400);
    const stranger = new Browser();
    expect(stranger.view(grant.pendingId)).toEqual({ ok: false, error: "invalid_browser" });
    expect(
      (
        await decide(
          stranger.request(
            "/api/mcp/oauth/authorize",
            new URLSearchParams({
              pending: grant.pendingId,
              consentToken: grant.consent.consentToken,
              decision: "approve",
            }).toString(),
            { origin },
          ),
        )
      ).status,
    ).toBe(400);
    grant.browser.cookies.set(sessionTokenCookieName, "session-two");
    expect(grant.browser.view(grant.pendingId)).toEqual({ ok: false, error: "session_changed" });
    expect((await decide(decisionRequest(grant))).status).toBe(400);
    grant.browser.cookies.set(sessionTokenCookieName, "session-one");
    session = null;
    expect((await decide(decisionRequest(grant))).status).toBe(401);
    session = { userId: "other-user", sessionToken: "session-one", expiresAt: Date.now() + 60_000 };
    expect((await decide(decisionRequest(grant))).status).toBe(400);
    session = { userId: "oauth-user", sessionToken: "session-one", expiresAt: Date.now() + 60_000 };
    expect(await approval(grant)).toBeTruthy();
  });

  it("rejects missing, null, cross-origin and forged forwarding origins plus Fetch Metadata mismatches", async () => {
    const grant = await prompt();
    const rejectedHeaders: HeadersInit[] = [
      {},
      { origin: "null" },
      { origin: "https://other.test" },
      { origin: "https://evil.test", "x-forwarded-host": "evil.test", "x-forwarded-proto": "https" },
      { origin, "sec-fetch-site": "cross-site" },
      { origin, "sec-fetch-mode": "no-cors" },
      { origin, "sec-fetch-dest": "iframe" },
    ];
    for (const headers of rejectedHeaders) {
      const response = await decide(decisionRequest(grant, {}, headers));
      expect(response.status).toBe(403);
      expect(response.headers.has("location")).toBe(false);
    }
    transport.env.BASE_URL = "https://configured.test";
    expect((await decide(decisionRequest(grant))).status).toBe(403);
    expect(
      (await decide(decisionRequest(grant, {}, { origin: "https://configured.test", "sec-fetch-site": "same-origin" })))
        .status,
    ).toBe(303);
  });

  it.each([undefined, "https://canonical.test"])(
    "keeps login and consent redirects relative through installed standalone Next with BASE_URL=%s",
    async (baseUrl) => {
      transport.env.BASE_URL = baseUrl;
      session = null;
      const browser = new Browser();
      const publicOrigin = baseUrl ?? "http://homarr.test:7575";
      const throughNext = async (request: Request) => {
        request.headers.set("host", "homarr.test:7575");
        request.headers.set("x-forwarded-proto", "http");
        return installedNextRequest(request);
      };
      const grant = await initiate(browser, await client(), { resource: undefined }, throughNext);
      expect(new URL(grant.request.url).origin).toBe("http://0.0.0.0:3000");
      expect(grant.response.status).toBe(303);
      expect(grant.response.headers.get("location")).toMatch(/^\/auth\/login\?callbackUrl=/);
      expect(new URL(grant.response.headers.get("location") ?? "/", publicOrigin).origin).toBe(publicOrigin);
      expect(grant.response.headers.get("set-cookie")?.includes("; Secure")).toBe(baseUrl !== undefined);
      if (!grant.pendingId) throw new Error("Expected pending login request");
      session = { userId: "oauth-user", sessionToken: "session-one", expiresAt: Date.now() + 60_000 };
      const resumed = await authorize(
        await throughNext(browser.request(`/api/mcp/oauth/authorize?pending=${grant.pendingId}`)),
      );
      expect(resumed.status).toBe(303);
      expect(resumed.headers.get("location")).toBe(`/auth/mcp?pending=${grant.pendingId}`);
      const consent = browser.view(grant.pendingId);
      if (!consent.ok) throw new Error("Expected resumed consent");
      const body = new URLSearchParams({
        pending: grant.pendingId,
        consentToken: consent.consent.consentToken,
        decision: "approve",
      }).toString();
      const wrongScheme = publicOrigin.startsWith("https:")
        ? publicOrigin.replace("https:", "http:")
        : publicOrigin.replace("http:", "https:");
      for (const invalidOrigin of [undefined, "null", wrongScheme, "https://attacker.test"]) {
        const request = browser.request("/api/mcp/oauth/authorize", body);
        if (invalidOrigin !== undefined) request.headers.set("origin", invalidOrigin);
        request.headers.set("forwarded", "host=attacker.test;proto=https");
        request.headers.set("x-forwarded-host", "attacker.test");
        const response = await decide(await throughNext(request));
        expect(response.status).toBe(403);
        expect(await response.json()).toMatchObject({ error: "invalid_request" });
      }
      const approved = await decide(
        await throughNext(browser.request("/api/mcp/oauth/authorize", body, { origin: publicOrigin })),
      );
      expect(approved.status).toBe(303);
      expect(new URL(approved.headers.get("location") ?? origin).searchParams.has("code")).toBe(true);
      expect(approved.headers.get("referrer-policy")).toBe("no-referrer");
    },
  );

  it("keeps an authenticated initial consent redirect relative even when Next exposes only its bind hostname", async () => {
    const browser = new Browser();
    const grant = await initiate(browser, await client(), {}, installedNextRequest);
    expect(new URL(grant.request.url).hostname).toBe("0.0.0.0");
    expect(grant.response.status).toBe(303);
    expect(grant.response.headers.get("location")).toBe(`/auth/mcp?pending=${grant.pendingId}`);
    expect(await db.select().from(apiKeys)).toHaveLength(0);
  });

  it.each([
    { host: "HoMaRr.TeSt:443", protocol: "https", expected: "https://homarr.test" },
    { host: "homarr.test:80", protocol: "http", expected: "http://homarr.test" },
    { host: "homarr.test:7575", protocol: "http", expected: "http://homarr.test:7575" },
    { host: "homarr.test:0", protocol: "http", expected: "http://homarr.test:0" },
    { host: "homarr.test:65535", protocol: "https", expected: "https://homarr.test:65535" },
    { host: "[2001:0DB8:0:0:0:0:0:1]:443", protocol: "https", expected: "https://[2001:db8::1]" },
    { host: "[::1]:80", protocol: "http", expected: "http://[::1]" },
    { host: "[::1]:7575", protocol: "http", expected: "http://[::1]:7575" },
    { host: "127.0.0.1:7575", protocol: "http", expected: "http://127.0.0.1:7575" },
  ])(
    "validates and normalizes public Host $host with the installed Next adapter",
    async ({ host, protocol, expected }) => {
      const grant = await prompt();
      const request = decisionRequest(grant, {}, { origin: expected });
      request.headers.set("host", host);
      request.headers.set("x-forwarded-proto", protocol);
      const adapted = await installedNextRequest(request);
      expect(new URL(adapted.url).hostname).toBe("0.0.0.0");
      expect(new URL(adapted.url).protocol).toBe(`${protocol}:`);
      const response = await decide(adapted);
      expect(response.status).toBe(303);
      expect(new URL(response.headers.get("location") ?? origin).searchParams.has("code")).toBe(true);
    },
  );

  it("rejects missing and malformed Host authorities instead of using bind or forwarding hosts", async () => {
    const grant = await prompt();
    const hosts = [
      undefined,
      "",
      "hom arr.test",
      "homarr\ttest",
      "homarr.test,attacker.test",
      "user@homarr.test",
      "homarr.test/path",
      "homarr.test\\path",
      "homarr.test?query",
      "homarr.test#fragment",
      "homarr%2etest",
      "[::1%25lo0]",
      "homarr.test:abc",
      "homarr.test:-1",
      "homarr.test:65536",
      "homarr.test:",
      "homarr.test:80:80",
      "2001:db8::1",
      "[::1",
      "[not-ipv6]",
      "[::1]:999999",
      "-bad.test",
      "bad-.test",
      "bad..test",
      "bad_name.test",
      `${"a".repeat(64)}.test`,
      "a".repeat(513),
      "127.1",
    ];
    for (const host of hosts) {
      const request = decisionRequest(grant);
      if (host === undefined) request.headers.delete("host");
      else request.headers.set("host", host);
      request.headers.set("forwarded", "host=homarr.test;proto=https");
      request.headers.set("x-forwarded-host", "homarr.test");
      const adapted = await installedNextRequest(request);
      const response = await decide(adapted);
      expect(response.status, `Host=${host}`).toBe(403);
      expect(await response.json()).toMatchObject({ error: "invalid_request" });
    }
    expect(await approval(grant)).toBeTruthy();
  });

  it("never substitutes forwarded authority for Host, including when Next derives its URL scheme from X-Forwarded-Proto", async () => {
    const grant = await prompt();
    const request = decisionRequest(grant, {}, { origin: "https://attacker.test" });
    request.headers.set("forwarded", "host=attacker.test;proto=https");
    request.headers.set("x-forwarded-host", "attacker.test");
    request.headers.set("x-forwarded-proto", "https");
    const adapted = await installedNextRequest(request);
    expect(new URL(adapted.url).origin).toBe("https://0.0.0.0:3000");
    expect((await decide(adapted)).status).toBe(403);
    expect(await approval(grant)).toBeTruthy();
  });

  it("rejects duplicate query, JSON and form fields and bounded or unsafe callback inputs", async () => {
    const registration = await client();
    const duplicate = await authorize(
      new Browser().request(
        `/api/mcp/oauth/authorize?client_id=${registration.clientId}&client_id=${registration.clientId}`,
      ),
    );
    expect(duplicate.status).toBe(400);
    for (const redirectUri of [
      "https://user:pass@remote.test/callback",
      "https://@remote.test/callback",
      "https://remote.test\\callback",
      "https://remote.test/callback#",
      "https://remote.test/callback#fragment",
      `https://remote.test/${"a".repeat(2048)}`,
    ]) {
      const response = await register(
        new Browser().request("/api/mcp/oauth/register", JSON.stringify({ redirect_uris: [redirectUri] }), {
          "content-type": "application/json",
        }),
      );
      expect(response.status).toBe(400);
    }
    const jsonDuplicate = await register(
      new Browser().request(
        "/api/mcp/oauth/register",
        `{"redirect_uris":["https://remote.test"],"client_name":"one","client_\\u006eame":"two"}`,
        { "content-type": "application/json" },
      ),
    );
    expect(jsonDuplicate.status).toBe(400);
    expect(
      (
        await register(
          new Browser().request("/api/mcp/oauth/register", "a".repeat(32_769), { "content-type": "application/json" }),
        )
      ).status,
    ).toBe(400);
    const grant = await prompt();
    const duplicateDecision = new URLSearchParams({
      pending: grant.pendingId,
      consentToken: grant.consent.consentToken,
      decision: "approve",
    });
    duplicateDecision.append("decision", "deny");
    expect(
      (await decide(grant.browser.request("/api/mcp/oauth/authorize", duplicateDecision.toString(), { origin })))
        .status,
    ).toBe(400);
    expect(await approval(grant)).toBeTruthy();
    const rejectedContexts: Record<string, string>[] = [
      { response_type: "token" },
      { code_challenge_method: "plain" },
      { code_challenge_method: "" },
      { scope: "admin" },
      { resource: "https://evil.test/api/mcp" },
    ];
    for (const overrides of rejectedContexts) {
      expect((await initiate(new Browser(), registration, overrides)).response.status).toBe(400);
    }
  });

  it.each(["missing-client", "client", "redirect", "resource", "verifier", "malformed-verifier"])(
    "burns a code on %s mismatch and requires the original redemption context",
    async (mismatch) => {
      const grant = await prompt();
      const code = await approval(grant);
      const changes: Record<string, string> = {};
      if (mismatch === "client" || mismatch === "missing-client")
        changes.client_id = mismatch === "client" ? "b".repeat(32) : "";
      if (mismatch === "redirect") changes.redirect_uri = callback.replace("keep=one", "keep=two");
      if (mismatch === "resource") changes.resource = "";
      if (mismatch === "verifier") changes.code_verifier = randomBytes(32).toString("base64url");
      if (mismatch === "malformed-verifier") changes.code_verifier = "short";
      expect((await redeem(tokenRequest(grant, code, changes))).status).toBe(400);
      expect((await redeem(tokenRequest(grant, code))).status).toBe(400);
      expect(await db.select().from(apiKeys)).toHaveLength(0);
    },
  );

  it("supports omitted redirect_uri but rejects duplicate token fields without issuing a credential", async () => {
    const grant = await prompt();
    const code = await approval(grant);
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: grant.verifier,
      client_id: grant.registration.clientId,
      resource,
    });
    params.append("code", code);
    expect((await redeem(grant.browser.request("/api/mcp/oauth/token", params.toString()))).status).toBe(400);
    params.delete("code");
    params.set("code", code);
    expect((await redeem(grant.browser.request("/api/mcp/oauth/token", params.toString()))).status).toBe(200);
  });

  it.each([undefined, resource, `${resource}/mcp`])(
    "accepts redemption resource %s when authorization omitted resource",
    async (redemptionResource) => {
      const grant = await prompt(new Browser(), undefined, { resource: undefined });
      const code = await approval(grant);
      const params = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        code_verifier: grant.verifier,
        client_id: grant.registration.clientId,
      });
      if (redemptionResource !== undefined) params.set("resource", redemptionResource);
      const response = await redeem(grant.browser.request("/api/mcp/oauth/token", params.toString()));
      expect(response.status).toBe(200);
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
      expect(await db.select().from(apiKeys)).toHaveLength(1);
      expect((await redeem(grant.browser.request("/api/mcp/oauth/token", params.toString()))).status).toBe(400);
    },
  );

  it.each(["https://external.test/api/mcp", ""])(
    "rejects and burns omitted-resource authorization codes redeemed for %s",
    async (redemptionResource) => {
      const grant = await prompt(new Browser(), undefined, { resource: undefined });
      const code = await approval(grant);
      const request = tokenRequest(grant, code, { resource: redemptionResource });
      request.headers.set("x-forwarded-host", "external.test");
      const response = await redeem(request);
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: "invalid_target" });
      expect((await redeem(tokenRequest(grant, code))).status).toBe(400);
      expect(await db.select().from(apiKeys)).toHaveLength(0);
    },
  );

  it.each([undefined, `${resource}/mcp`])(
    "requires the exact originally bound resource instead of %s",
    async (redemptionResource) => {
      const grant = await prompt();
      const code = await approval(grant);
      const params = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        code_verifier: grant.verifier,
        client_id: grant.registration.clientId,
      });
      if (redemptionResource !== undefined) params.set("resource", redemptionResource);
      const response = await redeem(grant.browser.request("/api/mcp/oauth/token", params.toString()));
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: "invalid_target" });
      expect((await redeem(tokenRequest(grant, code))).status).toBe(400);
      expect(await db.select().from(apiKeys)).toHaveLength(0);
    },
  );

  it.each(["navigate", "html"])(
    "uses a fixed local native-error redirect for early POST rejections classified by %s",
    async (classification) => {
      const grant = await prompt();
      const nativeHeaders: Record<string, string> =
        classification === "navigate"
          ? { "sec-fetch-mode": "navigate" }
          : { accept: "application/json, text/html; q=0.9" };
      const originalBody = new URLSearchParams({
        pending: grant.pendingId,
        consentToken: grant.consent.consentToken,
        decision: "approve",
      }).toString();
      const rejected: { headers: Record<string, string>; body: string; status: number }[] = [
        { headers: {}, body: originalBody, status: 403 },
        { headers: { origin: "null" }, body: originalBody, status: 403 },
        {
          headers: { origin: "https://attacker.test", "x-forwarded-host": "attacker.test" },
          body: originalBody,
          status: 403,
        },
        { headers: { origin, "sec-fetch-site": "cross-site" }, body: originalBody, status: 403 },
        { headers: { origin }, body: `${originalBody}&decision=deny`, status: 400 },
        {
          headers: { origin, "content-type": "application/json" },
          body: `{"pending":"${grant.pendingId}","consentToken":"${grant.consent.consentToken}","decision":"approve"`,
          status: 400,
        },
        { headers: { origin }, body: `${originalBody}&redirect_uri=https%3A%2F%2Fattacker.test%2Fsecret`, status: 400 },
      ];
      for (const rejection of rejected) {
        await expectNativeFailure(
          await decide(
            grant.browser.request("/api/mcp/oauth/authorize", rejection.body, {
              ...rejection.headers,
              ...nativeHeaders,
            }),
          ),
        );
        const response = await decide(
          grant.browser.request("/api/mcp/oauth/authorize", rejection.body, {
            ...rejection.headers,
            accept: "application/json",
          }),
        );
        expect(response.status).toBe(rejection.status);
        expect(response.headers.has("location")).toBe(false);
        expect(await response.json()).toMatchObject({ error: "invalid_request" });
      }
      expect(grant.browser.view(grant.pendingId).ok).toBe(true);
      expect(await approval(grant)).toBeTruthy();
    },
  );

  it.each(["proof", "browser", "missing-session", "changed-session", "expired"])(
    "uses a secret-free local native redirect for %s failures while preserving protocol errors",
    async (failure) => {
      const grant = await prompt();
      const browser = failure === "browser" ? new Browser() : grant.browser;
      const body = new URLSearchParams({
        pending: grant.pendingId,
        consentToken: failure === "proof" ? "a".repeat(64) : grant.consent.consentToken,
        decision: "approve",
      }).toString();
      if (failure === "missing-session") session = null;
      if (failure === "changed-session") grant.browser.cookies.set(sessionTokenCookieName, "session-two");
      if (failure === "expired") vi.setSystemTime(grant.consent.expiresAt);
      await expectNativeFailure(
        await decide(
          browser.request("/api/mcp/oauth/authorize", body, {
            origin,
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
          }),
        ),
      );
      const protocolResponse = await decide(
        browser.request("/api/mcp/oauth/authorize", body, { origin, accept: "application/json" }),
      );
      const expectedError =
        failure === "proof"
          ? "invalid_request"
          : failure === "browser"
            ? "invalid_browser"
            : failure === "missing-session"
              ? "login_required"
              : failure === "changed-session"
                ? "session_changed"
                : "unavailable";
      expect(protocolResponse.status).toBe(failure === "missing-session" ? 401 : 400);
      expect(protocolResponse.headers.has("location")).toBe(false);
      expect(await protocolResponse.json()).toMatchObject({ error: expectedError });
      session = { userId: "oauth-user", sessionToken: "session-one", expiresAt: Date.now() + 172_800_000 };
      grant.browser.cookies.set(sessionTokenCookieName, "session-one");
      expect(await db.select().from(apiKeys)).toHaveLength(0);
      if (failure !== "expired") expect(await approval(grant)).toBeTruthy();
    },
  );

  it("maps unexpected transport authentication failures to a fixed server_error page without consuming consent", async () => {
    const grant = await prompt();
    transport.auth.mockRejectedValueOnce(new Error(`${grant.pendingId} ${grant.consent.consentToken} ${callback}`));
    await expectNativeFailure(
      await decide(decisionRequest(grant, {}, { origin, accept: "text/html" })),
      "server_error",
    );
    transport.auth.mockRejectedValueOnce(new Error("private authentication failure"));
    const response = await decide(decisionRequest(grant));
    expect(response.status).toBe(500);
    expect(response.headers.has("location")).toBe(false);
    expect(await response.json()).toEqual({
      error: "server_error",
      error_description: "Failed to complete consent decision",
    });
    expect(await approval(grant)).toBeTruthy();
  });

  it("requires client_id even when the verifier is correct and client_secret is supplied", async () => {
    const grant = await prompt();
    const code = await approval(grant);
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: grant.verifier,
      resource,
      client_secret: "anything",
    });
    expect((await redeem(grant.browser.request("/api/mcp/oauth/token", params.toString()))).status).toBe(400);
    expect((await redeem(tokenRequest(grant, code))).status).toBe(400);
    expect(await db.select().from(apiKeys)).toHaveLength(0);
  });

  it("supports exact remote HTTP(S) callback query, absent state and native multipart decisions", async () => {
    const registration = await client("https://remote.test/callback?keep=one&state=stale&error=stale");
    const browser = new Browser();
    const verifier = randomBytes(32).toString("base64url");
    const params = new URLSearchParams({
      client_id: registration.clientId,
      redirect_uri: registration.redirectUri,
      response_type: "code",
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
    });
    const response = await authorize(browser.request(`/api/mcp/oauth/authorize?${params}`));
    browser.apply(response);
    const pendingId = new URL(response.headers.get("location") ?? "/", origin).searchParams.get("pending");
    if (!pendingId) throw new Error("Expected request");
    const view = browser.view(pendingId);
    if (!view.ok) throw new Error("Expected consent");
    const form = new FormData();
    form.set("pending", pendingId);
    form.set("consentToken", view.consent.consentToken);
    form.set("decision", "approve");
    const approved = await decide(
      new Request(`${origin}/api/mcp/oauth/authorize`, {
        method: "POST",
        headers: {
          origin,
          host: "homarr.test",
          cookie: [...browser.cookies].map(([name, value]) => `${name}=${value}`).join("; "),
        },
        body: form,
      }),
    );
    expect(approved.status).toBe(303);
    const destination = new URL(approved.headers.get("location") ?? origin);
    expect(destination.origin).toBe("https://remote.test");
    expect(destination.searchParams.get("keep")).toBe("one");
    expect(destination.searchParams.has("state")).toBe(false);
    expect(destination.searchParams.has("error")).toBe(false);
    const token = await redeem(
      browser.request(
        "/api/mcp/oauth/token",
        JSON.stringify({
          grant_type: "authorization_code",
          code: destination.searchParams.get("code"),
          code_verifier: verifier,
          client_id: registration.clientId,
        }),
        { "content-type": "application/json" },
      ),
    );
    expect(token.status).toBe(200);
  });

  it("allows only one concurrent decision and one concurrent token exchange", async () => {
    const grant = await prompt();
    const decisions = await Promise.all([decide(decisionRequest(grant)), decide(decisionRequest(grant))]);
    expect(decisions.map((response) => response.status).toSorted()).toEqual([303, 400]);
    const success = decisions.find((response) => response.status === 303);
    const code = new URL(success?.headers.get("location") ?? origin).searchParams.get("code");
    if (!code) throw new Error("Expected code");
    const tokens = await Promise.all([redeem(tokenRequest(grant, code)), redeem(tokenRequest(grant, code))]);
    expect(tokens.map((response) => response.status).toSorted()).toEqual([200, 400]);
    expect(await db.select().from(apiKeys)).toHaveLength(1);
  });

  it("burns unsuccessful persistence attempts and never returns a secret", async () => {
    const grant = await prompt();
    const code = await approval(grant);
    await db.delete(users);
    const response = await redeem(tokenRequest(grant, code));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "server_error", error_description: "Failed to issue access token" });
    expect((await redeem(tokenRequest(grant, code))).status).toBe(400);
    expect(await db.select().from(apiKeys)).toHaveLength(0);
  });

  it("enforces pending, code and current-session expiry at use time without extending deadlines", async () => {
    const grant = await prompt();
    vi.setSystemTime(Date.now() + 60_000);
    expect(grant.browser.view(grant.pendingId)).toMatchObject({
      ok: true,
      consent: { expiresAt: grant.consent.expiresAt },
    });
    session = { userId: "oauth-user", sessionToken: "session-one", expiresAt: Date.now() };
    expect(grant.browser.view(grant.pendingId)).toEqual({ ok: false, error: "login_required" });
    expect((await decide(decisionRequest(grant))).status).toBe(401);
    session.expiresAt = Date.now() + 172_800_000;
    vi.setSystemTime(grant.consent.expiresAt);
    expect(grant.browser.view(grant.pendingId)).toEqual({ ok: false, error: "unavailable" });
    expect((await decide(decisionRequest(grant))).status).toBe(400);
    const second = await prompt();
    const code = await approval(second);
    vi.setSystemTime(Date.now() + 300_000);
    expect((await redeem(tokenRequest(second, code))).status).toBe(400);
  });

  it("rechecks client expiry at initiation, viewing, decision and redemption", async () => {
    const registration = await client();
    vi.setSystemTime(Date.now() + 86_340_000);
    const grant = await prompt(new Browser(), registration);
    const redeemable = await prompt(new Browser(), registration);
    const code = await approval(redeemable);
    vi.setSystemTime(Date.now() + 60_000);
    expect((await initiate(new Browser(), registration)).response.status).toBe(400);
    expect(grant.browser.view(grant.pendingId)).toEqual({ ok: false, error: "unavailable" });
    expect((await decide(decisionRequest(grant))).status).toBe(400);
    expect((await redeem(tokenRequest(redeemable, code))).status).toBe(400);
  });

  it("preserves parallel cookie-less requests, reconciles to eight retaining current/newest, and clears only its own completed cookie", async () => {
    const registration = await client();
    const browsers = Array.from({ length: 10 }, () => new Browser());
    const grants = await Promise.all(browsers.map((browser) => initiate(browser, registration)));
    const combined = new Browser();
    for (const browser of browsers) for (const [name, value] of browser.cookies) combined.cookies.set(name, value);
    const first = grants[0]?.pendingId;
    const second = grants[1]?.pendingId;
    if (!first || !second) throw new Error("Expected parallel requests");
    expect(combined.view(first).ok).toBe(true);
    expect(combined.view(second).ok).toBe(true);
    const resumed = await authorize(combined.request(`/api/mcp/oauth/authorize?pending=${first}`));
    combined.apply(resumed);
    expect([...combined.cookies.keys()].filter((name) => name.startsWith("homarr.mcp-consent."))).toHaveLength(8);
    expect(combined.view(first).ok).toBe(true);
    expect(combined.view(second)).toEqual({ ok: false, error: "unavailable" });
    for (const grant of grants.slice(3)) expect(combined.view(grant.pendingId ?? "").ok).toBe(true);
    const active = combined.view(first);
    if (!active.ok) throw new Error("Expected retained consent");
    const completed = await decide(
      combined.request(
        "/api/mcp/oauth/authorize",
        new URLSearchParams({ pending: first, consentToken: active.consent.consentToken, decision: "deny" }).toString(),
        { origin },
      ),
    );
    expect(completed.headers.getSetCookie()).toHaveLength(1);
    combined.apply(completed);
    expect([...combined.cookies.keys()].filter((name) => name.startsWith("homarr.mcp-consent."))).toHaveLength(7);
  });

  it("keeps both initially cookie-less parallel prompts independently approvable", async () => {
    const registration = await client();
    const firstBrowser = new Browser();
    const secondBrowser = new Browser();
    const grants = await Promise.all([initiate(firstBrowser, registration), initiate(secondBrowser, registration)]);
    const combined = new Browser();
    for (const browser of [firstBrowser, secondBrowser])
      for (const [name, value] of browser.cookies) combined.cookies.set(name, value);
    for (const grant of grants) {
      if (!grant.pendingId) throw new Error("Expected pending request");
      const view = combined.view(grant.pendingId);
      if (!view.ok) throw new Error("Expected consent");
      const approved = await decide(
        combined.request(
          "/api/mcp/oauth/authorize",
          new URLSearchParams({
            pending: grant.pendingId,
            consentToken: view.consent.consentToken,
            decision: "approve",
          }).toString(),
          { origin },
        ),
      );
      expect(approved.status).toBe(303);
      expect(approved.headers.getSetCookie()).toHaveLength(1);
      combined.apply(approved);
    }
  });

  it("rejects duplicate binding and session cookies without consuming the legitimate pending grant", async () => {
    const grant = await prompt();
    const bindingName = getMcpConsentBindingCookieName(grant.pendingId);
    for (const name of [bindingName, sessionTokenCookieName]) {
      const request = decisionRequest(grant);
      request.headers.set("cookie", `${request.headers.get("cookie")}; ${name}=${grant.browser.cookies.get(name)}`);
      expect((await decide(request)).status).toBeGreaterThanOrEqual(400);
    }
    expect(await approval(grant)).toBeTruthy();
  });

  it("does not invalidate someone else's pending request when cleaning wrong-bound or unknown cookies", async () => {
    const grant = await prompt();
    const attacker = new Browser();
    attacker.cookies.set(getMcpConsentBindingCookieName(grant.pendingId), "a".repeat(64));
    attacker.cookies.set(getMcpConsentBindingCookieName("b".repeat(32)), "c".repeat(64));
    const response = await authorize(attacker.request(`/api/mcp/oauth/authorize?pending=${grant.pendingId}`));
    expect(response.status).toBe(400);
    expect(response.headers.getSetCookie()).toHaveLength(2);
    expect(grant.browser.view(grant.pendingId).ok).toBe(true);
    expect(await approval(grant)).toBeTruthy();
  });

  it("preserves registration and failed-redemption rate limits with their existing one-minute windows", async () => {
    const browser = new Browser();
    const ip = "192.0.2.123";
    for (let index = 0; index < 6; index++) {
      const request = browser.request("/api/mcp/oauth/register", JSON.stringify({ redirect_uris: [callback] }), {
        "content-type": "application/json",
      });
      request.headers.set("x-homarr-client-ip", ip);
      const response = await register(request);
      expect(response.status).toBe(index < 5 ? 201 : 429);
      if (index === 5) expect(response.headers.get("retry-after")).toBe("60");
    }
    const attempt = () => {
      const request = browser.request(
        "/api/mcp/oauth/token",
        new URLSearchParams({
          grant_type: "authorization_code",
          code: "f".repeat(64),
          code_verifier: "a".repeat(43),
          client_id: "b".repeat(32),
        }).toString(),
      );
      request.headers.set("x-homarr-client-ip", ip);
      return request;
    };
    for (let index = 0; index < 11; index++) expect((await redeem(attempt())).status).toBe(index < 10 ? 400 : 429);
    vi.setSystemTime(Date.now() + 60_000);
    expect((await redeem(attempt())).status).toBe(400);
  });
});
