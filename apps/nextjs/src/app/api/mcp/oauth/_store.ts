import { createHash, randomBytes, timingSafeEqual } from "crypto";

interface OAuthClient {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  clientName: string;
  createdAt: number;
}

interface AuthCode {
  code: string;
  clientId: string;
  userId: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  redirectUri: string;
  expiresAt: number;
}

interface PendingAuth {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string | null;
  expiresAt: number;
}

interface OAuthStore {
  clients: Map<string, OAuthClient>;
  authCodes: Map<string, AuthCode>;
  pendingAuths: Map<string, PendingAuth>;
  cleanupTimer: ReturnType<typeof setInterval> | null;
}

declare global {
  var mcpOAuthStore: OAuthStore | undefined;
}

const store =
  globalThis.mcpOAuthStore ??
  (globalThis.mcpOAuthStore = {
    clients: new Map(),
    authCodes: new Map(),
    pendingAuths: new Map(),
    cleanupTimer: null,
  });
const clients = store.clients;
const authCodes = store.authCodes;
const pendingAuths = store.pendingAuths;

const CLEANUP_INTERVAL_MS = 60_000;
const AUTH_CODE_TTL_MS = 300_000;
const PENDING_AUTH_TTL_MS = 600_000;
const CLIENT_TTL_MS = 24 * 60 * 60 * 1000;

const MAX_CLIENTS = 1000;
const MAX_AUTH_CODES = 5000;
const MAX_PENDING_AUTHS = 5000;

if (!store.cleanupTimer) {
  store.cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, code] of authCodes) {
      if (code.expiresAt < now) authCodes.delete(key);
    }
    for (const [key, pending] of pendingAuths) {
      if (pending.expiresAt < now) pendingAuths.delete(key);
    }
    for (const [key, client] of clients) {
      if (client.createdAt + CLIENT_TTL_MS < now) clients.delete(key);
    }
  }, CLEANUP_INTERVAL_MS);
}

export function registerClient(redirectUris: string[], clientName: string) {
  if (clients.size >= MAX_CLIENTS) {
    return null;
  }

  const clientId = randomBytes(16).toString("hex");
  const clientSecret = randomBytes(32).toString("hex");
  const client: OAuthClient = {
    clientId,
    clientSecret,
    redirectUris,
    clientName,
    createdAt: Date.now(),
  };
  clients.set(clientId, client);
  return { clientId, clientSecret };
}

export function getClient(clientId: string) {
  return clients.get(clientId) ?? null;
}

export function createAuthCode(
  clientId: string,
  userId: string,
  codeChallenge: string,
  codeChallengeMethod: string,
  redirectUri: string,
) {
  if (authCodes.size >= MAX_AUTH_CODES) {
    return null;
  }

  const code = randomBytes(32).toString("hex");
  authCodes.set(code, {
    code,
    clientId,
    userId,
    codeChallenge,
    codeChallengeMethod,
    redirectUri,
    expiresAt: Date.now() + AUTH_CODE_TTL_MS,
  });
  return code;
}

export function consumeAuthCode(code: string) {
  const authCode = authCodes.get(code);
  if (!authCode) return null;
  authCodes.delete(code);
  if (authCode.expiresAt < Date.now()) return null;
  return authCode;
}

export function verifyPkce(codeVerifier: string, codeChallenge: string, method: string) {
  if (method !== "S256") return false;
  const computed = createHash("sha256").update(codeVerifier).digest("base64url");
  if (computed.length !== codeChallenge.length) return false;
  return timingSafeEqual(Buffer.from(computed), Buffer.from(codeChallenge));
}

export function storePendingAuth(params: Omit<PendingAuth, "expiresAt">) {
  if (pendingAuths.size >= MAX_PENDING_AUTHS) {
    return null;
  }

  const id = randomBytes(16).toString("hex");
  pendingAuths.set(id, {
    ...params,
    expiresAt: Date.now() + PENDING_AUTH_TTL_MS,
  });
  return id;
}

export function consumePendingAuth(id: string) {
  const pending = pendingAuths.get(id);
  if (!pending) return null;
  pendingAuths.delete(id);
  if (pending.expiresAt < Date.now()) return null;
  return pending;
}
