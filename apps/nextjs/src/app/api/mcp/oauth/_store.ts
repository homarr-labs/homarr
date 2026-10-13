import { createHash, randomBytes, timingSafeEqual } from "crypto";

export interface GrantContext {
  clientId: string;
  clientName: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
  state: string | null;
  resource: string | null;
  canonicalResources: readonly string[];
  scope: "mcp:tools";
  clientExpiresAt: number;
}

interface OAuthClient {
  clientId: string;
  clientSecret: string;
  redirectUris: readonly string[];
  clientName: string;
  expiresAt: number;
}

export interface GrantIdentity {
  userId: string;
  sessionFingerprint: string;
}

export interface PendingGrant {
  context: Readonly<GrantContext>;
  browserFingerprint: string;
  identity: GrantIdentity | null;
  consentToken: string;
  createdAt: number;
  expiresAt: number;
}

interface AuthCode {
  context: Readonly<GrantContext>;
  userId: string;
  expiresAt: number;
}

interface OAuthStore {
  clients: Map<string, OAuthClient>;
  pending: Map<string, PendingGrant>;
  codes: Map<string, AuthCode>;
  sequence: number;
  timer: ReturnType<typeof setInterval> | null;
}

declare global {
  var mcpConsentGrantStore: OAuthStore | undefined;
}

const store = (globalThis.mcpConsentGrantStore ??= {
  clients: new Map(),
  pending: new Map(),
  codes: new Map(),
  sequence: 0,
  timer: null,
});

export const PENDING_TTL_MS = 600_000;
const CODE_TTL_MS = 300_000;
const CLIENT_TTL_MS = 86_400_000;

function cleanup() {
  const now = Date.now();
  for (const [id, client] of store.clients) {
    if (client.expiresAt <= now) store.clients.delete(id);
  }
  for (const [id, pending] of store.pending) {
    if (pending.expiresAt <= now || pending.context.clientExpiresAt <= now) store.pending.delete(id);
  }
  for (const [id, code] of store.codes) {
    if (code.expiresAt <= now || code.context.clientExpiresAt <= now) store.codes.delete(id);
  }
}

if (!store.timer) {
  store.timer = setInterval(cleanup, 60_000);
  store.timer.unref();
}

export function fingerprint(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function secretMatches(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function registerClient(redirectUris: string[], clientName: string) {
  cleanup();
  if (store.clients.size >= 1000) return null;
  const client = Object.freeze({
    clientId: randomBytes(16).toString("hex"),
    clientSecret: randomBytes(32).toString("hex"),
    redirectUris: Object.freeze([...redirectUris]),
    clientName,
    expiresAt: Date.now() + CLIENT_TTL_MS,
  });
  store.clients.set(client.clientId, client);
  return client;
}

export function getClient(id: string) {
  const client = store.clients.get(id);
  if (!client || client.expiresAt <= Date.now()) {
    store.clients.delete(id);
    return null;
  }
  return client;
}

export function createPending(context: GrantContext, identity: GrantIdentity | null) {
  cleanup();
  if (store.pending.size >= 5000) return null;
  const pendingId = randomBytes(16).toString("hex");
  const browserBinding = randomBytes(32).toString("hex");
  const pending: PendingGrant = {
    context: Object.freeze({ ...context, canonicalResources: Object.freeze([...context.canonicalResources]) }),
    browserFingerprint: fingerprint(browserBinding),
    identity,
    consentToken: randomBytes(32).toString("hex"),
    createdAt: ++store.sequence,
    expiresAt: Date.now() + PENDING_TTL_MS,
  };
  store.pending.set(pendingId, pending);
  return { pendingId, browserBinding, expiresAt: pending.expiresAt };
}

export function getPending(id: string) {
  const pending = store.pending.get(id);
  const now = Date.now();
  if (
    !pending ||
    pending.expiresAt <= now ||
    pending.context.clientExpiresAt <= now ||
    !getClient(pending.context.clientId)
  ) {
    store.pending.delete(id);
    return null;
  }
  return pending;
}

export function reconcileBindings(bindings: readonly { pendingId: string; value: string }[], currentId: string | null) {
  const known = bindings.flatMap((binding) => {
    const pending = getPending(binding.pendingId);
    return pending && secretMatches(pending.browserFingerprint, fingerprint(binding.value))
      ? [{ ...binding, pending }]
      : [];
  });
  known.sort((a, b) => {
    if (a.pendingId === currentId) return -1;
    if (b.pendingId === currentId) return 1;
    return b.pending.createdAt - a.pending.createdAt || a.pendingId.localeCompare(b.pendingId);
  });
  const retained = new Set(known.slice(0, 8).map(({ pendingId }) => pendingId));
  for (const binding of known.slice(8)) store.pending.delete(binding.pendingId);
  return bindings.filter(({ pendingId }) => !retained.has(pendingId)).map(({ pendingId }) => pendingId);
}

export function decidePending(id: string, pending: PendingGrant, decision: "approve" | "deny", userId: string) {
  if (store.pending.get(id) !== pending) return { ok: false } as const;
  store.pending.delete(id);
  if (decision === "deny") return { ok: true, code: null } as const;
  cleanup();
  if (store.codes.size >= 5000) return { ok: false } as const;
  const code = randomBytes(32).toString("hex");
  store.codes.set(code, { context: pending.context, userId, expiresAt: Date.now() + CODE_TTL_MS });
  return { ok: true, code } as const;
}

export function consumeCode(id: string) {
  const code = store.codes.get(id);
  store.codes.delete(id);
  const now = Date.now();
  if (!code || code.expiresAt <= now || code.context.clientExpiresAt <= now || !getClient(code.context.clientId))
    return null;
  return code;
}
