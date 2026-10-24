import type { ConnectionOptions } from "node:tls";
import { Agent } from "undici";

import { CustomWidgetDomainError } from "./errors";
import { MAX_RESPONSE_BODY_BYTES } from "./response";

const RESERVED_HEADERS = new Set([
  "authorization",
  "connection",
  "content-length",
  "cookie",
  "expect",
  "forwarded",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "via",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-port",
  "x-forwarded-proto",
]);

export function validateCustomWidgetUrl(value: string | URL): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: "Invalid custom widget URL" });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: "Only HTTP and HTTPS URLs are allowed" });
  if (url.username || url.password)
    throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: "URL credentials are not allowed" });
  if (url.hash) throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: "URL fragments are not allowed" });
  return url;
}

export function resolveSameOriginTarget(baseValue: string, targetValue?: string | URL): URL {
  const base = validateCustomWidgetUrl(baseValue);
  const target = validateCustomWidgetUrl(targetValue ?? base);
  if (target.origin !== base.origin)
    throw new CustomWidgetDomainError({
      code: "FORBIDDEN",
      message: "Named requests must stay on the widget's origin",
    });
  return target;
}

export function assertSafeStaticHeaders(headers: Record<string, string> | undefined): void {
  for (const name of Object.keys(headers ?? {})) {
    const value = name.trim().toLowerCase();
    if (
      RESERVED_HEADERS.has(value) ||
      value.startsWith("proxy-") ||
      value.startsWith("sec-") ||
      value.startsWith("x-forwarded-")
    ) {
      throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: `Header '${name}' is reserved` });
    }
  }
}

export function createRequestAgent(timeoutMs: number, tls?: Pick<ConnectionOptions, "ca" | "checkServerIdentity">) {
  return new Agent({
    connect: { ...tls },
    connectTimeout: timeoutMs,
    headersTimeout: timeoutMs,
    bodyTimeout: timeoutMs,
    maxResponseSize: MAX_RESPONSE_BODY_BYTES,
  });
}

export function assertCustomWidgetPathScope(url: URL, pathPrefix: string) {
  const decodedPrefix = decodePath(pathPrefix);
  let prefixEnd = decodedPrefix.length;
  while (prefixEnd > 0 && decodedPrefix.charAt(prefixEnd - 1) === "/") {
    prefixEnd -= 1;
  }
  const prefix = decodedPrefix.slice(0, prefixEnd);
  const path = decodePath(url.pathname);
  if (
    path.includes("\\") ||
    path.split("/").some((segment) => segment === "." || segment === "..") ||
    (prefix && path !== prefix && !path.startsWith(`${prefix}/`))
  ) {
    throw new CustomWidgetDomainError({
      code: "FORBIDDEN",
      message: "Request must remain within the selected integration URL",
    });
  }
}

function decodePath(value: string) {
  let path = value;
  for (let pass = 0; pass < 4; pass += 1) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(path);
    } catch {
      throw new CustomWidgetDomainError({ code: "FORBIDDEN", message: "Request path contains invalid encoding" });
    }
    if (decoded === path) return path;
    path = decoded;
  }
  if (/%[0-9a-f]{2}/iu.test(path))
    throw new CustomWidgetDomainError({ code: "FORBIDDEN", message: "Request path is excessively encoded" });
  return path;
}
