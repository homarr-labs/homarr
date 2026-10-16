import { Auth } from "@auth/core";
import type { AuthConfig } from "@auth/core";

import { parseCookies } from "@homarr/common";

import { env } from "./env";
import { getEnabledProviders } from "./providers/check-provider";

/** Minimal browser login for installations that do not run a dashboard frontend. */
export const renderSignInResponseAsync = async (request: Request, config: AuthConfig): Promise<Response> => {
  const url = new URL(request.url);
  const cookies = parseCookies(request.headers.get("cookie") ?? "");
  let securePrefix = "";
  if (url.protocol === "https:") securePrefix = "__Secure-";
  const callbackUrl =
    url.searchParams.get("callbackUrl") ??
    cookies[`${securePrefix}${env.AUTH_COOKIE_PREFIX}.callback-url`] ??
    "/api/auth/session";
  const csrfUrl = new URL(request.url);
  csrfUrl.pathname = "/api/auth/csrf";
  csrfUrl.search = new URLSearchParams({ callbackUrl }).toString();
  const response = await Auth(new Request(csrfUrl, request), config);
  const body = (await response.clone().json()) as { csrfToken?: string };
  if (!response.ok || typeof body.csrfToken !== "string") {
    return response;
  }

  const hiddenFields = `<input type="hidden" name="csrfToken" value="${escapeHtml(body.csrfToken)}"><input type="hidden" name="callbackUrl" value="${escapeHtml(callbackUrl)}">`;
  const forms = getEnabledProviders().map((provider) => {
    if (provider === "oidc") {
      return `<form action="/api/auth/signin/oidc" method="post">${hiddenFields}<button type="submit">Sign in with ${escapeHtml(env.AUTH_OIDC_CLIENT_NAME)}</button></form>`;
    }
    let name = "Credentials";
    if (provider === "ldap") name = "LDAP";
    return `<form action="/api/auth/callback/${provider}" method="post">${hiddenFields}<label>Username<input name="name" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button type="submit">Sign in with ${name}</button></form>`;
  });
  let error = "";
  if (url.searchParams.has("error")) {
    error = '<p role="alert">Sign in failed. Check your credentials and try again.</p>';
  }

  const headers = new Headers(response.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-store");
  // OIDC form submissions redirect to the identity provider before returning.
  headers.set(
    "content-security-policy",
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self' http: https:; frame-ancestors 'none'; base-uri 'none'",
  );
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in to Homarr</title><style>body{font:16px system-ui;max-width:24rem;margin:4rem auto;padding:1rem}form{display:grid;gap:1rem;margin:2rem 0}label{display:grid;gap:.4rem}input,button{font:inherit;padding:.65rem}button{cursor:pointer}</style></head><body><h1>Sign in to Homarr</h1>${error}${forms.join("")}</body></html>`,
    { headers },
  );
};

const escapeHtml = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
