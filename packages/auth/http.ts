import { Auth, setEnvDefaults } from "@auth/core";
import Cookies from "cookies";

import { parseCookies } from "@homarr/common";
import type { SupportedAuthProvider } from "@homarr/definitions";

import { createAuthConfiguration } from "./core-configuration";
import { renderSignInResponseAsync } from "./sign-in";

export { getSessionFromRequestAsync } from "./request-session";

/** Serve Auth.js, including CSRF, credential login, OIDC callbacks and session renewal. */
export const handleAuthRequestAsync = async (request: Request): Promise<Response> => {
  const trustedRequest = requestWithTrustedOrigin(request);
  const url = new URL(trustedRequest.url);
  const requestCookies = parseCookies(trustedRequest.headers.get("cookie") ?? "");
  const responseCookies: string[] = [];
  const config = createAuthConfiguration(extractProvider(url), trustedRequest.headers, url.protocol === "https:", {
    get: (name) => requestCookies[name],
    set: (name, value, options) => {
      requestCookies[name] = value;
      responseCookies.push(
        new Cookies.Cookie(name, encodeURIComponent(value), {
          ...options,
          httpOnly: options.httpOnly ?? false,
        }).toHeader(),
      );
    },
  });

  // Auth.js' own forms work without the dashboard, including the CSRF token flow.
  config.pages = {};
  config.useSecureCookies = url.protocol === "https:";
  config.secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  setEnvDefaults(process.env, config, true);

  if (request.method === "GET" && url.pathname === "/api/auth/signin") {
    return await renderSignInResponseAsync(trustedRequest, config);
  }

  const response = await Auth(trustedRequest, config);
  const headers = new Headers(response.headers);
  for (const cookie of responseCookies) {
    headers.append("set-cookie", cookie);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const extractProvider = (url: URL): SupportedAuthProvider | "unknown" => {
  const provider = url.pathname.split("/")[4];
  if (provider === "oidc" || provider === "credentials" || provider === "ldap") {
    return provider;
  }
  return "unknown";
};

const requestWithTrustedOrigin = (request: Request): Request => {
  const url = new URL(request.url);
  const configuredUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (configuredUrl) {
    const configuredOrigin = new URL(configuredUrl);
    url.protocol = configuredOrigin.protocol;
    url.host = configuredOrigin.host;
    return new Request(url, request);
  }

  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host"))?.split(",")[0]?.trim();
  if (!protocol || !host) {
    return request;
  }
  if (protocol !== "http" && protocol !== "https") {
    return request;
  }

  url.protocol = `${protocol}:`;
  url.host = host;
  return new Request(url, request);
};
