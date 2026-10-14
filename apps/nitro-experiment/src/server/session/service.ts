import { randomBytes } from "node:crypto";
import { ORPCError } from "@orpc/server";

import type { IdentityId, SessionState } from "../../contracts/schemas";
import { fixtureIdentitySchema, sessionSelectInputSchema, sessionStateSchema } from "../../contracts/schemas";
import { assertLocalOrigin, assertMutationOrigin } from "../access/local-request";
import type { FixtureConfig } from "../context/config";
import type { RequestContext, SessionPrincipal } from "../context/request";
import type { FixtureRepository } from "../database/repository";

interface StoredSession {
  identityId: IdentityId;
  expiresAt: number;
  origin: string;
}

const sessions = new Map<string, StoredSession>();
let closed = false;

function validSessionConfig(config: FixtureConfig): boolean {
  const settings = config.session;
  return Boolean(
    settings &&
    typeof settings.cookieName === "string" &&
    /^[A-Za-z0-9_-]{1,80}$/.test(settings.cookieName) &&
    Number.isInteger(settings.maxEntries) &&
    settings.maxEntries >= 1 &&
    settings.maxEntries <= 64 &&
    Number.isInteger(settings.ttlMs) &&
    settings.ttlMs >= 1000 &&
    settings.ttlMs <= 900000,
  );
}

function cleanExpiredSessions(): void {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(token);
  }
}

function readToken(request: Request, config: FixtureConfig): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie || cookie.length > 8192) return null;
  const matches = cookie
    .split(";")
    .map((value) => value.trim())
    .filter((value) => {
      const separator = value.indexOf("=");
      return separator >= 0 && value.slice(0, separator).trim() === config.session.cookieName;
    });
  if (matches.length !== 1) return null;
  const value = matches[0];
  if (!value) return null;
  const token = value.slice(value.indexOf("=") + 1);
  return /^[a-f0-9]{64}$/.test(token) ? token : null;
}

function readStoredSession(request: Request, config: FixtureConfig): StoredSession | null {
  cleanExpiredSessions();
  if (closed || !validSessionConfig(config)) return null;
  const token = readToken(request, config);
  const session = token ? sessions.get(token) : null;
  return session && session.origin === config.origin ? session : null;
}

function forgetSession(request: Request, config: FixtureConfig): void {
  const token = readToken(request, config);
  if (token) sessions.delete(token);
}

function cookieAttributes(config: FixtureConfig): string {
  if (!validSessionConfig(config)) {
    throw new ORPCError("SERVICE_UNAVAILABLE", { data: { reason: "fixture-session-config" } });
  }
  return "Path=/; HttpOnly; SameSite=Strict";
}

export async function resolveSession(
  request: Request,
  repository: FixtureRepository,
  config: FixtureConfig,
): Promise<SessionPrincipal | null> {
  assertLocalOrigin(request, config);
  const session = readStoredSession(request, config);
  if (!session) return null;
  const parsed = fixtureIdentitySchema.safeParse(await repository.readIdentity(session.identityId));
  if (!parsed.success || parsed.data.id !== session.identityId) {
    forgetSession(request, config);
    return null;
  }
  if (readStoredSession(request, config) !== session) return null;
  return { identity: parsed.data, expiresAt: new Date(session.expiresAt).toISOString() };
}

export function liveSession(context: RequestContext): SessionPrincipal | null {
  const stored = readStoredSession(context.request, context.config);
  const principal = context.session;
  if (
    !stored ||
    !principal ||
    principal.identity.id !== stored.identityId ||
    principal.expiresAt !== new Date(stored.expiresAt).toISOString()
  )
    return null;
  return principal;
}

export async function currentSession(context: RequestContext): Promise<SessionState> {
  const principal = await resolveSession(context.request, context.repository, context.config);
  return sessionStateSchema.parse(
    principal
      ? { status: "authenticated", fixtureOnly: true, identity: principal.identity, expiresAt: principal.expiresAt }
      : { status: "anonymous", fixtureOnly: true },
  );
}

export async function selectSession(context: RequestContext, identityId: IdentityId): Promise<SessionState> {
  assertMutationOrigin(context.request, context.config);
  const attributes = cookieAttributes(context.config);
  const { maxEntries, ttlMs, cookieName } = context.config.session;
  const selected = sessionSelectInputSchema.safeParse({ identityId });
  if (!selected.success) throw new ORPCError("BAD_REQUEST", { data: { reason: "fixture-identity" } });
  const identity = fixtureIdentitySchema.safeParse(await context.repository.readIdentity(selected.data.identityId));
  if (!identity.success || identity.data.id !== selected.data.identityId) {
    throw new ORPCError("SERVICE_UNAVAILABLE", { data: { reason: "fixture-identity-unavailable" } });
  }
  if (closed) {
    throw new ORPCError("SERVICE_UNAVAILABLE", { data: { reason: "fixture-session-config" } });
  }
  context.signal.throwIfAborted();
  cleanExpiredSessions();
  forgetSession(context.request, context.config);
  while (sessions.size >= maxEntries) {
    const oldest = sessions.keys().next().value;
    if (!oldest) break;
    sessions.delete(oldest);
  }
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + ttlMs;
  sessions.set(token, { identityId: identity.data.id, expiresAt, origin: context.config.origin });
  context.responseHeaders.append(
    "Set-Cookie",
    `${cookieName}=${token}; ${attributes}; Max-Age=${Math.floor(ttlMs / 1000)}; Expires=${new Date(expiresAt).toUTCString()}`,
  );
  return sessionStateSchema.parse({
    status: "authenticated",
    fixtureOnly: true,
    identity: identity.data,
    expiresAt: new Date(expiresAt).toISOString(),
  });
}

export function logoutSession(context: RequestContext): { loggedOut: true } {
  assertMutationOrigin(context.request, context.config);
  const attributes = cookieAttributes(context.config);
  forgetSession(context.request, context.config);
  cleanExpiredSessions();
  context.responseHeaders.append(
    "Set-Cookie",
    `${context.config.session.cookieName}=; ${attributes}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
  );
  return { loggedOut: true };
}

export function closeSessions(): void {
  closed = true;
  sessions.clear();
}
