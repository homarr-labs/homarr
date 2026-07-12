import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

import { TRPCError } from "@trpc/server";
import { Agent, fetch, Headers } from "undici";
import type { LookupFunction } from "node:net";
import type { Response } from "undici";

import { createLogger } from "@homarr/core/infrastructure/logs";
import type { CustomJsxNetworkScope, CustomWidgetMethod } from "@homarr/validation/custom-widget";

import { applyAuth } from "./auth";

const logger = createLogger({ module: "custom-widget:http" });

export const MAX_REQUEST_BODY_BYTES = 10 * 1024;
export const MAX_RESPONSE_BODY_BYTES = 1024 * 1024;
export const MAX_RESPONSE_JSON_DEPTH = 32;
export const MAX_RESPONSE_JSON_NODES = 50_000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_QUERY_REDIRECTS = 3;

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

const alwaysBlockedAddresses = new BlockList();
alwaysBlockedAddresses.addSubnet("0.0.0.0", 8, "ipv4");
alwaysBlockedAddresses.addSubnet("100.64.0.0", 10, "ipv4");
alwaysBlockedAddresses.addSubnet("169.254.0.0", 16, "ipv4");
alwaysBlockedAddresses.addSubnet("192.0.0.0", 24, "ipv4");
alwaysBlockedAddresses.addSubnet("192.0.2.0", 24, "ipv4");
alwaysBlockedAddresses.addSubnet("198.18.0.0", 15, "ipv4");
alwaysBlockedAddresses.addSubnet("198.51.100.0", 24, "ipv4");
alwaysBlockedAddresses.addSubnet("203.0.113.0", 24, "ipv4");
alwaysBlockedAddresses.addSubnet("224.0.0.0", 4, "ipv4");
alwaysBlockedAddresses.addSubnet("240.0.0.0", 4, "ipv4");
alwaysBlockedAddresses.addAddress("::", "ipv6");
alwaysBlockedAddresses.addSubnet("64:ff9b::", 96, "ipv6");
alwaysBlockedAddresses.addSubnet("100::", 64, "ipv6");
alwaysBlockedAddresses.addSubnet("2001:db8::", 32, "ipv6");
alwaysBlockedAddresses.addSubnet("fe80::", 10, "ipv6");
alwaysBlockedAddresses.addSubnet("ff00::", 8, "ipv6");
alwaysBlockedAddresses.addAddress("fd00:ec2::254", "ipv6");

const privateAddresses = new BlockList();
privateAddresses.addSubnet("10.0.0.0", 8, "ipv4");
privateAddresses.addSubnet("172.16.0.0", 12, "ipv4");
privateAddresses.addSubnet("192.168.0.0", 16, "ipv4");
privateAddresses.addSubnet("fc00::", 7, "ipv6");

const loopbackAddresses = new BlockList();
loopbackAddresses.addSubnet("127.0.0.0", 8, "ipv4");
loopbackAddresses.addAddress("::1", "ipv6");

type AddressFamily = 4 | 6;
type ResolvedAddress = { address: string; family: AddressFamily };
type AddressClass = "public" | "private" | "loopback" | "blocked";

export interface CustomWidgetAuthConfig {
  type: string;
  secrets: Array<{ kind: string; value: string }>;
  headerName?: string | null;
}

export interface CustomWidgetHttpRequest {
  baseUrl: string;
  targetUrl?: string | URL;
  method: CustomWidgetMethod;
  body?: string;
  staticHeaders?: Record<string, string>;
  auth?: CustomWidgetAuthConfig;
  networkScope: CustomJsxNetworkScope;
  kind: "query" | "action";
  cacheKey?: string;
  cacheTtlSeconds?: number;
}

export interface CustomWidgetHttpResponse {
  ok: boolean;
  status: number;
  statusText: string;
  data: unknown;
}

const responseCache = new Map<string, { expiresAt: number; response: CustomWidgetHttpResponse }>();
const inFlightRequests = new Map<string, Promise<CustomWidgetHttpResponse>>();
const MAX_RESPONSE_CACHE_ENTRIES = 1_000;

const pruneResponseCache = () => {
  const now = Date.now();
  for (const [key, entry] of responseCache) {
    if (entry.expiresAt <= now) responseCache.delete(key);
  }
  while (responseCache.size >= MAX_RESPONSE_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    responseCache.delete(oldestKey);
  }
};

const normalizeHostname = (hostname: string) =>
  hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;

const familyName = (family: AddressFamily) => (family === 4 ? "ipv4" : "ipv6");

export const classifyAddress = (address: string): AddressClass => {
  const normalized = normalizeHostname(address).toLowerCase();
  const family = isIP(normalized) as AddressFamily | 0;
  if (family === 0) return "blocked";

  if (normalized.includes("::ffff:")) return "blocked";
  if (alwaysBlockedAddresses.check(normalized, familyName(family))) return "blocked";
  if (loopbackAddresses.check(normalized, familyName(family))) return "loopback";
  if (privateAddresses.check(normalized, familyName(family))) return "private";
  return "public";
};

const isAddressAllowed = (classification: AddressClass, scope: CustomJsxNetworkScope) => {
  if (classification === "blocked") return false;
  if (classification === "public") return true;
  if (classification === "private") return scope === "private" || scope === "loopback";
  return scope === "loopback";
};

export const resolveAndValidateHost = async (
  hostname: string,
  scope: CustomJsxNetworkScope,
): Promise<ResolvedAddress[]> => {
  const normalized = normalizeHostname(hostname);
  const literalFamily = isIP(normalized) as AddressFamily | 0;
  const addresses = literalFamily
    ? [{ address: normalized, family: literalFamily }]
    : ((await lookup(normalized, { all: true, verbatim: true })) as ResolvedAddress[]);

  if (addresses.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Target host did not resolve" });
  }

  for (const resolved of addresses) {
    const classification = classifyAddress(resolved.address);
    if (!isAddressAllowed(classification, scope)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Target address is not allowed by the ${scope} network scope`,
      });
    }
  }

  return addresses;
};

export const validateCustomWidgetUrl = (value: string | URL): URL => {
  let url: URL;
  try {
    url = value instanceof URL ? new URL(value) : new URL(value);
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid custom widget URL" });
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Only HTTP and HTTPS URLs are allowed" });
  }
  if (url.username || url.password) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "URL credentials are not allowed" });
  }
  if (url.hash) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "URL fragments are not allowed" });
  }
  return url;
};

export const resolveSameOriginTarget = (baseUrlValue: string, targetUrlValue?: string | URL): URL => {
  const baseUrl = validateCustomWidgetUrl(baseUrlValue);
  const targetUrl = validateCustomWidgetUrl(targetUrlValue ?? baseUrl);
  if (targetUrl.origin !== baseUrl.origin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Named requests must stay on the widget's origin" });
  }
  return targetUrl;
};

export const assertSafeStaticHeaders = (headers: Record<string, string> | undefined): void => {
  for (const name of Object.keys(headers ?? {})) {
    const normalized = name.trim().toLowerCase();
    if (
      RESERVED_HEADERS.has(normalized) ||
      normalized.startsWith("proxy-") ||
      normalized.startsWith("sec-") ||
      normalized.startsWith("x-forwarded-")
    ) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Header '${name}' is reserved` });
    }
  }
};

const createPinnedAgent = (addresses: ResolvedAddress[]) => {
  const customLookup: LookupFunction = (_hostname, options, callback) => {
    const requestedFamily = options.family === 4 || options.family === 6 ? options.family : undefined;
    const candidates = requestedFamily ? addresses.filter((address) => address.family === requestedFamily) : addresses;
    const selected = candidates[0];
    if (!selected) {
      const error = new Error("No validated address for the requested family") as NodeJS.ErrnoException;
      error.code = "ENOTFOUND";
      callback(error, "", 0);
      return;
    }

    if (options.all) {
      callback(null, candidates);
      return;
    }
    callback(null, selected.address, selected.family);
  };

  return new Agent({
    connect: { lookup: customLookup },
    connectTimeout: REQUEST_TIMEOUT_MS,
    headersTimeout: REQUEST_TIMEOUT_MS,
    bodyTimeout: REQUEST_TIMEOUT_MS,
    maxResponseSize: MAX_RESPONSE_BODY_BYTES,
  });
};

const readLimitedBody = async (response: Response): Promise<string> => {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BODY_BYTES) {
    throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Response exceeds the 1 MiB limit" });
  }

  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    totalBytes += chunk.value.byteLength;
    if (totalBytes > MAX_RESPONSE_BODY_BYTES) {
      await reader.cancel();
      throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Response exceeds the 1 MiB limit" });
    }
    chunks.push(chunk.value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
};

export const assertJsonBudget = (value: unknown): void => {
  let nodes = 0;
  const visit = (current: unknown, depth: number): void => {
    nodes += 1;
    if (nodes > MAX_RESPONSE_JSON_NODES) {
      throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Response JSON is too large" });
    }
    if (depth > MAX_RESPONSE_JSON_DEPTH) {
      throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Response JSON is too deeply nested" });
    }
    if (Array.isArray(current)) {
      for (const entry of current) visit(entry, depth + 1);
      return;
    }
    if (current !== null && typeof current === "object") {
      for (const entry of Object.values(current)) visit(entry, depth + 1);
    }
  };
  visit(value, 0);
};

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const text = await readLimitedBody(response);
  if (text === "") return null;

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("json")) {
    let json: unknown;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Upstream returned invalid JSON" });
    }
    assertJsonBudget(json);
    return json;
  }

  try {
    const json = JSON.parse(text) as unknown;
    assertJsonBudget(json);
    return json;
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    return text;
  }
};

const performRequest = async (input: CustomWidgetHttpRequest): Promise<CustomWidgetHttpResponse> => {
  if (input.kind === "query" && input.method !== "GET") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Queries must use GET" });
  }
  if (input.kind === "action" && input.method === "GET") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Actions cannot use GET" });
  }
  if (input.body !== undefined && Buffer.byteLength(input.body, "utf8") > MAX_REQUEST_BODY_BYTES) {
    throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Request body exceeds the 10 KiB limit" });
  }
  assertSafeStaticHeaders(input.staticHeaders);

  const baseUrl = validateCustomWidgetUrl(input.baseUrl);
  let currentUrl = resolveSameOriginTarget(input.baseUrl, input.targetUrl);
  const initialOrigin = baseUrl.origin;
  const maxRedirects = input.kind === "query" ? MAX_QUERY_REDIRECTS : 0;

  for (let redirectCount = 0; ; redirectCount += 1) {
    const addresses = await resolveAndValidateHost(currentUrl.hostname, input.networkScope);
    const dispatcher = createPinnedAgent(addresses);
    const headers = new Headers({ Accept: "application/json" });
    for (const [name, value] of Object.entries(input.staticHeaders ?? {})) headers.set(name, value);
    if (input.body !== undefined) headers.set("Content-Type", "application/json");
    if (input.auth) {
      if (input.auth.type === "apiKeyHeader") {
        assertSafeStaticHeaders({ [input.auth.headerName ?? "X-API-Key"]: "" });
      }
      applyAuth(headers, currentUrl, input.auth.type, input.auth.secrets, input.auth.headerName);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(currentUrl, {
        method: input.method,
        headers,
        body: input.method === "GET" ? undefined : input.body,
        redirect: "manual",
        signal: controller.signal,
        dispatcher,
      });
    } catch (error) {
      await dispatcher.close();
      if (error instanceof TRPCError) throw error;
      logger.error("Custom widget request failed", {
        origin: currentUrl.origin,
        method: input.method,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: error instanceof Error ? error.message : "External request failed",
      });
    } finally {
      clearTimeout(timeout);
    }

    const isRedirect = [301, 302, 303, 307, 308].includes(response.status);
    if (!isRedirect) {
      try {
        const data = await parseResponseBody(response);
        return { ok: response.ok, status: response.status, statusText: response.statusText, data };
      } finally {
        await dispatcher.close();
      }
    }

    await response.body?.cancel();
    await dispatcher.close();
    if (redirectCount >= maxRedirects) {
      throw new TRPCError({ code: "BAD_GATEWAY", message: "Upstream redirect limit exceeded" });
    }
    const location = response.headers.get("location");
    if (!location) {
      throw new TRPCError({ code: "BAD_GATEWAY", message: "Upstream redirect is missing a location" });
    }
    const redirected = validateCustomWidgetUrl(new URL(location, currentUrl));
    if (redirected.origin !== initialOrigin) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Cross-origin redirects are not allowed" });
    }
    currentUrl = redirected;
  }
};

export const executeCustomWidgetRequest = async (input: CustomWidgetHttpRequest): Promise<CustomWidgetHttpResponse> => {
  const cacheKey = input.method === "GET" ? input.cacheKey : undefined;
  if (!cacheKey) return performRequest(input);

  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.response;
  if (cached) responseCache.delete(cacheKey);

  const inFlight = inFlightRequests.get(cacheKey);
  if (inFlight) return inFlight;

  const promise = performRequest(input)
    .then((response) => {
      if (response.ok && (input.cacheTtlSeconds ?? 0) > 0) {
        pruneResponseCache();
        responseCache.set(cacheKey, {
          expiresAt: Date.now() + (input.cacheTtlSeconds ?? 0) * 1000,
          response,
        });
      }
      return response;
    })
    .finally(() => inFlightRequests.delete(cacheKey));
  inFlightRequests.set(cacheKey, promise);
  return promise;
};
