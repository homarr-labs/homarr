import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateWorkerIdentity, getWorkerId, signIdentity } from "@homarr/remote-protocol";

import { createRemotePlatformApp } from "./app";
import { enrollmentMessage } from "./enrollment";
import { pocketBaseWorkshopAuth } from "./auth";
import type { WorkshopAuth } from "./auth";
import { PlatformStore } from "./store";
import type {
  EnrollmentChallenge,
  PlatformSession,
  WorkerConnection,
  WorkerEnrollment,
  WorkerInvite,
  WorkerShare,
} from "./types";

const origin = "https://homarr.test";
const basePath = "/remote";
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Expected fixture value");
  return value;
}

function fixture() {
  let time = 1_900_000_000_000;
  const directory = mkdtempSync(join(tmpdir(), "homarr-platform-"));
  const path = join(directory, "platform.sqlite");
  const store = new PlatformStore(path);
  cleanups.push(() => {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const auth: WorkshopAuth = {
    workshopApiUrl: origin,
    async authenticate(token) {
      const [prefix, id, login] = token.split(":");
      if (prefix !== "fixture-session" || !id || !login) throw new Error("Invalid fixture token");
      return { workshopId: id.padStart(15, "0"), login, name: login, avatarUrl: null };
    },
  };
  const app = createRemotePlatformApp({ store, publicUrl: `${origin}${basePath}`, auth, now: () => time });
  class Client {
    cookie = "";
    csrfToken = "";
    userId = "";
    async request(
      pathname: string,
      method = "GET",
      body?: unknown,
      headers: Record<string, string> = {},
    ): Promise<Response> {
      const requestHeaders = new Headers({ Cookie: this.cookie, ...headers });
      if (method !== "GET") {
        if (!requestHeaders.has("Origin")) requestHeaders.set("Origin", origin);
        if (!requestHeaders.has("X-CSRF-Token")) requestHeaders.set("X-CSRF-Token", this.csrfToken);
      }
      if (body !== undefined) requestHeaders.set("Content-Type", "application/json");
      const response = await app.request(`${origin}${basePath}${pathname}`, {
        method,
        headers: requestHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const cookies = response.headers.getSetCookie();
      for (const cookie of cookies) {
        const entry = required(cookie.split(";")[0]);
        const name = entry.slice(0, entry.indexOf("="));
        const existing = this.cookie.split("; ").filter((part) => part && !part.startsWith(`${name}=`));
        if (!entry.endsWith("=")) existing.push(entry);
        this.cookie = existing.join("; ");
      }
      return response;
    }
    async signIn(id: string, login = id) {
      const config = (await (await this.request("/api/auth/config")).json()) as { csrfToken: string };
      const response = await this.request(
        "/auth/workshop/session",
        "POST",
        { token: `fixture-session:${id}:${login}` },
        { "X-CSRF-Token": config.csrfToken },
      );
      expect(response.status).toBe(200);
      const session = (await response.json()) as PlatformSession;
      this.csrfToken = required(session.csrfToken);
      this.userId = required(session.user).id;
      return session;
    }
  }
  return {
    store,
    path,
    app,
    Client,
    now: () => time,
    advance: (milliseconds: number) => {
      time += milliseconds;
    },
  };
}

async function enrollment(client: InstanceType<ReturnType<typeof fixture>["Client"]>) {
  const { challenge } = (await (await client.request("/api/workers/challenge", "POST")).json()) as {
    challenge: EnrollmentChallenge;
  };
  const identity = await generateWorkerIdentity();
  const input: WorkerEnrollment = {
    challenge,
    workerId: await getWorkerId(identity.publicJwk),
    workerPublicKey: identity.publicJwk,
    workerSigningKey: identity.publicJwk,
    signature: "",
    name: "Home worker",
    mode: "relay",
    relayUrl: "wss://relay.test/relay",
    directUrl: "https://home.tailnet.test",
  };
  input.signature = await signIdentity(identity, enrollmentMessage(input));
  return { input, identity };
}

async function linked(client: InstanceType<ReturnType<typeof fixture>["Client"]>) {
  const proof = await enrollment(client);
  const response = await client.request("/api/workers", "POST", proof.input);
  expect(response.status).toBe(201);
  const { worker } = (await response.json()) as { worker: WorkerConnection };
  return { ...proof, worker };
}

describe("remote platform security boundaries", () => {
  test("Workshop login verifies browser CSRF and rotates secure sessions without a second GitHub app", async () => {
    const f = fixture();
    const browser = new f.Client();
    const configResponse = await browser.request("/api/auth/config");
    const config = (await configResponse.json()) as { csrfToken: string; workshopApiUrl: string; provider: string };
    expect(config.workshopApiUrl).toBe(origin);
    expect(config.provider).toBe("github");
    expect(configResponse.headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin-allow-popups");
    const cookie = required(configResponse.headers.getSetCookie()[0]);
    expect(cookie).toContain("__Host-homarr_remote_login=");
    for (const attribute of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/"]) expect(cookie).toContain(attribute);
    const stranger = new f.Client();
    const login = { token: "fixture-session:123:alice" };
    expect(
      (await stranger.request("/auth/workshop/session", "POST", login, { "X-CSRF-Token": config.csrfToken })).status,
    ).toBe(403);
    expect((await browser.request("/auth/workshop/session", "POST", login, { "X-CSRF-Token": "wrong" })).status).toBe(
      403,
    );
    const success = await browser.request("/auth/workshop/session", "POST", login, {
      "X-CSRF-Token": config.csrfToken,
    });
    expect(success.status).toBe(200);
    expect(success.headers.getSetCookie().join(" ")).toContain("__Host-homarr_remote_session=");
    expect(
      (await browser.request("/auth/workshop/session", "POST", login, { "X-CSRF-Token": config.csrfToken })).status,
    ).toBe(403);
    const session = (await (await browser.request("/api/session")).json()) as PlatformSession;
    expect(session.user?.workshopId).toBe("000000000000123");
    expect(session.csrfToken).toHaveLength(43);
    const oldCookie = browser.cookie;
    await browser.signIn("123", "renamed");
    expect(
      (await (await stranger.request("/api/session", "GET", undefined, { Cookie: oldCookie })).json()).user,
    ).toBeNull();
    expect((await (await browser.request("/api/session")).json()).user.login).toBe("renamed");
    expect((await browser.request("/auth/github")).status).toBe(404);
  });

  test("expired platform sessions are rejected and /remote routes stay on the main domain", async () => {
    const f = fixture();
    const browser = new f.Client();
    await browser.signIn("123");
    f.advance(3_601_000);
    expect((await (await browser.request("/api/session")).json()).user).toBeNull();
    expect((await f.app.request(`${origin}/api/session`)).status).toBe(404);
    expect((await f.app.request(`${origin}/remote/api/session`)).status).toBe(200);
    expect(() =>
      createRemotePlatformApp({ store: f.store, publicUrl: "http://homarr.test/remote", auth: {} as WorkshopAuth }),
    ).toThrow("HTTPS");
    expect(() =>
      createRemotePlatformApp({
        store: f.store,
        publicUrl: "https://user:password@homarr.test/remote",
        auth: {} as WorkshopAuth,
      }),
    ).toThrow("credentials");
  });

  test("authenticated mutations require same origin and CSRF, and bodies are bounded", async () => {
    const f = fixture();
    const browser = new f.Client();
    expect((await browser.request("/api/workers")).status).toBe(401);
    await browser.signIn("123");
    expect((await browser.request("/api/workers/challenge", "POST", {}, { Origin: "https://evil.test" })).status).toBe(
      403,
    );
    expect((await browser.request("/api/workers/challenge", "POST", {}, { "X-CSRF-Token": "wrong" })).status).toBe(403);
    expect((await browser.request("/api/workers/challenge", "POST", { oversized: "x".repeat(17_000) })).status).toBe(
      413,
    );
    const logout = await browser.request("/auth/logout", "POST");
    expect(logout.status).toBe(200);
    expect((await (await browser.request("/api/session")).json()).user).toBeNull();
  });

  test("worker enrollment verifies signed account/audience binding and rejects private keys, forged IDs, and replay", async () => {
    const f = fixture();
    const owner = new f.Client();
    const other = new f.Client();
    await owner.signIn("123");
    await other.signIn("456");
    const { input, identity } = await enrollment(owner);
    const forged = { ...input, signature: input.signature.slice(0, -1) + "!" };
    expect((await owner.request("/api/workers", "POST", forged)).status).toBe(403);
    expect((await other.request("/api/workers", "POST", input)).status).toBe(400);
    expect((await owner.request("/api/workers", "POST", { ...input, workerId: "forged_worker_identity" })).status).toBe(
      403,
    );
    const privateJwk = await crypto.subtle.exportKey("jwk", identity.privateKey);
    expect((await owner.request("/api/workers", "POST", { ...input, workerSigningKey: privateJwk })).status).toBe(400);
    expect((await owner.request("/api/workers", "POST", { ...input, capability: "never-store-me" })).status).toBe(400);
    expect((await owner.request("/api/workers", "POST", input)).status).toBe(201);
    expect((await owner.request("/api/workers", "POST", input)).status).toBe(400);
    expect((await (await other.request("/api/workers")).json()).workers).toEqual([]);
    expect((await other.request(`/api/workers/${input.workerId}/members`)).status).toBe(404);
    const dump = required(
      f.store.db.query<{ value: string }, []>("SELECT public_key || signing_key AS value FROM workers").get(),
    ).value;
    expect(dump).not.toContain('"d":');
    expect(dump).not.toContain("never-store-me");
  });

  test("connection settings persist, stay personal, and reject secret-bearing URLs", async () => {
    const f = fixture();
    const owner = new f.Client();
    await owner.signIn("123");
    const { worker } = await linked(owner);
    const base = `/api/workers/${worker.workerId}`;
    expect((await owner.request(base, "PATCH", { directUrl: "https://home.test/#secret" })).status).toBe(400);
    expect((await owner.request(base, "PATCH", { directUrl: "https://user:password@home.test" })).status).toBe(400);
    expect((await owner.request(base, "PATCH", { directUrl: "http://home.tailnet.test" })).status).toBe(400);
    expect((await owner.request(base, "PATCH", { relayUrl: "ws://relay.example.test/relay" })).status).toBe(400);
    expect((await owner.request(base, "PATCH", { relayUrl: "ws://127.0.0.1:3177" })).status).toBe(200);
    expect(
      (await owner.request(base, "PATCH", { directUrl: "https://home.tailnet.test", mode: "direct", name: "Tailnet" }))
        .status,
    ).toBe(200);
    const reopened = new PlatformStore(f.path);
    expect(reopened.worker(worker.workerId, owner.userId)?.name).toBe("Tailnet");
    reopened.close();
  });

  test("invites enforce roles, use limits, expiry, revocation, and cannot restore removed membership", async () => {
    const f = fixture();
    const owner = new f.Client();
    const member = new f.Client();
    const outsider = new f.Client();
    await owner.signIn("123");
    await member.signIn("456");
    await outsider.signIn("789");
    const { worker } = await linked(owner);
    const base = `/api/workers/${worker.workerId}`;
    const invite = (await (
      await owner.request(`${base}/invites`, "POST", { role: "member", maxUses: 1, expiresInSeconds: 60 })
    ).json()) as WorkerInvite & { code: string };
    expect((await member.request("/api/invites/redeem", "POST", { code: invite.code })).status).toBe(200);
    expect(f.store.worker(worker.workerId, member.userId)?.accessStatus).toBe("requiresWorkerGrant");
    expect((await member.request(`${base}/invites`, "POST", { role: "admin" })).status).toBe(403);
    expect((await member.request(`${base}/members/${owner.userId}`, "DELETE")).status).toBe(403);
    expect((await outsider.request("/api/invites/redeem", "POST", { code: invite.code })).status).toBe(409);
    expect((await owner.request(`${base}/members/${member.userId}`, "DELETE")).status).toBe(200);
    expect((await member.request("/api/invites/redeem", "POST", { code: invite.code })).status).toBe(409);
    const revoked = (await (
      await owner.request(`${base}/invites`, "POST", { role: "member" })
    ).json()) as WorkerInvite & { code: string };
    expect((await owner.request(`${base}/invites/${revoked.inviteId}`, "DELETE")).status).toBe(200);
    expect((await outsider.request("/api/invites/redeem", "POST", { code: revoked.code })).status).toBe(404);
    const expiring = (await (
      await owner.request(`${base}/invites`, "POST", { role: "member", expiresInSeconds: 60 })
    ).json()) as WorkerInvite & { code: string };
    f.advance(61_000);
    expect((await outsider.request("/api/invites/redeem", "POST", { code: expiring.code })).status).toBe(404);
    const stored = f.store.db.query<{ code_hash: string }, []>("SELECT code_hash FROM invites").all();
    expect(stored.every((row) => row.code_hash !== invite.code && row.code_hash !== revoked.code)).toBe(true);
  });

  test("administrator invitations cannot escalate roles or overwrite another account's settings", async () => {
    const f = fixture();
    const owner = new f.Client();
    const admin = new f.Client();
    await owner.signIn("123");
    await admin.signIn("456");
    const { worker } = await linked(owner);
    const base = `/api/workers/${worker.workerId}`;
    const invite = (await (await owner.request(`${base}/invites`, "POST", { role: "admin" })).json()) as {
      code: string;
    };
    expect((await admin.request("/api/invites/redeem", "POST", { code: invite.code })).status).toBe(200);
    expect((await admin.request(`${base}/invites`, "POST", { role: "admin" })).status).toBe(403);
    expect((await admin.request(`${base}/invites`, "POST", { role: "member" })).status).toBe(201);
    expect((await admin.request(base, "PATCH", { name: "Admin's name" })).status).toBe(200);
    expect(f.store.worker(worker.workerId, owner.userId)?.name).toBe("Home worker");
    expect((await admin.request(base, "DELETE")).status).toBe(403);
  });

  test("temporary/permanent shares expose only pointers, enforce directory access, and expire/revoke", async () => {
    const f = fixture();
    const owner = new f.Client();
    const guest = new f.Client();
    await owner.signIn("123");
    const { worker } = await linked(owner);
    const base = `/api/workers/${worker.workerId}/shares`;
    const create = async (anonymous: boolean, expiresAt: number | null) => {
      const response = await owner.request(base, "POST", { grantId: "public_grant_reference", anonymous, expiresAt });
      expect(response.status).toBe(201);
      return ((await response.json()) as { share: WorkerShare }).share;
    };
    const temporary = await create(true, f.now() + 60_000);
    expect((await guest.request(`/api/shares/${temporary.shareId}`)).status).toBe(200);
    const permanent = await create(false, null);
    expect((await guest.request(`/api/shares/${permanent.shareId}`)).status).toBe(401);
    await guest.signIn("456");
    expect((await guest.request(`/api/shares/${permanent.shareId}`)).status).toBe(200);
    expect((await guest.request(base)).status).toBe(404);
    f.advance(61_000);
    expect((await guest.request(`/api/shares/${temporary.shareId}`)).status).toBe(404);
    expect((await guest.request(`/api/shares/${permanent.shareId}`)).status).toBe(200);
    const revoked = await owner.request(`${base}/${permanent.shareId}`, "DELETE");
    expect((await revoked.json()).workerAccessRevoked).toBe(false);
    expect((await guest.request(`/api/shares/${permanent.shareId}`)).status).toBe(404);
    expect(
      (
        await owner.request(base, "POST", {
          grantId: "grant_reference",
          anonymous: true,
          capability: "must-stay-in-fragment",
        })
      ).status,
    ).toBe(400);
  });
});

test("Workshop adapter verifies tokens through the existing users collection and rejects other collections", async () => {
  const requests: { url: string; init?: RequestInit }[] = [];
  let collectionName = "users";
  const adapter = pocketBaseWorkshopAuth({
    apiUrl: origin,
    fetch: (async (url: URL | RequestInfo, init?: RequestInit) => {
      requests.push({ url: String(url), init });
      return Response.json({
        token: "refreshed-token-never-stored",
        record: { id: "123456789abcdef", collectionName, name: "alice" },
      });
    }) as typeof fetch,
  });
  const identity = await adapter.authenticate("existing-workshop-user-token");
  expect(identity.workshopId).toBe("123456789abcdef");
  expect(identity.login).toBe("alice");
  expect(requests).toHaveLength(1);
  expect(required(requests[0]).url).toBe(`${origin}/api/collections/users/auth-refresh`);
  expect((required(required(requests[0]).init).headers as Record<string, string>).Authorization).toBe(
    "existing-workshop-user-token",
  );
  collectionName = "_superusers";
  await expect(adapter.authenticate("existing-workshop-admin-token")).rejects.toThrow("users record");
});

test("local Workshop HTTP contract exchanges an existing account token for an HttpOnly platform session", async () => {
  const f = fixture();
  let refreshCalls = 0;
  const workshopToken = "local-workshop-fixture-token-never-persisted";
  const pocketBase = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      if (new URL(request.url).pathname !== "/api/collections/users/auth-refresh" || request.method !== "POST") {
        return Response.json({ message: "Not found" }, { status: 404 });
      }
      refreshCalls += 1;
      if (request.headers.get("Authorization") !== workshopToken)
        return Response.json({ message: "Invalid token" }, { status: 401 });
      return Response.json({
        token: "local-refreshed-token-never-persisted",
        record: { id: "workshopuser123", collectionName: "users", name: "existing-account" },
      });
    },
  });
  cleanups.push(() => {
    pocketBase.stop(true);
  });
  const app = createRemotePlatformApp({
    store: f.store,
    publicUrl: `${origin}/remote`,
    auth: pocketBaseWorkshopAuth({ apiUrl: pocketBase.url.origin }),
  });
  const configResponse = await app.request(`${origin}/remote/api/auth/config`);
  const config = (await configResponse.json()) as { csrfToken: string };
  const bootstrapCookie = required(configResponse.headers.getSetCookie()[0]).split(";")[0];
  const signIn = await app.request(`${origin}/remote/auth/workshop/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      Cookie: required(bootstrapCookie),
      "X-CSRF-Token": config.csrfToken,
    },
    body: JSON.stringify({ token: workshopToken }),
  });
  expect(signIn.status).toBe(200);
  const session = (await signIn.json()) as PlatformSession;
  expect(session.user?.workshopId).toBe("workshopuser123");
  expect(session.user?.id).toBe("workshopuser123");
  expect(signIn.headers.getSetCookie().join(" ")).toContain("HttpOnly");
  expect(refreshCalls).toBe(1);
  const rows = f.store.db
    .query<{ token_hash: string; csrf_token: string }, []>("SELECT token_hash,csrf_token FROM sessions")
    .all();
  expect(JSON.stringify(rows)).not.toContain(workshopToken);
  expect(JSON.stringify(rows)).not.toContain("local-refreshed-token-never-persisted");
  await expect(
    pocketBaseWorkshopAuth({ apiUrl: pocketBase.url.origin }).authenticate("an-invalid-workshop-fixture-token"),
  ).rejects.toThrow("invalid or expired");
});
