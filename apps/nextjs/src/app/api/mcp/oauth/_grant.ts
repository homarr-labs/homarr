import "server-only";

import { createHash, randomBytes } from "crypto";

import { hashPasswordAsync } from "@homarr/auth/security";
import { generateSecureRandomToken } from "@homarr/common/server";
import { db } from "@homarr/db";
import { apiKeys } from "@homarr/db/schema";

import {
  consumeCode,
  createPending,
  decidePending,
  fingerprint,
  getClient,
  getPending,
  reconcileBindings,
  registerClient,
  secretMatches,
} from "./_store";
import type { GrantIdentity, PendingGrant } from "./_store";
import { hasControlCharacters } from "./_validation";

export interface McpConsentSession {
  userId: string;
  sessionToken: string;
  expiresAt: number;
}

export interface McpConsentDisplay {
  pendingId: string;
  consentToken: string;
  clientId: string;
  clientName: string;
  redirectUri: string;
  expiresAt: number;
}

export type McpConsentResult =
  | { ok: true; consent: McpConsentDisplay }
  | { ok: false; error: "unavailable" | "invalid_browser" | "login_required" | "session_changed" };

export type McpConsentNativeErrorReason = "invalid_request" | "access_denied" | "server_error";

export interface McpConsentInput {
  pendingId: string;
  browserBinding: string | null;
  session: McpConsentSession | null;
}

export type GrantError = {
  ok: false;
  error: string;
  error_description: string;
  status: number;
};

const opaqueId = /^[a-f0-9]{32}$/;
const secret = /^[a-f0-9]{64}$/;
const verifier = /^[A-Za-z0-9._~-]{43,128}$/;
const challenge = /^[A-Za-z0-9_-]{43}$/;
export const MCP_BINDING_COOKIE_PREFIX = "homarr.mcp-consent.";

export function getMcpConsentBindingCookieName(pendingId: string) {
  return `${MCP_BINDING_COOKIE_PREFIX}${pendingId}`;
}

function failure(error: string, error_description: string, status = 400): GrantError {
  return { ok: false, error, error_description, status };
}

function identityFromSession(session: McpConsentSession | null): GrantIdentity | null {
  if (
    !session?.userId ||
    !session.sessionToken ||
    !Number.isFinite(session.expiresAt) ||
    session.expiresAt <= Date.now()
  )
    return null;
  return { userId: session.userId, sessionFingerprint: fingerprint(session.sessionToken) };
}

function validateConsent(
  input: McpConsentInput,
): { ok: true; pending: PendingGrant; identity: GrantIdentity } | Extract<McpConsentResult, { ok: false }> {
  const pending = opaqueId.test(input.pendingId) ? getPending(input.pendingId) : null;
  if (!pending) return { ok: false, error: "unavailable" };
  if (
    !input.browserBinding ||
    !secret.test(input.browserBinding) ||
    !secretMatches(pending.browserFingerprint, fingerprint(input.browserBinding))
  ) {
    return { ok: false, error: "invalid_browser" };
  }
  const identity = identityFromSession(input.session);
  if (!identity) return { ok: false, error: "login_required" };
  if (
    pending.identity &&
    (pending.identity.userId !== identity.userId ||
      !secretMatches(pending.identity.sessionFingerprint, identity.sessionFingerprint))
  ) {
    return { ok: false, error: "session_changed" };
  }
  return { ok: true, pending, identity };
}

export function readMcpConsent(input: McpConsentInput): McpConsentResult {
  const result = validateConsent(input);
  if (!result.ok) return result;
  result.pending.identity ??= result.identity;
  const { context, consentToken, expiresAt } = result.pending;
  return {
    ok: true,
    consent: {
      pendingId: input.pendingId,
      consentToken,
      clientId: context.clientId,
      clientName: context.clientName,
      redirectUri: context.redirectUri,
      expiresAt,
    },
  };
}

function validCallback(value: string) {
  if (!value || value.length > 2048 || /\s/.test(value) || value.includes("\\") || hasControlCharacters(value))
    return false;
  const authority = /^https?:\/\/([^/?#]+)/i.exec(value)?.[1];
  if (!authority || authority.includes("@")) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password && !value.includes("#")
    );
  } catch {
    return false;
  }
}

export function registerMcpClient(body: Record<string, unknown>) {
  const uris = body.redirect_uris;
  if (
    !Array.isArray(uris) ||
    !uris.length ||
    uris.length > 10 ||
    !uris.every((uri): uri is string => typeof uri === "string" && validCallback(uri))
  ) {
    return failure(
      "invalid_client_metadata",
      "redirect_uris must contain 1-10 HTTP(S) callbacks without userinfo or fragments",
    );
  }
  if (new Set(uris).size !== uris.length) return failure("invalid_client_metadata", "Duplicate redirect_uris");
  const name = body.client_name ?? "MCP Client";
  if (typeof name !== "string" || !name.trim() || name.length > 256 || hasControlCharacters(name)) {
    return failure("invalid_client_metadata", "Invalid client_name");
  }
  const client = registerClient(uris, name);
  if (!client) return failure("server_error", "Too many registered clients, please try again later", 503);
  return {
    ok: true,
    registration: {
      client_id: client.clientId,
      client_secret: client.clientSecret,
      client_name: client.clientName,
      redirect_uris: [...client.redirectUris],
      token_endpoint_auth_method: "none",
    },
  } as const;
}

export function beginMcpAuthorization(
  params: Record<string, string>,
  resources: ReadonlySet<string>,
  session: McpConsentSession | null,
) {
  const { client_id, redirect_uri, code_challenge, code_challenge_method, response_type, resource, scope, state } =
    params;
  if (
    response_type !== "code" ||
    !client_id ||
    !opaqueId.test(client_id) ||
    !redirect_uri ||
    !validCallback(redirect_uri) ||
    !code_challenge ||
    !challenge.test(code_challenge) ||
    Buffer.from(code_challenge, "base64url").toString("base64url") !== code_challenge ||
    code_challenge_method !== "S256" ||
    (state !== undefined && state.length > 2048)
  ) {
    return failure("invalid_request", "Expected response_type=code, a registered callback and explicit S256 PKCE");
  }
  if (scope !== undefined && scope !== "mcp:tools") return failure("invalid_scope", "Only mcp:tools is supported");
  if (resource !== undefined && !resources.has(resource))
    return failure("invalid_target", "The resource must be the canonical Homarr MCP endpoint");
  const client = getClient(client_id);
  if (!client) return failure("invalid_client", "Client registration expired or is unavailable; please re-register");
  if (!client.redirectUris.includes(redirect_uri)) return failure("invalid_request", "redirect_uri not registered");
  const pending = createPending(
    {
      clientId: client.clientId,
      clientName: client.clientName,
      redirectUri: redirect_uri,
      codeChallenge: code_challenge,
      codeChallengeMethod: "S256",
      state: state ?? null,
      resource: resource ?? null,
      canonicalResources: [...resources],
      scope: "mcp:tools",
      clientExpiresAt: client.expiresAt,
    },
    identityFromSession(session),
  );
  if (!pending) return failure("server_error", "Server is busy, please try again later", 503);
  return { ok: true, ...pending, authenticated: identityFromSession(session) !== null } as const;
}

export function decideMcpAuthorization(input: McpConsentInput, consentToken: string, decision: string) {
  if ((decision !== "approve" && decision !== "deny") || !secret.test(consentToken))
    return failure("invalid_request", "Invalid consent decision");
  const result = validateConsent(input);
  if (!result.ok)
    return failure(
      result.error,
      "Consent request is unavailable for this browser and session",
      result.error === "login_required" ? 401 : 400,
    );
  if (!result.pending.identity || !secretMatches(result.pending.consentToken, consentToken))
    return failure("invalid_request", "Invalid consent proof");
  const transition = decidePending(input.pendingId, result.pending, decision, result.identity.userId);
  if (!transition.ok) return failure("server_error", "Consent request is no longer available", 503);
  const callback = new URL(result.pending.context.redirectUri);
  for (const field of ["code", "error", "error_description", "state"]) callback.searchParams.delete(field);
  if (transition.code) callback.searchParams.set("code", transition.code);
  else callback.searchParams.set("error", "access_denied");
  if (result.pending.context.state !== null) callback.searchParams.set("state", result.pending.context.state);
  return { ok: true, redirectUri: callback.toString() } as const;
}

export function reconcileMcpConsentCookies(
  bindings: readonly { pendingId: string; value: string }[],
  currentId: string | null,
) {
  return reconcileBindings(bindings, currentId);
}

export async function redeemMcpAuthorization(params: Record<string, string>) {
  if (params.grant_type !== "authorization_code")
    return failure("unsupported_grant_type", "Only authorization_code is supported");
  if (!params.code || !secret.test(params.code)) return failure("invalid_request", "Invalid authorization code");
  const code = consumeCode(params.code);
  if (!code) return failure("invalid_grant", "Invalid or expired authorization code");
  if (!params.code_verifier || !verifier.test(params.code_verifier))
    return failure("invalid_grant", "Invalid code_verifier");
  if (
    !params.client_id ||
    params.client_id !== code.context.clientId ||
    (params.redirect_uri !== undefined && params.redirect_uri !== code.context.redirectUri)
  )
    return failure("invalid_grant", "Client or callback mismatch");
  if (
    code.context.resource !== null
      ? params.resource !== code.context.resource
      : params.resource !== undefined && !code.context.canonicalResources.includes(params.resource)
  )
    return failure("invalid_target", "resource mismatch");
  const computed = createHash("sha256").update(params.code_verifier).digest("base64url");
  if (!secretMatches(computed, code.context.codeChallenge)) return failure("invalid_grant", "PKCE verification failed");
  try {
    const id = randomBytes(4).toString("hex");
    const token = generateSecureRandomToken(24);
    const hashedToken = await hashPasswordAsync(token);
    await db.insert(apiKeys).values({
      id,
      apiKey: hashedToken,
      userId: code.userId,
      oauthClientId: code.context.clientId,
      oauthClientName: code.context.clientName,
      oauthRedirectUri: code.context.redirectUri,
      oauthIssuedAt: new Date(),
    });
    return {
      ok: true,
      token: { access_token: `${id}.${token}`, token_type: "Bearer", scope: code.context.scope },
    } as const;
  } catch {
    return failure("server_error", "Failed to issue access token", 500);
  }
}
