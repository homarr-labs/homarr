import { Buffer } from "node:buffer";
import { STATUS_CODES } from "node:http";
import { Headers, Response } from "undici";

import type { CustomJsxNetworkScope, CustomWidgetMethod } from "../core";
import { applyAuth } from "./auth";
import { CustomWidgetDomainError } from "./errors";
import {
  assertSafeStaticHeaders,
  createPinnedAgent,
  resolveAndValidateHost,
  resolveSameOriginTarget,
  validateCustomWidgetUrl,
} from "./network-policy";
import { parseResponseBody } from "./response";

export {
  assertSafeStaticHeaders,
  classifyAddress,
  resolveAndValidateHost,
  resolveSameOriginTarget,
  validateCustomWidgetUrl,
} from "./network-policy";
export {
  assertJsonBudget,
  MAX_RESPONSE_BODY_BYTES,
  MAX_RESPONSE_JSON_DEPTH,
  MAX_RESPONSE_JSON_NODES,
} from "./response";

export const MAX_REQUEST_BODY_BYTES = 10 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_QUERY_REDIRECTS = 3;
const MAX_RESPONSE_CACHE_ENTRIES = 1_000;
export const MAX_REQUEST_DURATION_MS = 45_000;

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
  logError?: (event: { origin: string; method: CustomWidgetMethod; errorName: string }) => void;
}

export interface CustomWidgetHttpResponse {
  ok: boolean;
  status: number;
  statusText: string;
  data: unknown;
}
const cache = new Map<string, { expiresAt: number; response: CustomWidgetHttpResponse }>();
const inFlight = new Map<string, Promise<CustomWidgetHttpResponse>>();
let cacheEpoch = 0;

async function performRequest(input: CustomWidgetHttpRequest): Promise<CustomWidgetHttpResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MAX_REQUEST_DURATION_MS);
  try {
    return await performRequestWithinDeadline(input, controller.signal);
  } catch (error) {
    if (error instanceof CustomWidgetDomainError) throw error;
    if (controller.signal.aborted) {
      throw new CustomWidgetDomainError({
        code: "BAD_GATEWAY",
        message: "External request exceeded the total time limit",
        cause: error,
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function performRequestWithinDeadline(
  input: CustomWidgetHttpRequest,
  deadlineSignal: AbortSignal,
): Promise<CustomWidgetHttpResponse> {
  assertRequest(input);
  const baseUrl = validateCustomWidgetUrl(input.baseUrl);
  let currentUrl = resolveSameOriginTarget(input.baseUrl, input.targetUrl);
  let currentMethod = input.method;
  let currentBody = input.body;
  const maxRedirects = input.kind === "query" ? MAX_QUERY_REDIRECTS : 0;
  for (let redirects = 0; ; redirects += 1) {
    const dispatcher = createPinnedAgent(
      await resolveAndValidateHost(currentUrl.hostname, input.networkScope),
      REQUEST_TIMEOUT_MS,
    );
    const headers = buildHeaders(input, currentUrl, currentBody);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let responseData: Awaited<ReturnType<typeof dispatcher.request>>;
    try {
      responseData = await dispatcher.request({
        origin: currentUrl.origin,
        path: `${currentUrl.pathname}${currentUrl.search}`,
        method: currentMethod,
        headers,
        body: currentBody,
        signal: AbortSignal.any([deadlineSignal, controller.signal]),
      });
    } catch (error) {
      await dispatcher.close();
      if (error instanceof CustomWidgetDomainError) throw error;
      input.logError?.({
        origin: currentUrl.origin,
        method: currentMethod,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      throw new CustomWidgetDomainError({
        code: "BAD_GATEWAY",
        message: error instanceof Error ? error.message : "External request failed",
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (![301, 302, 303, 307, 308].includes(responseData.statusCode)) {
      try {
        const body = await responseData.body.arrayBuffer();
        const response = new Response(body.byteLength > 0 ? body : null, {
          status: responseData.statusCode,
          statusText: STATUS_CODES[responseData.statusCode] ?? "",
          headers: normalizeResponseHeaders(responseData.headers),
        });
        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          data: await parseResponseBody(response),
        };
      } finally {
        await dispatcher.close();
      }
    }
    try {
      await responseData.body.dump();
    } finally {
      await dispatcher.close();
    }
    if (redirects >= maxRedirects)
      throw new CustomWidgetDomainError({ code: "BAD_GATEWAY", message: "Upstream redirect limit exceeded" });
    const location = normalizeResponseHeaders(responseData.headers).get("location");
    if (!location)
      throw new CustomWidgetDomainError({ code: "BAD_GATEWAY", message: "Upstream redirect is missing a location" });
    const redirected = validateCustomWidgetUrl(new URL(location, currentUrl));
    if (redirected.origin !== baseUrl.origin)
      throw new CustomWidgetDomainError({ code: "FORBIDDEN", message: "Cross-origin redirects are not allowed" });
    if (responseData.statusCode === 303 || ([301, 302].includes(responseData.statusCode) && currentMethod === "POST")) {
      currentMethod = "GET";
      currentBody = undefined;
    }
    currentUrl = redirected;
  }
}

function normalizeResponseHeaders(values: Record<string, string | string[] | undefined>) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(values)) {
    if (Array.isArray(value)) value.forEach((entry) => headers.append(name, entry));
    else if (value !== undefined) headers.set(name, value);
  }
  return headers;
}

function assertRequest(input: CustomWidgetHttpRequest): void {
  if (input.body !== undefined && Buffer.byteLength(input.body, "utf8") > MAX_REQUEST_BODY_BYTES)
    throw new CustomWidgetDomainError({ code: "PAYLOAD_TOO_LARGE", message: "Request body exceeds the 10 KiB limit" });
  assertSafeStaticHeaders(input.staticHeaders);
}

function buildHeaders(input: CustomWidgetHttpRequest, url: URL, body: string | undefined): Headers {
  const headers = new Headers({ Accept: "application/json" });
  for (const [name, value] of Object.entries(input.staticHeaders ?? {})) headers.set(name, value);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  else headers.delete("Content-Type");
  if (input.auth) {
    if (input.auth.type === "apiKeyHeader") assertSafeStaticHeaders({ [input.auth.headerName ?? "X-API-Key"]: "" });
    applyAuth(headers, url, input.auth.type, input.auth.secrets, input.auth.headerName);
  }
  return headers;
}

export async function executeCustomWidgetRequest(input: CustomWidgetHttpRequest): Promise<CustomWidgetHttpResponse> {
  const key = input.kind === "query" ? input.cacheKey : undefined;
  if (!key) return performRequest(input);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.response;
  if (cached) cache.delete(key);
  const pending = inFlight.get(key);
  if (pending) return pending;
  const requestEpoch = cacheEpoch;
  let request: Promise<CustomWidgetHttpResponse>;
  request = performRequest(input)
    .then((response) => {
      if (response.ok && (input.cacheTtlSeconds ?? 0) > 0 && requestEpoch === cacheEpoch) {
        pruneCache();
        cache.set(key, { expiresAt: Date.now() + (input.cacheTtlSeconds ?? 0) * 1000, response });
      }
      return response;
    })
    .finally(() => {
      if (inFlight.get(key) === request) inFlight.delete(key);
    });
  inFlight.set(key, request);
  return request;
}

export function invalidateCustomWidgetResponseCache(prefixes: readonly string[]): void {
  if (prefixes.length === 0) return;
  cacheEpoch += 1;
  for (const key of cache.keys()) if (prefixes.some((prefix) => key.startsWith(prefix))) cache.delete(key);
  for (const key of inFlight.keys()) if (prefixes.some((prefix) => key.startsWith(prefix))) inFlight.delete(key);
}

function pruneCache(): void {
  for (const [key, entry] of cache) if (entry.expiresAt <= Date.now()) cache.delete(key);
  while (cache.size >= MAX_RESPONSE_CACHE_ENTRIES) {
    const key = cache.keys().next().value as string | undefined;
    if (!key) return;
    cache.delete(key);
  }
}
