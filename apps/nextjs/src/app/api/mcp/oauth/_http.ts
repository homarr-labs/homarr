import { isIP } from "net";

import { auth } from "@homarr/auth/next";
import { sessionTokenCookieName } from "@homarr/auth/server";

import { env } from "~/env";

import { getMcpConsentBindingCookieName, MCP_BINDING_COOKIE_PREFIX, reconcileMcpConsentCookies } from "./_grant";
import type { GrantError, McpConsentNativeErrorReason, McpConsentSession } from "./_grant";
import { hasControlCharacters } from "./_validation";

type Parsed<T> = { ok: true; value: T } | { ok: false };
type Cookie = { name: string; value: string };

export function oauthError(error: string, error_description: string, status = 400) {
  return Response.json({ error, error_description }, { status });
}

export function grantError(result: GrantError) {
  return oauthError(result.error, result.error_description, result.status);
}

export function consentDecisionError(request: Request, error: string, error_description: string, status = 400) {
  const native =
    request.headers.get("sec-fetch-mode") === "navigate" ||
    request.headers
      .get("accept")
      ?.split(",")
      .some((type) => type.split(";")[0]?.trim().toLowerCase() === "text/html");
  if (!native) return oauthError(error, error_description, status);
  const reason: McpConsentNativeErrorReason =
    error === "access_denied" || error === "server_error" ? error : "invalid_request";
  return new Response(null, { status: 303, headers: { Location: `/auth/mcp/error?reason=${reason}` } });
}

export function localRedirect(path: string) {
  return new Response(null, { status: 303, headers: { Location: path } });
}

export function protectResponse(response: Response) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Content-Security-Policy", "frame-ancestors 'none'");
  return response;
}

export function requestCookies(request: Request): Cookie[] {
  const header = request.headers.get("cookie") ?? "";
  if (header.length > 32_768) return [];
  return header.split(";").flatMap((part) => {
    const separator = part.indexOf("=");
    if (separator < 0) return [];
    const name = part.slice(0, separator).trim();
    try {
      return [{ name, value: decodeURIComponent(part.slice(separator + 1).trim()) }];
    } catch {
      return [];
    }
  });
}

export function uniqueCookie(request: Request, name: string) {
  const matching = requestCookies(request).filter((cookie) => cookie.name === name);
  return matching.length === 1 ? (matching[0]?.value ?? null) : null;
}

export function browserBinding(request: Request, pendingId: string) {
  return uniqueCookie(request, getMcpConsentBindingCookieName(pendingId));
}

export async function currentConsentSession(request: Request): Promise<McpConsentSession | null> {
  const session = await auth();
  const sessionToken = uniqueCookie(request, sessionTokenCookieName);
  if (!session?.user.id || !sessionToken) return null;
  const expiresAt = Date.parse(session.expires);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
  return { userId: session.user.id, sessionToken, expiresAt };
}

function cookieAttributes(request: Request) {
  const secure = new URL(env.BASE_URL ?? request.url).protocol === "https:";
  return `Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function finishAuthorization(
  response: Response,
  request: Request,
  currentId: string | null = null,
  created?: { pendingId: string; browserBinding: string; expiresAt: number },
) {
  const cookies = requestCookies(request).filter(
    ({ name }) => name.startsWith(MCP_BINDING_COOKIE_PREFIX) && /^[A-Za-z0-9._-]+$/.test(name),
  );
  const names = new Set(cookies.map(({ name }) => name));
  const bindings = cookies.flatMap(({ name, value }) => {
    const pendingId = name.slice(MCP_BINDING_COOKIE_PREFIX.length);
    return /^[a-f0-9]{32}$/.test(pendingId) && cookies.filter((cookie) => cookie.name === name).length === 1
      ? [{ pendingId, value }]
      : [];
  });
  if (created) bindings.push({ pendingId: created.pendingId, value: created.browserBinding });
  const removed = new Set(reconcileMcpConsentCookies(bindings, currentId).map(getMcpConsentBindingCookieName));
  const knownNames = new Set(bindings.map(({ pendingId }) => getMcpConsentBindingCookieName(pendingId)));
  for (const name of names) {
    if (removed.has(name) || !knownNames.has(name))
      response.headers.append("Set-Cookie", `${name}=; ${cookieAttributes(request)}; Max-Age=0`);
  }
  if (created) {
    response.headers.append(
      "Set-Cookie",
      `${getMcpConsentBindingCookieName(created.pendingId)}=${created.browserBinding}; ${cookieAttributes(request)}; Expires=${new Date(created.expiresAt).toUTCString()}`,
    );
  }
  return protectResponse(response);
}

function decisionOrigin(request: Request) {
  if (env.BASE_URL) return new URL(env.BASE_URL).origin;
  const protocol = new URL(request.url).protocol;
  if (protocol !== "http:" && protocol !== "https:") return null;
  const host = request.headers.get("host");
  if (!host || host.length > 512 || hasControlCharacters(host) || /\s/.test(host)) return null;
  const authority = /^(?:\[([A-Fa-f0-9:.]+)\]|([A-Za-z0-9.-]+))(?::([0-9]{1,5}))?$/.exec(host);
  if (!authority) return null;
  const [, ipv6, hostname, port] = authority;
  if (port !== undefined && Number(port) > 65_535) return null;
  if (ipv6 !== undefined) {
    if (isIP(ipv6) !== 6) return null;
  } else {
    if (!hostname) return null;
    const dnsName = hostname.endsWith(".") ? hostname.slice(0, -1) : hostname;
    if (
      dnsName.length > 253 ||
      !dnsName.split(".").every((label) => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label))
    )
      return null;
  }
  const origin = new URL(`${protocol}//${host}`);
  if (hostname !== undefined && origin.hostname !== hostname.toLowerCase()) return null;
  return origin.origin;
}

export function validDecisionOrigin(request: Request) {
  try {
    const origin = request.headers.get("origin");
    const expected = decisionOrigin(request);
    if (!origin || origin === "null" || new URL(origin).origin !== origin || origin !== expected) return false;
    const site = request.headers.get("sec-fetch-site");
    const mode = request.headers.get("sec-fetch-mode");
    const destination = request.headers.get("sec-fetch-dest");
    return (
      (!site || site === "same-origin") &&
      (!mode || ["navigate", "same-origin", "cors"].includes(mode)) &&
      (!destination || ["document", "empty"].includes(destination))
    );
  } catch {
    return false;
  }
}

export function parseParameters(params: URLSearchParams | FormData): Parsed<Record<string, string>> {
  const value: Record<string, string> = {};
  let count = 0;
  for (const [key, entry] of params) {
    if (
      ++count > 32 ||
      key.length > 64 ||
      Object.hasOwn(value, key) ||
      typeof entry !== "string" ||
      entry.length > 4096 ||
      hasControlCharacters(entry)
    )
      return { ok: false };
    Object.defineProperty(value, key, { value: entry, enumerable: true });
  }
  return { ok: true, value };
}

export function authorizationQuery(request: Request) {
  if (request.url.length > 8192) return { ok: false } as const;
  return parseParameters(new URL(request.url).searchParams);
}

async function boundedBody(request: Request, limit: number): Promise<string | null> {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > limit)) return null;
  if (!request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let body = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        return null;
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    return body + decoder.decode();
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

function parseJson(body: string): Parsed<Record<string, unknown>> {
  try {
    const value: unknown = JSON.parse(body);
    if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false };
    const objects: Set<string>[] = [];
    const tokens = /"(?:\\[\s\S]|[^"\\])*"|[{}]/g;
    for (const match of body.matchAll(tokens)) {
      const token = match[0];
      if (token === "{") objects.push(new Set());
      else if (token === "}") objects.pop();
      else if (/^\s*:/.test(body.slice(match.index + token.length))) {
        const key: unknown = JSON.parse(token);
        const keys = objects.at(-1);
        if (typeof key !== "string" || !keys || keys.has(key)) return { ok: false };
        keys.add(key);
      }
    }
    return { ok: true, value: Object.fromEntries(Object.entries(value)) };
  } catch {
    return { ok: false };
  }
}

export async function registrationBody(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json") return { ok: false } as const;
  const body = await boundedBody(request, 32_768);
  return body === null ? ({ ok: false } as const) : parseJson(body);
}

export async function parameterBody(request: Request): Promise<Parsed<Record<string, string>>> {
  const body = await boundedBody(request, 8192);
  if (body === null) return { ok: false };
  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim();
  if (contentType === "application/x-www-form-urlencoded") return parseParameters(new URLSearchParams(body));
  if (contentType === "application/json") {
    const parsed = parseJson(body);
    if (!parsed.ok) return parsed;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(parsed.value)) {
      if (typeof value !== "string") return { ok: false };
      params.append(key, value);
    }
    return parseParameters(params);
  }
  if (contentType === "multipart/form-data") {
    try {
      const form = await new Request(request.url, { method: "POST", headers: request.headers, body }).formData();
      return parseParameters(form);
    } catch {
      return { ok: false };
    }
  }
  return { ok: false };
}
