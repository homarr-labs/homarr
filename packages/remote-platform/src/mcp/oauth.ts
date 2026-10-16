import { timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { record, textField, onlyFields } from "../security";
import type { GlobalMcpOptions } from "./types";
import { opaqueToken, tokenHash } from "./store";
import type { OAuthPending } from "./store";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
export function sameSecret(left: string | null | undefined, right: string | null | undefined): boolean {
  if (!left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
function redirectUri(value: unknown): string {
  const input = textField(value, "redirect URI", 2048);
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new HTTPException(400, { message: "Invalid redirect URI" });
  }
  if (
    url.username ||
    url.password ||
    url.hash ||
    input.includes("\\") ||
    Array.from(input).some((character) => character.charCodeAt(0) <= 32)
  )
    throw new HTTPException(400, { message: "Invalid redirect URI" });
  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
  )
    throw new HTTPException(400, { message: "Redirect URI must use HTTPS or loopback HTTP" });
  return input;
}
function form(params: URLSearchParams) {
  const result: Record<string, string> = {};
  for (const [name, value] of params) {
    if (name in result) throw new HTTPException(400, { message: "Duplicate OAuth parameter" });
    result[name] = value;
  }
  return result;
}
export function globalOAuthRoutes(options: GlobalMcpOptions) {
  const { secrets, store } = options;
  const now = options.now ?? Date.now;
  const base = options.publicUrl.replace(/\/$/, "");
  const origin = new URL(base).origin;
  const resource = `${base}/mcp`;
  const secure = new URL(base).protocol === "https:";
  let cookieName = "homarr_mcp_consent";
  if (secure) cookieName = "__Host-homarr_mcp_consent";
  const app = new Hono();
  const cookieOptions = { path: "/", httpOnly: true, secure, sameSite: "Lax", maxAge: 300 } as const;
  app.get("/.well-known/oauth-authorization-server", (c) =>
    c.json({
      issuer: resource,
      authorization_endpoint: `${resource}/oauth/authorize`,
      token_endpoint: `${resource}/oauth/token`,
      registration_endpoint: `${resource}/oauth/register`,
      revocation_endpoint: `${resource}/oauth/revoke`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: ["mcp:tools"],
    }),
  );
  // RFC 8414 path-aware issuer discovery used by modern MCP clients.
  app.get("/.well-known/oauth-authorization-server/mcp", (c) =>
    c.redirect(`${base}/.well-known/oauth-authorization-server`),
  );
  app.get("/mcp/.well-known/oauth-authorization-server", (c) =>
    c.redirect(`${base}/.well-known/oauth-authorization-server`),
  );
  app.get("/.well-known/oauth-protected-resource/mcp", (c) =>
    c.json({
      resource,
      authorization_servers: [resource],
      bearer_methods_supported: ["header"],
      scopes_supported: ["mcp:tools"],
    }),
  );
  app.post("/mcp/oauth/register", async (c) => {
    const body = record(await c.req.json());
    onlyFields(body, [
      "client_name",
      "redirect_uris",
      "token_endpoint_auth_method",
      "grant_types",
      "response_types",
      "client_uri",
      "logo_uri",
      "contacts",
      "software_id",
      "software_version",
      "application_type",
    ]);
    if (body.token_endpoint_auth_method !== undefined && body.token_endpoint_auth_method !== "none")
      throw new HTTPException(400, { message: "Public clients use token_endpoint_auth_method=none" });
    if (!Array.isArray(body.redirect_uris) || !body.redirect_uris.length || body.redirect_uris.length > 10)
      throw new HTTPException(400, { message: "Expected 1-10 redirect URIs" });
    const redirectUris = body.redirect_uris.map(redirectUri);
    if (new Set(redirectUris).size !== redirectUris.length)
      throw new HTTPException(400, { message: "Duplicate redirect URI" });
    if (!secrets.canRegisterClient(now()))
      throw new HTTPException(503, { message: "OAuth registration capacity reached" });
    const id = opaqueToken();
    const name = textField(body.client_name ?? "MCP client", "client name", 200);
    secrets.saveClient({ id, name, redirectUris, expiresAt: now() + 30 * 86_400_000 });
    return c.json(
      {
        client_id: id,
        client_name: name,
        redirect_uris: redirectUris,
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code"],
        response_types: ["code"],
      },
      201,
    );
  });
  app.get("/mcp/oauth/authorize", async (c) => {
    const params = form(new URL(c.req.url).searchParams);
    const client = secrets.client(params.client_id ?? "", now());
    if (
      !client ||
      params.response_type !== "code" ||
      params.code_challenge_method !== "S256" ||
      !/^[A-Za-z0-9_-]{43}$/.test(params.code_challenge ?? "") ||
      params.resource !== resource ||
      (params.scope !== undefined && params.scope !== "mcp:tools")
    )
      throw new HTTPException(400, { message: "Expected registered client, canonical resource and S256 PKCE" });
    const callback = redirectUri(params.redirect_uri);
    if (!client.redirectUris.includes(callback)) throw new HTTPException(400, { message: "Unregistered redirect URI" });
    if (params.state && params.state.length > 2048)
      throw new HTTPException(400, { message: "OAuth state is too large" });
    const session = await options.browserSession(c.req.raw);
    if (!session || session.expiresAt <= now() || !store.user(session.userId)) {
      const signIn = `${origin}/?workers=account`;
      return c.html(
        `<!doctype html><html lang="en"><meta charset="utf-8"><title>Sign in to Homarr</title><body><h1>Sign in to Homarr</h1><p>Open Homarr, sign in with your GitHub account, then return here and reload.</p><p><a href="${escapeHtml(signIn)}" target="_blank" rel="noopener">Open Homarr</a></p><button onclick="location.reload()">I am signed in</button></body></html>`,
      );
    }
    let organizationId: string | null = null;
    if (params.organization_id) {
      if (!store.organizations.get(params.organization_id, session.userId))
        throw new HTTPException(403, { message: "Organization membership required" });
      organizationId = params.organization_id;
    }
    const browserBinding = opaqueToken();
    const consent = opaqueToken();
    const pending: OAuthPending = {
      id: opaqueToken(),
      clientId: client.id,
      redirectUri: callback,
      challenge: params.code_challenge ?? "",
      state: params.state ?? null,
      audience: resource,
      organizationId,
      browserHash: tokenHash(browserBinding),
      userId: session.userId,
      sessionHash: tokenHash(session.sessionId),
      consentHash: tokenHash(consent),
      expiresAt: now() + 300_000,
    };
    secrets.savePending(pending);
    setCookie(c, cookieName, browserBinding, cookieOptions);
    const available = store.workersForPrincipal(session.userId, organizationId ?? undefined);
    return c.html(
      `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Authorize Homarr MCP</title><body><h1>Connect ${escapeHtml(client.name)} to Homarr?</h1><p>Account: ${escapeHtml(store.user(session.userId)?.name ?? "Homarr account")}. The client can discover your current workers and use only the hosted MCP services explicitly approved at each worker.</p><p>The hosted MCP gateway handles authorized requests and results. The routing relay carries encrypted messages. Your browser's owner key is never shared.</p><p>${available.length} workers in your current account${organizationId ? " organization" : " and organizations"}. Current membership and worker permissions are checked on every call.</p><form action="${escapeHtml(resource)}/oauth/authorize" method="post"><input type="hidden" name="pending_id" value="${pending.id}"><input type="hidden" name="csrf" value="${escapeHtml(session.csrfToken)}"><input type="hidden" name="consent" value="${consent}"><button name="decision" value="approve">Allow access</button><button name="decision" value="deny">Cancel</button></form></body></html>`,
    );
  });
  app.post("/mcp/oauth/authorize", async (c) => {
    if (c.req.header("Origin") !== origin) throw new HTTPException(403, { message: "Invalid request origin" });
    const fields = form(new URLSearchParams(await c.req.text()));
    const session = await options.browserSession(c.req.raw);
    const pending = secrets.pending(fields.pending_id ?? "", now());
    const binding = getCookie(c, cookieName);
    if (
      !session ||
      session.expiresAt <= now() ||
      !pending ||
      !binding ||
      !sameSecret(pending.browserHash, tokenHash(binding)) ||
      !sameSecret(fields.csrf, session.csrfToken) ||
      !sameSecret(pending.consentHash, tokenHash(fields.consent ?? "")) ||
      pending.userId !== session.userId ||
      !sameSecret(pending.sessionHash, tokenHash(session.sessionId))
    )
      throw new HTTPException(403, { message: "Consent must be approved by the same signed-in browser session" });
    if (fields.decision !== "approve" && fields.decision !== "deny")
      throw new HTTPException(400, { message: "Invalid consent decision" });
    if (
      !store.user(session.userId) ||
      (pending.organizationId && !store.organizations.get(pending.organizationId, session.userId))
    )
      throw new HTTPException(403, { message: "Account access was revoked" });
    const code = secrets.decide(pending, session.userId, fields.decision === "approve", now());
    deleteCookie(c, cookieName, { path: "/", secure });
    const callback = new URL(pending.redirectUri);
    for (const name of ["code", "error", "state"]) callback.searchParams.delete(name);
    if (code) callback.searchParams.set("code", code);
    else callback.searchParams.set("error", "access_denied");
    if (pending.state !== null) callback.searchParams.set("state", pending.state);
    return c.redirect(callback.toString(), 302);
  });
  app.post("/mcp/oauth/token", async (c) => {
    const fields = form(new URLSearchParams(await c.req.text()));
    const code = secrets.consumeCode(fields.code ?? "", now());
    if (
      fields.grant_type !== "authorization_code" ||
      !code ||
      !/^[A-Za-z0-9._~-]{43,128}$/.test(fields.code_verifier ?? "") ||
      !sameSecret(tokenHash(fields.code_verifier ?? ""), code.challenge) ||
      fields.client_id !== code.clientId ||
      fields.resource !== resource ||
      (fields.redirect_uri !== undefined && fields.redirect_uri !== code.redirectUri) ||
      !secrets.client(code.clientId, now()) ||
      !store.user(code.userId) ||
      (code.organizationId && !store.organizations.get(code.organizationId, code.userId))
    )
      return c.json({ error: "invalid_grant" }, 400);
    const token = opaqueToken();
    secrets.saveToken(token, {
      id: opaqueToken(),
      userId: code.userId,
      clientId: code.clientId,
      audience: resource,
      organizationId: code.organizationId,
      expiresAt: now() + 3_600_000,
    });
    return c.json({ access_token: token, token_type: "Bearer", expires_in: 3600, scope: "mcp:tools" });
  });
  app.post("/mcp/oauth/revoke", async (c) => {
    const fields = form(new URLSearchParams(await c.req.text()));
    if (fields.token) secrets.revokeToken(fields.token);
    return c.json({ ok: true });
  });
  return app;
}
