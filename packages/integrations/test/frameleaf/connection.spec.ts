// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  FrameleafConnection,
  normalizeFrameleafOrigin,
  validateFrameleafCallback,
} from "../../src/frameleaf/connection";
import type { FrameleafState, FrameleafStore } from "../../src/frameleaf/connection";

class Store implements FrameleafStore {
  value: FrameleafState | null = null;
  async readAsync() {
    return this.value === null ? null : structuredClone(this.value);
  }
  async replaceAsync(previous: FrameleafState | null, next: FrameleafState | null) {
    if (JSON.stringify(previous) !== JSON.stringify(this.value)) return false;
    this.value = structuredClone(next);
    return true;
  }
}
const origin = "https://library.example.test";
const callback = "https://homarr.example.test/api/integrations/frameleaf/callback";
const digest = (value: string) => createHash("sha256").update(value).digest("base64url");
const connected = (): Extract<FrameleafState, { tokens: unknown }> => ({
  version: 1,
  status: "connected",
  origin,
  clientId: "client",
  tokens: { accessToken: "expired", refreshToken: "single-use", expiresAt: 0 },
  connection: { grantId: "grant", libraryUserId: "owner" },
});

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("Frameleaf connection boundary", () => {
  it("rejects credentials, paths, queries and non-HTTP origins", () => {
    for (const value of [
      "https://u:p@host.test",
      "https://host.test/path",
      "https://host.test?key=x",
      "https://host.test/#x",
      "file:///tmp",
    ])
      expect(() => normalizeFrameleafOrigin(value)).toThrow();
    expect(normalizeFrameleafOrigin("http://192.168.1.3:2283/")).toBe("http://192.168.1.3:2283");
  });
  it("requires the exact HTTPS callback path", () => {
    expect(validateFrameleafCallback(callback)).toBe(callback);
    for (const value of [
      callback + "?next=x",
      callback + "/",
      callback.replace("https:", "http:"),
      "https://evil.test/redirect",
    ])
      expect(() => validateFrameleafCallback(value)).toThrow();
  });
  it("binds PKCE and state to the user and browser session, then consumes the callback once", async () => {
    const store = new Store();
    let challenge = "";
    let exchanges = 0;
    const client = new FrameleafConnection(store, async (input, init) => {
      if (input.endsWith("/.well-known/oauth-protected-resource/api/connect"))
        return response({
          resource: origin + "/api/connect",
          authorization_servers: [origin],
          scopes_supported: ["library:read"],
        });
      if (input.endsWith("/.well-known/oauth-authorization-server"))
        return response({
          issuer: origin,
          authorization_endpoint: origin + "/api/oauth/apps/authorize",
          token_endpoint: origin + "/api/oauth/apps/token",
          code_challenge_methods_supported: ["S256"],
        });
      if (input.endsWith("/token")) {
        exchanges++;
        const parameters = new URLSearchParams(String(init?.body));
        expect(digest(parameters.get("code_verifier") ?? "")).toBe(challenge);
        expect(parameters.get("resource")).toBe(origin + "/api/connect");
        return response({
          access_token: "access",
          refresh_token: "refresh",
          token_type: "Bearer",
          expires_in: 3600,
          scope: "library:read",
        });
      }
      return response({
        protocolVersion: 1,
        scopes: ["library:read"],
        connection: { grantId: "grant", libraryUserId: "owner" },
      });
    });
    const authorization = new URL(
      await client.startAsync({ origin, clientId: "client", callback, userId: "alice", sessionId: "session-a" }),
    );
    challenge = authorization.searchParams.get("code_challenge") ?? "";
    const state = authorization.searchParams.get("state") ?? "";
    const request = { state, code: "code", userId: "alice", sessionId: "session-a" };
    await expect(client.completeAsync({ ...request, userId: "bob" })).rejects.toThrow();
    await expect(client.completeAsync({ ...request, sessionId: "session-b" })).rejects.toThrow();
    await expect(client.completeAsync({ ...request, state: "wrong" })).rejects.toThrow();
    expect(exchanges).toBe(0);
    await client.completeAsync(request);
    await expect(client.completeAsync(request)).rejects.toThrow();
    expect(exchanges).toBe(1);
    expect(store.value?.status).toBe("connected");
  });
  it("keeps failed initial verification recoverable without exposing the Library token", async () => {
    const store = new Store();
    store.value = {
      version: 1,
      origin,
      clientId: "client",
      status: "pending",
      pending: {
        stateHash: digest("state"),
        sessionHash: digest("session"),
        userId: "alice",
        verifier: "verifier",
        callback,
        expiresAt: Date.now() + 300000,
      },
    };
    const client = new FrameleafConnection(store, async (url) =>
      url.endsWith("/token")
        ? response({ access_token: "access", refresh_token: "refresh", token_type: "Bearer", expires_in: 3600 })
        : response({}, 503),
    );
    await expect(
      client.completeAsync({ state: "state", code: "code", userId: "alice", sessionId: "session" }),
    ).rejects.toThrow();
    expect(store.value).toMatchObject({ status: "uncertain", tokens: { refreshToken: "refresh" } });
  });

  it("rejects an expired consent without exchanging the code", async () => {
    const store = new Store();
    store.value = {
      version: 1,
      origin,
      clientId: "client",
      status: "pending",
      pending: {
        stateHash: digest("state"),
        sessionHash: digest("session"),
        userId: "alice",
        verifier: "verifier",
        callback,
        expiresAt: 0,
      },
    };
    let calls = 0;
    const client = new FrameleafConnection(store, async () => {
      calls++;
      return response({});
    });
    await expect(
      client.completeAsync({ state: "state", code: "code", userId: "alice", sessionId: "session" }),
    ).rejects.toThrow();
    expect(calls).toBe(0);
  });

  it("coordinates independent callers and persists the entire rotated token set", async () => {
    const store = new Store();
    store.value = connected();
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 25));
      return response({
        access_token: "new-access",
        refresh_token: "new-refresh",
        token_type: "Bearer",
        expires_in: 3600,
      });
    };
    const first = new FrameleafConnection(store, fetcher);
    const second = new FrameleafConnection(store, fetcher);
    expect(await Promise.all([first.accessTokenAsync(), second.accessTokenAsync(), first.accessTokenAsync()])).toEqual([
      "new-access",
      "new-access",
      "new-access",
    ]);
    expect(calls).toBe(1);
    expect(store.value).toMatchObject({
      status: "connected",
      tokens: { accessToken: "new-access", refreshToken: "new-refresh" },
    });
  });
  it("never retries a possibly spent refresh token after an uncertain response", async () => {
    const store = new Store();
    store.value = connected();
    let calls = 0;
    const client = new FrameleafConnection(store, async () => {
      calls++;
      throw new Error("response lost");
    });
    await expect(client.accessTokenAsync()).rejects.toThrow();
    await expect(client.accessTokenAsync()).rejects.toThrow();
    expect(calls).toBe(1);
    expect(store.value).toMatchObject({ status: "uncertain", tokens: { refreshToken: "single-use" } });
  });
  it("fails closed when persistence cannot claim ownership", async () => {
    const store = new Store();
    store.value = connected();
    store.replaceAsync = async () => {
      throw new Error("database unavailable");
    };
    let calls = 0;
    await expect(
      new FrameleafConnection(store, async () => {
        calls++;
        return response({});
      }).accessTokenAsync(),
    ).rejects.toThrow();
    expect(calls).toBe(0);
  });
  it("retains uncertain credentials until revocation succeeds", async () => {
    const store = new Store();
    store.value = { ...connected(), status: "uncertain" };
    let attempts = 0;
    const client = new FrameleafConnection(store, async (_url, init) => {
      expect(new URLSearchParams(String(init?.body)).get("token")).toBe("single-use");
      return response({}, ++attempts === 1 ? 503 : 200);
    });
    await expect(client.disconnectAsync()).rejects.toThrow();
    expect(store.value?.status).toBe("revoking");
    await client.disconnectAsync();
    expect(store.value).toBeNull();
  });
});
