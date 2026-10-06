// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.SECRET_ENCRYPTION_KEY = "ff3f4f7ce30e870c9630de9e5d244ffa81101a24ed0dfe5f064beb53a7e684f1";
  process.env.ENABLE_DNS_CACHING = "false";
});

// A stateful stand-in for redis, so a session actually survives between calls and the
// expiry logic can be exercised end to end.
const store = vi.hoisted(() => new Map<string, { value: string; ttlSeconds?: number }>());

vi.mock("@homarr/redis", () => ({
  getIntegrationSessionStoreKey: (integrationId: string) => `session-store:${integrationId}`,
  createGetSetChannel: (name: string) => ({
    getAsync: () => Promise.resolve(store.get(name)?.value ?? null),
    setAsync: (value: string, options?: { ttlSeconds?: number }) => {
      store.set(name, { value, ttlSeconds: options?.ttlSeconds });
      return Promise.resolve();
    },
    removeAsync: () => {
      store.delete(name);
      return Promise.resolve();
    },
  }),
}));

vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  ErrorWithMetadata: class extends Error {},
}));

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: (url: URL | string, init?: RequestInit) => fetch(url, init),
  createAxiosCertificateInstanceAsync: vi.fn().mockResolvedValue({}),
  createCertificateAgentAsync: vi.fn().mockResolvedValue({ close: vi.fn() }),
}));

vi.mock("@homarr/core/infrastructure/certificates", () => ({
  getTrustedCertificateHostnamesAsync: vi.fn().mockResolvedValue([]),
  getAllTrustedCertificatesAsync: vi.fn().mockResolvedValue([]),
}));

import { BeszelIntegration, isSessionExpired, parseTokenExpiration } from "../beszel-integration";

const base64Url = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const createToken = (expiresAtSeconds: number) => `header.${base64Url({ exp: expiresAtSeconds })}.signature`;

describe("parseTokenExpiration", () => {
  test("reads the exp claim as epoch milliseconds", () => {
    expect(parseTokenExpiration(createToken(1_800_000_000))).toBe(1_800_000_000_000);
  });

  test("decodes base64url payloads containing - and _", () => {
    // A payload that base64-encodes with both + and /, which must be url-decoded first.
    const token = `header.${Buffer.from(JSON.stringify({ sub: "a>b?c>>", exp: 1_700_000_000 })).toString("base64url")}.sig`;
    expect(parseTokenExpiration(token)).toBe(1_700_000_000_000);
  });

  test.each([
    ["not-a-jwt", "no segments"],
    ["header.%%%not-base64%%%.signature", "undecodable payload"],
    [`header.${base64Url({ id: "user-1" })}.signature`, "no exp claim"],
    [`header.${base64Url({ exp: "soon" })}.signature`, "non-numeric exp"],
  ])("returns null for %s (%s)", (token) => {
    expect(parseTokenExpiration(token)).toBeNull();
  });
});

const session = (expiresAt?: number) => ({ token: "t", userId: "u", expiresAt });

describe("isSessionExpired", () => {
  const now = Date.UTC(2026, 6, 26, 12, 0, 0);

  test("treats a session with an unknown expiry as valid, falling back to the 401 retry", () => {
    expect(isSessionExpired(session(undefined), now)).toBe(false);
  });

  test("keeps a session that is comfortably in the future", () => {
    expect(isSessionExpired(session(now + 60 * 60 * 1000), now)).toBe(false);
  });

  test("expires a session that lapses within the leeway window", () => {
    expect(isSessionExpired(session(now + 30_000), now)).toBe(true);
  });

  test("expires a session that has already lapsed", () => {
    expect(isSessionExpired(session(now - 1), now)).toBe(true);
  });
});

const createIntegration = () =>
  new BeszelIntegration({
    id: "test-beszel-session",
    name: "Test Beszel",
    url: "http://localhost:8090",
    externalUrl: null,
    decryptedSecrets: [
      { kind: "username", value: "user@example.com" },
      { kind: "password", value: "password" },
    ],
  });

describe("BeszelIntegration session lifecycle", () => {
  const originalFetch = globalThis.fetch;
  let authCount = 0;
  let issuedToken = "";

  beforeEach(() => {
    store.clear();
    authCount = 0;
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/collections/users/auth-with-password")) {
        authCount++;
        return Promise.resolve(Response.json({ token: issuedToken, record: { id: "user-1" } }));
      }
      if (url.includes("/api/collections/systems/records")) {
        return Promise.resolve(Response.json({ page: 1, perPage: 500, totalItems: 0, totalPages: 0, items: [] }));
      }
      throw new Error(`Unexpected request: ${url}`);
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("reuses a stored session while its token is still valid", async () => {
    issuedToken = createToken(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);
    const integration = createIntegration();

    await integration.getSystemsAsync();
    await integration.getSystemsAsync();

    expect(authCount).toBe(1);
  });

  test("persists the session with a ttl matching the token lifetime", async () => {
    const lifetimeSeconds = 7 * 24 * 60 * 60;
    issuedToken = createToken(Math.floor(Date.now() / 1000) + lifetimeSeconds);

    await createIntegration().getSystemsAsync();

    const stored = store.get("session-store:test-beszel-session");
    expect(stored?.ttlSeconds).toBeGreaterThan(lifetimeSeconds - 60);
    expect(stored?.ttlSeconds).toBeLessThanOrEqual(lifetimeSeconds);
  });

  test("re-authenticates once the stored token has expired", async () => {
    // Beszel replies 200 + empty list to an expired token instead of 401, so without an expiry
    // check the stale session would be reused forever. See homarr-labs/homarr#6470.
    vi.useFakeTimers();

    try {
      const lifetimeSeconds = 7 * 24 * 60 * 60;
      const issuedAt = new Date("2026-07-26T00:00:00.000Z");
      vi.setSystemTime(issuedAt);
      issuedToken = createToken(Math.floor(issuedAt.getTime() / 1000) + lifetimeSeconds);
      const integration = createIntegration();

      await integration.getSystemsAsync();
      expect(authCount).toBe(1);

      // Step past the token's lifetime, exactly as an idle Homarr instance would.
      vi.setSystemTime(new Date(issuedAt.getTime() + (lifetimeSeconds + 1) * 1000));
      issuedToken = createToken(Math.floor(Date.now() / 1000) + lifetimeSeconds);
      await integration.getSystemsAsync();

      expect(authCount).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  test("uses a short-lived token that is valid now but lapses inside the leeway window", async () => {
    // The leeway exists to stop a token expiring mid-request; it must not reject a token that is
    // still valid, or an instance with a short authToken.duration could never authenticate.
    issuedToken = createToken(Math.floor(Date.now() / 1000) + 30);

    await expect(createIntegration().getSystemsAsync()).resolves.toEqual([]);
    expect(authCount).toBe(1);
    expect(store.get("session-store:test-beszel-session")?.ttlSeconds).toBeGreaterThan(0);
  });

  test("fails loudly when Beszel issues an already-expired token instead of returning empty data", async () => {
    issuedToken = createToken(Math.floor(Date.now() / 1000) - 600);

    const caught = await createIntegration()
      .getSystemsAsync()
      .then(
        () => null,
        (error: unknown) => error,
      );

    // The integration base class wraps thrown errors, so assert against the cause chain.
    const messages: string[] = [];
    for (let error: unknown = caught; error instanceof Error; error = error.cause) messages.push(error.message);
    expect(messages.join(" | ")).toMatch(/clock skew/i);

    // The dead token must not be persisted, or it would be served to the next caller.
    expect(store.has("session-store:test-beszel-session")).toBe(false);
    expect(authCount).toBe(1);
  });

  test("does not store a ttl when the token carries no readable expiry", async () => {
    issuedToken = "opaque-token-without-claims";

    await createIntegration().getSystemsAsync();

    expect(store.get("session-store:test-beszel-session")?.ttlSeconds).toBeUndefined();
  });
});
