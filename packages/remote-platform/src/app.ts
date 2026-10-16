import { Hono } from "hono";
import { createGlobalMcpRoutes } from "./mcp/app";
import type { GlobalMcpOptions } from "./mcp/types";
import type { Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";

import { isEnrollmentChallenge, verifyEnrollmentSignature } from "./enrollment";
import { organizationRoutes } from "./organization-routes";
import type { WorkshopAuth } from "./auth";
import {
  connectionUrl,
  hashToken,
  idField,
  numberField,
  onlyFields,
  publicJwk,
  randomToken,
  record,
  textField,
} from "./security";
import type { PlatformStore, StoredSession } from "./store";
import type {
  EnrollmentChallenge,
  PlatformUser,
  WorkerConnection,
  WorkerEnrollment,
  WorkerInvite,
  WorkerRole,
  WorkerShare,
} from "./types";

interface PlatformEnv {
  Bindings: { clientAddress?: string };
  Variables: { user: PlatformUser | null; session: StoredSession | null; tokenHash: string | null };
}

export interface PlatformOptions {
  store: PlatformStore;
  publicUrl: string;
  auth: WorkshopAuth;
  now?: () => number;
  mcp?: Omit<GlobalMcpOptions, "store" | "publicUrl" | "browserSession" | "now">;
}

const sessionSeconds = 60 * 60;

function userOf(c: Context<PlatformEnv>): PlatformUser {
  const user = c.get("user");
  if (!user) throw new HTTPException(401, { message: "Sign in required" });
  return user;
}

function roleField(value: unknown): Exclude<WorkerRole, "owner"> {
  if (value !== "admin" && value !== "member") throw new HTTPException(400, { message: "Invalid membership role" });
  return value;
}

function modeField(value: unknown): "direct" | "relay" {
  if (value !== "direct" && value !== "relay") throw new HTTPException(400, { message: "Invalid connection mode" });
  return value;
}

function checkConnection(connection: Pick<WorkerConnection, "mode" | "directUrl" | "relayUrl">): void {
  if (connection.mode === "direct" && !connection.directUrl)
    throw new HTTPException(400, { message: "A direct worker URL is required" });
  if (connection.mode === "relay" && !connection.relayUrl)
    throw new HTTPException(400, { message: "A relay URL is required" });
}

export function createRemotePlatformApp(options: PlatformOptions) {
  const { store, auth } = options;
  const publicUrl = new URL(options.publicUrl);
  if (publicUrl.username || publicUrl.password || publicUrl.search || publicUrl.hash)
    throw new Error("REMOTE_PUBLIC_URL must not contain credentials, query, or fragment");
  const secure = publicUrl.protocol === "https:";
  if (!secure && !(publicUrl.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(publicUrl.hostname)))
    throw new Error("REMOTE_PUBLIC_URL must use HTTPS outside loopback");
  const origin = publicUrl.origin;
  const basePath = publicUrl.pathname.replace(/\/$/, "");
  if (!/^([/][a-zA-Z0-9_-]+)*$/.test(basePath)) throw new Error("Invalid remote platform base path");
  let sessionCookie = "homarr_remote_session";
  let loginCookie = "homarr_remote_login";
  if (secure) {
    sessionCookie = "__Host-homarr_remote_session";
    loginCookie = "__Host-homarr_remote_login";
  }
  const cookieOptions = { path: "/", httpOnly: true, sameSite: "Lax", secure } as const;
  const now = options.now ?? Date.now;
  const app = new Hono<PlatformEnv>().basePath(basePath);
  // Bound each bucket and periodically discard old entries; proxy headers are never trusted.
  const rateLimits = new Map<string, { count: number; until: number }>();
  function rateLimit(key: string, maximum: number): void {
    const time = now();
    if (rateLimits.size > 10_000) {
      for (const [entryKey, entry] of rateLimits) if (entry.until <= time) rateLimits.delete(entryKey);
      if (rateLimits.size > 10_000) throw new HTTPException(429, { message: "Try again shortly" });
    }
    let entry = rateLimits.get(key);
    if (!entry || entry.until <= time) {
      entry = { count: 0, until: time + 60_000 };
      rateLimits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > maximum) throw new HTTPException(429, { message: "Too many requests" });
  }

  app.use(
    "*",
    secureHeaders({
      referrerPolicy: "no-referrer",
      xFrameOptions: "DENY",
      crossOriginResourcePolicy: "same-origin",
      // Keep the PocketBase OAuth popup's WindowProxy usable for the SDK's cleanup.
      crossOriginOpenerPolicy: "same-origin-allow-popups",
    }),
  );
  app.use("*", bodyLimit({ maxSize: 16_384, onError: (c) => c.json({ error: "Request too large" }, 413) }));
  if (options.mcp)
    app.route(
      "/",
      createGlobalMcpRoutes({
        ...options.mcp,
        store,
        publicUrl: options.publicUrl,
        now,
        browserSession: async (request) => {
          const cookie = request.headers
            .get("Cookie")
            ?.split(";")
            .map((value) => value.trim())
            .find((value) => value.startsWith(`${sessionCookie}=`));
          const token = cookie?.slice(sessionCookie.length + 1);
          if (!token || !/^[\w-]{43}$/.test(token)) return null;
          const session = store.session(await hashToken(token), now());
          if (!session) return null;
          return {
            userId: session.userId,
            sessionId: token,
            csrfToken: session.csrfToken,
            expiresAt: session.expiresAt,
          };
        },
      }),
    );
  app.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    c.set("user", null);
    c.set("session", null);
    c.set("tokenHash", null);
    const token = getCookie(c, sessionCookie);
    if (token && /^[\w-]{43}$/.test(token)) {
      const tokenHash = await hashToken(token);
      const session = store.session(tokenHash, now());
      if (session) {
        c.set("session", session);
        c.set("user", store.user(session.userId));
        c.set("tokenHash", tokenHash);
      }
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
      const session = c.get("session");
      if (c.req.header("Origin") !== origin) throw new HTTPException(403, { message: "Invalid request origin" });
      if (c.req.path === `${basePath}/auth/workshop/session`) {
        const loginNonce = getCookie(c, loginCookie);
        if (!loginNonce || c.req.header("X-CSRF-Token") !== loginNonce)
          throw new HTTPException(403, { message: "Invalid login CSRF token" });
        rateLimit(`login:${c.env?.clientAddress ?? "unknown"}`, 20);
      } else {
        if (!session || c.req.header("X-CSRF-Token") !== session.csrfToken)
          throw new HTTPException(403, { message: "Invalid CSRF token" });
        rateLimit(`mutation:${session.userId}`, 120);
      }
    }
    await next();
  });

  function workerFor(c: Context<PlatformEnv>, minimum: "member" | "admin" | "owner" = "member"): WorkerConnection {
    const user = userOf(c);
    const workerId = idField(c.req.param("workerId"), "worker ID");
    const worker = store.worker(workerId, user.id);
    if (!worker) throw new HTTPException(404, { message: "Worker not found" });
    if (minimum === "owner" && worker.role !== "owner")
      throw new HTTPException(403, { message: "Worker owner required" });
    if (minimum === "admin" && worker.role === "member")
      throw new HTTPException(403, { message: "Worker administrator required" });
    return worker;
  }

  app.get("/api/health", (c) => c.json({ status: "ok", service: "homarr-remote-platform" }));
  app.get("/api/session", (c) => c.json({ user: c.get("user"), csrfToken: c.get("session")?.csrfToken ?? null }));

  app.get("/api/auth/config", (c) => {
    const csrfToken = randomToken();
    setCookie(c, loginCookie, csrfToken, { ...cookieOptions, maxAge: 600 });
    return c.json({ workshopApiUrl: auth.workshopApiUrl, authCollection: "users", provider: "github", csrfToken });
  });

  app.post("/auth/workshop/session", async (c) => {
    const body = record(await c.req.json());
    onlyFields(body, ["token"]);
    const workshopToken = textField(body.token, "Workshop token", 8192);
    let identity: Omit<PlatformUser, "id">;
    try {
      identity = await auth.authenticate(workshopToken);
    } catch {
      throw new HTTPException(401, { message: "The Workshop session is invalid or expired" });
    }
    const user = store.upsertUser(identity, now());
    const oldHash = c.get("tokenHash");
    if (oldHash) store.deleteSession(oldHash);
    const token = randomToken();
    const csrfToken = randomToken();
    store.saveSession(await hashToken(token), { userId: user.id, csrfToken, expiresAt: now() + sessionSeconds * 1000 });
    setCookie(c, sessionCookie, token, { ...cookieOptions, maxAge: sessionSeconds });
    deleteCookie(c, loginCookie, { path: "/", secure });
    return c.json({ user, csrfToken });
  });

  app.post("/auth/logout", (c) => {
    const tokenHash = c.get("tokenHash");
    if (tokenHash) store.deleteSession(tokenHash);
    deleteCookie(c, sessionCookie, { path: "/", secure });
    return c.json({ ok: true });
  });

  app.get("/api/workers", (c) => c.json({ workers: store.workers(userOf(c).id) }));

  app.post("/api/workers/challenge", (c) => {
    const user = userOf(c);
    store.cleanup(now());
    const challenge: EnrollmentChallenge = {
      version: 1,
      type: "homarr-platform-enrollment",
      challengeId: randomToken(),
      nonce: randomToken(),
      userId: user.id,
      audience: origin,
      expiresAt: now() + 300_000,
    };
    store.saveChallenge(challenge);
    return c.json({ challenge }, 201);
  });

  app.post("/api/workers", async (c) => {
    const user = userOf(c);
    const body = record(await c.req.json());
    onlyFields(body, [
      "challenge",
      "workerId",
      "workerPublicKey",
      "workerSigningKey",
      "signature",
      "name",
      "mode",
      "relayUrl",
      "directUrl",
    ]);
    const challengeInput = record(body.challenge);
    onlyFields(challengeInput, ["version", "type", "challengeId", "nonce", "userId", "audience", "expiresAt"]);
    if (!isEnrollmentChallenge(challengeInput))
      throw new HTTPException(400, { message: "Invalid enrollment challenge" });
    const saved = store.challenge(idField(challengeInput.challengeId, "challenge ID"), user.id, now());
    if (
      !saved ||
      saved.nonce !== challengeInput.nonce ||
      saved.userId !== challengeInput.userId ||
      saved.audience !== challengeInput.audience ||
      saved.expiresAt !== challengeInput.expiresAt
    ) {
      throw new HTTPException(400, { message: "Enrollment challenge expired or did not match" });
    }
    const enrollment: WorkerEnrollment = {
      challenge: saved,
      workerId: idField(body.workerId, "worker ID"),
      workerPublicKey: publicJwk(body.workerPublicKey, "worker public key"),
      workerSigningKey: publicJwk(body.workerSigningKey, "worker signing key"),
      signature: textField(body.signature, "signature", 128),
      name: textField(body.name, "worker name", 100),
      mode: modeField(body.mode),
      relayUrl: connectionUrl(body.relayUrl, "relay"),
      directUrl: connectionUrl(body.directUrl, "direct"),
    };
    checkConnection({ ...enrollment, directUrl: enrollment.directUrl ?? null, relayUrl: enrollment.relayUrl ?? null });
    if (!(await verifyEnrollmentSignature(enrollment)))
      throw new HTTPException(403, { message: "Worker enrollment proof is invalid" });
    return c.json({ worker: store.enrollWorker(enrollment, user.id, now()) }, 201);
  });

  app.patch("/api/workers/:workerId", async (c) => {
    const body = record(await c.req.json());
    const worker = workerFor(c);
    onlyFields(body, ["name", "mode", "relayUrl", "directUrl"]);
    const next = { ...worker };
    if (body.name !== undefined) next.name = textField(body.name, "worker name", 100);
    if (body.mode !== undefined) next.mode = modeField(body.mode);
    if (body.relayUrl !== undefined) next.relayUrl = connectionUrl(body.relayUrl, "relay");
    if (body.directUrl !== undefined) next.directUrl = connectionUrl(body.directUrl, "direct");
    checkConnection(next);
    return c.json({ worker: store.updateConnection(worker.workerId, userOf(c).id, next) });
  });

  app.delete("/api/workers/:workerId", (c) => {
    const worker = workerFor(c, "owner");
    store.deleteWorker(worker.workerId);
    return c.json({ ok: true, workerAccessRevoked: false });
  });

  app.get("/api/workers/:workerId/members", (c) => c.json({ members: store.members(workerFor(c).workerId) }));
  app.delete("/api/workers/:workerId/members/:userId", (c) => {
    const worker = workerFor(c);
    const targetId = idField(c.req.param("userId"), "user ID");
    const target = store.members(worker.workerId).find((member) => member.user.id === targetId);
    if (!target) throw new HTTPException(404, { message: "Member not found" });
    if (target.role === "owner") throw new HTTPException(403, { message: "The worker owner cannot be removed" });
    if (
      targetId !== userOf(c).id &&
      (worker.role === "member" || (worker.role === "admin" && target.role === "admin"))
    ) {
      throw new HTTPException(403, { message: "Permission denied" });
    }
    store.removeMember(worker.workerId, targetId);
    return c.json({ ok: true, workerAccessRevoked: false });
  });

  app.get("/api/workers/:workerId/invites", (c) => c.json({ invites: store.invites(workerFor(c, "admin").workerId) }));
  app.post("/api/workers/:workerId/invites", async (c) => {
    const body = record(await c.req.json());
    onlyFields(body, ["role", "expiresInSeconds", "maxUses"]);
    const role = roleField(body.role);
    const expiresInSeconds = numberField(body.expiresInSeconds ?? 86_400, "invitation lifetime", 60, 30 * 86_400);
    const maxUses = numberField(body.maxUses ?? 1, "maximum uses", 1, 100);
    const code = randomToken();
    const codeHash = await hashToken(code);
    const worker = workerFor(c, "admin");
    if (role === "admin" && worker.role !== "owner")
      throw new HTTPException(403, { message: "Only the owner may invite administrators" });
    const invite: WorkerInvite = {
      inviteId: randomToken(),
      workerId: worker.workerId,
      role,
      expiresAt: now() + expiresInSeconds * 1000,
      maxUses,
      uses: 0,
      revokedAt: null,
    };
    store.createInvite(invite, userOf(c).id, codeHash);
    return c.json({ ...invite, code }, 201);
  });
  app.delete("/api/workers/:workerId/invites/:inviteId", (c) => {
    const worker = workerFor(c, "admin");
    const inviteId = idField(c.req.param("inviteId"), "invitation ID");
    const invite = store.invites(worker.workerId).find((entry) => entry.inviteId === inviteId);
    if (!invite) throw new HTTPException(404, { message: "Invitation not found" });
    if (invite.role === "admin" && worker.role !== "owner")
      throw new HTTPException(403, { message: "Only the owner may revoke administrator invitations" });
    store.revokeInvite(worker.workerId, inviteId, now());
    return c.json({ ok: true });
  });
  app.post("/api/invites/redeem", async (c) => {
    const user = userOf(c);
    rateLimit(`invite:${user.id}`, 10);
    const body = record(await c.req.json());
    onlyFields(body, ["code"]);
    const code = idField(body.code, "invitation code");
    return c.json({ worker: store.redeemInvite(await hashToken(code), user.id, now()) });
  });

  app.get("/api/workers/:workerId/shares", (c) => c.json({ shares: store.shares(workerFor(c, "admin").workerId) }));
  app.post("/api/workers/:workerId/shares", async (c) => {
    const body = record(await c.req.json());
    const worker = workerFor(c, "admin");
    onlyFields(body, ["grantId", "label", "anonymous", "expiresAt"]);
    if (typeof body.anonymous !== "boolean")
      throw new HTTPException(400, { message: "Anonymous sharing must be explicitly selected" });
    let expiresAt: number | null = null;
    if (body.expiresAt !== null && body.expiresAt !== undefined)
      expiresAt = numberField(body.expiresAt, "share expiration", now() + 60_000, now() + 365 * 86_400_000);
    const share: WorkerShare = {
      shareId: randomToken(),
      workerId: worker.workerId,
      grantId: idField(body.grantId, "worker grant ID"),
      label: "Shared board",
      anonymous: body.anonymous,
      expiresAt,
      revokedAt: null,
    };
    if (body.label !== undefined) share.label = textField(body.label, "share label", 100);
    store.createShare(share, userOf(c).id);
    return c.json({ share }, 201);
  });
  app.delete("/api/workers/:workerId/shares/:shareId", (c) => {
    const worker = workerFor(c, "admin");
    store.revokeShare(worker.workerId, idField(c.req.param("shareId"), "share ID"), now());
    return c.json({ ok: true, workerAccessRevoked: false });
  });
  app.get("/api/shares/:shareId", (c) => {
    const share = store.share(idField(c.req.param("shareId"), "share ID"), now());
    if (!share) throw new HTTPException(404, { message: "Share not found or expired" });
    if (!share.anonymous) userOf(c);
    return c.json({ share, worker: store.workerDescriptor(share.workerId) });
  });

  app.route("/", organizationRoutes(store, now));
  app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));
  app.all("/auth/*", (c) => c.json({ error: "Not found" }, 404));
  app.onError((error, c) => {
    if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return c.json({ error: "Invalid JSON" }, 400);
    // Do not log request bodies, OAuth codes, bearer fragments, or provider token responses.
    return c.json({ error: "The request could not be completed" }, 500);
  });
  if (options.mcp) {
    const publicApp = new Hono<PlatformEnv>();
    const base = options.publicUrl.replace(/\/$/, "");
    publicApp.get(`/.well-known/oauth-authorization-server${basePath}/mcp`, (c) =>
      c.redirect(`${base}/.well-known/oauth-authorization-server`),
    );
    publicApp.get(`/.well-known/oauth-protected-resource${basePath}/mcp`, (c) =>
      c.redirect(`${base}/.well-known/oauth-protected-resource/mcp`),
    );
    publicApp.route("/", app);
    return publicApp;
  }
  return app;
}
