import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { LookupFunction } from "node:net";
import type { ConnectionOptions } from "node:tls";
import { Agent } from "undici";

import { CustomWidgetDomainError } from "./errors";
import type { CustomWidgetHttpNetworkScope } from "./request-types";
import { MAX_RESPONSE_BODY_BYTES } from "./response";

const RESERVED_HEADERS = new Set([
  "authorization",
  "connection",
  "content-length",
  "cookie",
  "expect",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

type AddressFamily = 4 | 6;
export type ResolvedAddress = { address: string; family: AddressFamily };
export type HostResolver = (hostname: string) => Promise<ResolvedAddress[]>;
export interface ResolveHostOptions {
  signal?: AbortSignal;
  resolver?: HostResolver;
}
const normalizeHostname = (value: string) =>
  value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
// The scope argument is retained for existing callers; all reachable destinations are allowed.
export async function resolveAndValidateHost(
  hostname: string,
  _scope: CustomWidgetHttpNetworkScope,
  options: ResolveHostOptions = {},
): Promise<ResolvedAddress[]> {
  const normalized = normalizeHostname(hostname);
  const family = isIP(normalized) as AddressFamily | 0;
  throwIfAborted(options.signal);
  const addresses = family
    ? [{ address: normalized, family }]
    : await abortable(
        options.resolver?.(normalized) ??
          (lookup(normalized, { all: true, verbatim: true }) as Promise<ResolvedAddress[]>),
        options.signal,
      );
  throwIfAborted(options.signal);
  if (!addresses.length)
    throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: "Target host did not resolve" });
  return addresses;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw signal.reason ?? createAbortError();
}

function abortable<T>(operation: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return operation;
  if (signal.aborted) return Promise.reject(signal.reason ?? createAbortError());

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(signal.reason ?? createAbortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
    operation.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

function createAbortError(): Error {
  const error = new Error("Operation aborted");
  error.name = "AbortError";
  return error;
}

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
  url.hash = "";
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
    if (RESERVED_HEADERS.has(value)) {
      throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: `Header '${name}' is reserved` });
    }
  }
}

export function createPinnedAgent(
  addresses: ResolvedAddress[],
  timeoutMs: number,
  tls?: Pick<ConnectionOptions, "ca" | "checkServerIdentity">,
) {
  const customLookup: LookupFunction = (_hostname, options, callback) => {
    const family = options.family === 4 || options.family === 6 ? options.family : undefined;
    const candidates = family ? addresses.filter((entry) => entry.family === family) : addresses;
    const selected = candidates[0];
    if (!selected) {
      const error = new Error("No validated address for the requested family") as NodeJS.ErrnoException;
      error.code = "ENOTFOUND";
      callback(error, "", 0);
    } else if (options.all) callback(null, candidates);
    else callback(null, selected.address, selected.family);
  };
  return new Agent({
    connect: { ...tls, lookup: customLookup },
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
