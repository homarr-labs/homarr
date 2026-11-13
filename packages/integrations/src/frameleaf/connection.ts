import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod/v4";

import { readBoundedJsonResponseAsync } from "@homarr/common/server";

import { frameleafFetch } from "./transport";

const identity = z.object({ grantId: z.string().min(1).max(128), libraryUserId: z.string().min(1).max(128) });
const tokens = z.object({
  accessToken: z.string().min(1).max(4096),
  refreshToken: z.string().min(1).max(4096),
  expiresAt: z.number(),
});
const base = z.object({ version: z.literal(1), origin: z.string(), clientId: z.string().min(1).max(512) });
export const frameleafStateSchema = z.union([
  base.extend({
    status: z.enum(["pending", "exchanging"]),
    pending: z.object({
      stateHash: z.string(),
      verifier: z.string(),
      userId: z.string(),
      sessionHash: z.string(),
      callback: z.string(),
      expiresAt: z.number(),
    }),
  }),
  base.extend({
    status: z.enum(["verifying", "connected", "refreshing", "uncertain", "revoking"]),
    tokens,
    connection: identity.nullable(),
  }),
]);
export type FrameleafState = z.infer<typeof frameleafStateSchema>;
export interface FrameleafStore {
  readAsync(): Promise<FrameleafState | null>;
  /** Must atomically compare and replace shared durable state; never fall back to process-local storage. */
  replaceAsync(previous: FrameleafState | null, next: FrameleafState | null): Promise<boolean>;
}

export class FrameleafConnectionError extends Error {
  retryAfter?: number;
  constructor(
    readonly reason: "configuration" | "consent" | "reconnect" | "busy" | "unavailable" | "registration" | "rateLimit",
  ) {
    super(`Frameleaf connection: ${reason}`);
  }
}

export function normalizeFrameleafOrigin(value: string) {
  const url = new URL(value);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new FrameleafConnectionError("configuration");
  return url.origin;
}
export const frameleafCallbackPath = "/api/integrations/frameleaf/callback";
export function validateFrameleafCallback(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== frameleafCallbackPath ||
    url.search ||
    url.hash
  )
    throw new FrameleafConnectionError("configuration");
  return url.href;
}
const hash = (value: string) => createHash("sha256").update(value).digest("base64url");
const matches = (value: string, expected: string) => {
  const actual = Buffer.from(hash(value));
  const other = Buffer.from(expected);
  return actual.length === other.length && timingSafeEqual(actual, other);
};
const tokenResponse = z.object({
  access_token: z.string().min(1).max(4096),
  refresh_token: z.string().min(1).max(4096),
  token_type: z.string().refine((value) => value.toLowerCase() === "bearer"),
  expires_in: z.number().int().min(1).max(604800),
  scope: z.string().optional(),
});
export type FrameleafFetch = (url: string, init?: RequestInit) => Promise<Response>;

/** A spent refresh token is never retried, including after a worker crash or an ambiguous HTTP result. */
export class FrameleafConnection {
  constructor(
    private readonly store: FrameleafStore,
    private readonly fetchAsync: FrameleafFetch = frameleafFetch,
  ) {}

  private async jsonAsync(origin: string, path: string, init?: RequestInit) {
    let response: Response;
    try {
      response = await this.fetchAsync(`${origin}${path}`, {
        ...init,
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new FrameleafConnectionError("unavailable");
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new FrameleafConnectionError(
        response.status === 401 || response.status === 403 ? "reconnect" : "unavailable",
      );
    }
    try {
      return await readBoundedJsonResponseAsync(response, 65536, "Frameleaf response");
    } catch {
      throw new FrameleafConnectionError("unavailable");
    }
  }

  async startAsync(input: { origin: string; clientId?: string; callback: string; userId: string; sessionId: string }) {
    const origin = normalizeFrameleafOrigin(input.origin);
    const callback = validateFrameleafCallback(input.callback);
    if (await this.store.readAsync()) throw new FrameleafConnectionError("reconnect");
    const resource = z
      .object({
        resource: z.literal(`${origin}/api/connect`),
        authorization_servers: z.array(z.literal(origin)).min(1),
        scopes_supported: z.array(z.string()),
      })
      .parse(await this.jsonAsync(origin, "/.well-known/oauth-protected-resource/api/connect"));
    if (!resource.scopes_supported.includes("library:read")) throw new FrameleafConnectionError("configuration");
    z.object({
      issuer: z.literal(origin),
      authorization_endpoint: z.literal(`${origin}/api/oauth/apps/authorize`),
      token_endpoint: z.literal(`${origin}/api/oauth/apps/token`),
      code_challenge_methods_supported: z.array(z.string()).refine((methods) => methods.includes("S256")),
    }).parse(await this.jsonAsync(origin, "/.well-known/oauth-authorization-server"));
    let clientId = input.clientId?.trim();
    if (!clientId) {
      try {
        const registration = await this.jsonAsync(origin, "/api/oauth/apps/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            client_name: "Homarr",
            redirect_uris: [callback],
            grant_types: ["authorization_code", "refresh_token"],
            response_types: ["code"],
            token_endpoint_auth_method: "none",
          }),
        });
        clientId = z.object({ client_id: z.string().min(1).max(512) }).parse(registration).client_id;
      } catch {
        throw new FrameleafConnectionError("registration");
      }
    }
    if (clientId.length > 512) throw new FrameleafConnectionError("configuration");
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(32).toString("base64url");
    const value: FrameleafState = {
      version: 1,
      origin,
      clientId,
      status: "pending",
      pending: {
        stateHash: hash(state),
        verifier,
        userId: input.userId,
        sessionHash: hash(input.sessionId),
        callback,
        expiresAt: Date.now() + 300000,
      },
    };
    if (!(await this.store.replaceAsync(null, value))) throw new FrameleafConnectionError("busy");
    const url = new URL("/api/oauth/apps/authorize", origin);
    url.search = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: callback,
      scope: "library:read",
      resource: `${origin}/api/connect`,
      state,
      code_challenge: hash(verifier),
      code_challenge_method: "S256",
    }).toString();
    return url.href;
  }

  async completeAsync(input: { state: string; code: string; userId: string; sessionId: string }) {
    const previous = await this.store.readAsync();
    if (
      !previous ||
      previous.status !== "pending" ||
      !("pending" in previous) ||
      previous.pending.expiresAt <= Date.now() ||
      previous.pending.userId !== input.userId ||
      !matches(input.state, previous.pending.stateHash) ||
      !matches(input.sessionId, previous.pending.sessionHash) ||
      !input.code ||
      input.code.length > 2048
    )
      throw new FrameleafConnectionError("consent");
    const claimed: FrameleafState = { ...previous, status: "exchanging" };
    if (!(await this.store.replaceAsync(previous, claimed))) throw new FrameleafConnectionError("consent");
    const result = await this.exchangeAsync(previous, {
      grant_type: "authorization_code",
      code: input.code,
      code_verifier: previous.pending.verifier,
      redirect_uri: previous.pending.callback,
    });
    const verifying: FrameleafState = {
      version: 1,
      origin: previous.origin,
      clientId: previous.clientId,
      status: "verifying",
      tokens: result,
      connection: null,
    };
    try {
      if (!(await this.store.replaceAsync(claimed, verifying))) throw new FrameleafConnectionError("busy");
    } catch {
      await this.revokeAsync(previous, result.refreshToken);
      throw new FrameleafConnectionError("reconnect");
    }
    try {
      const capabilities = z
        .object({ protocolVersion: z.literal(1), scopes: z.array(z.literal("library:read")), connection: identity })
        .parse(
          await this.jsonAsync(previous.origin, "/api/connect/capabilities", {
            headers: { authorization: `Bearer ${result.accessToken}` },
          }),
        );
      if (!capabilities.scopes.includes("library:read")) throw new FrameleafConnectionError("consent");
      if (
        !(await this.store.replaceAsync(verifying, {
          ...verifying,
          status: "connected",
          connection: capabilities.connection,
        }))
      )
        throw new FrameleafConnectionError("busy");
    } catch {
      await this.store.replaceAsync(verifying, { ...verifying, status: "uncertain" });
      throw new FrameleafConnectionError("consent");
    }
  }

  private async exchangeAsync(state: FrameleafState, parameters: Record<string, string>) {
    const parsed = tokenResponse.safeParse(
      await this.jsonAsync(state.origin, "/api/oauth/apps/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          ...parameters,
          client_id: state.clientId,
          resource: `${state.origin}/api/connect`,
        }),
      }),
    );
    if (!parsed.success || (parsed.data.scope !== undefined && parsed.data.scope !== "library:read"))
      throw new FrameleafConnectionError("reconnect");
    return {
      accessToken: parsed.data.access_token,
      refreshToken: parsed.data.refresh_token,
      expiresAt: Date.now() + parsed.data.expires_in * 1000,
    };
  }

  async accessTokenAsync(): Promise<string> {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      const previous = await this.store.readAsync();
      if (!previous || !("tokens" in previous) || !["connected", "refreshing"].includes(previous.status))
        throw new FrameleafConnectionError("reconnect");
      if (previous.status === "refreshing") {
        await new Promise((resolve) => setTimeout(resolve, 50));
        continue;
      }
      if (previous.tokens.expiresAt > Date.now() + 30000) return previous.tokens.accessToken;
      const claimed: FrameleafState = { ...previous, status: "refreshing" };
      if (!(await this.store.replaceAsync(previous, claimed))) continue;
      try {
        const rotated = await this.exchangeAsync(previous, {
          grant_type: "refresh_token",
          refresh_token: previous.tokens.refreshToken,
        });
        if (!(await this.store.replaceAsync(claimed, { ...previous, status: "connected", tokens: rotated }))) {
          await this.revokeAsync(previous, rotated.refreshToken);
          throw new FrameleafConnectionError("reconnect");
        }
        return rotated.accessToken;
      } catch {
        await this.store.replaceAsync(claimed, { ...previous, status: "uncertain" });
        throw new FrameleafConnectionError("reconnect");
      }
    }
    // A crashed worker may have spent the token. Never take over its claim.
    throw new FrameleafConnectionError("busy");
  }

  async markRevokedAsync(accessToken: string) {
    const previous = await this.store.readAsync();
    if (
      previous &&
      "tokens" in previous &&
      previous.status === "connected" &&
      previous.tokens.accessToken === accessToken
    )
      await this.store.replaceAsync(previous, { ...previous, status: "uncertain" });
  }

  private async revokeAsync(state: FrameleafState, token: string) {
    let response: Response;
    try {
      response = await this.fetchAsync(`${state.origin}/api/oauth/apps/revoke`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token, token_type_hint: "refresh_token", client_id: state.clientId }),
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new FrameleafConnectionError("unavailable");
    }
    await response.body?.cancel();
    if (!response.ok) throw new FrameleafConnectionError("unavailable");
  }

  async disconnectAsync() {
    const previous = await this.store.readAsync();
    if (!previous) return;
    if ("pending" in previous) {
      if (previous.status === "exchanging" && previous.pending.expiresAt > Date.now())
        throw new FrameleafConnectionError("busy");
      if (!(await this.store.replaceAsync(previous, null))) throw new FrameleafConnectionError("busy");
      return;
    }
    const claimed: FrameleafState = { ...previous, status: "revoking" };
    if (!(await this.store.replaceAsync(previous, claimed))) throw new FrameleafConnectionError("busy");
    // Frameleaf accepts the last spent refresh token so uncertain rotations can still be revoked.
    await this.revokeAsync(previous, previous.tokens.refreshToken);
    if (!(await this.store.replaceAsync(claimed, null))) throw new FrameleafConnectionError("busy");
  }
}
