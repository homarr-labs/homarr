import { Buffer } from "node:buffer";
import { fetch, Headers } from "undici";
import type { Response } from "undici";

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

async function performRequest(input: CustomWidgetHttpRequest): Promise<CustomWidgetHttpResponse> {
  assertRequest(input);
  const baseUrl = validateCustomWidgetUrl(input.baseUrl);
  let currentUrl = resolveSameOriginTarget(input.baseUrl, input.targetUrl);
  const maxRedirects = input.kind === "query" ? MAX_QUERY_REDIRECTS : 0;
  for (let redirects = 0; ; redirects += 1) {
    const dispatcher = createPinnedAgent(
      await resolveAndValidateHost(currentUrl.hostname, input.networkScope),
      REQUEST_TIMEOUT_MS,
    );
    const headers = buildHeaders(input, currentUrl);
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
      if (error instanceof CustomWidgetDomainError) throw error;
      input.logError?.({
        origin: currentUrl.origin,
        method: input.method,
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
    if (![301, 302, 303, 307, 308].includes(response.status)) {
      try {
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
    await response.body?.cancel();
    await dispatcher.close();
    if (redirects >= maxRedirects)
      throw new CustomWidgetDomainError({ code: "BAD_GATEWAY", message: "Upstream redirect limit exceeded" });
    const location = response.headers.get("location");
    if (!location)
      throw new CustomWidgetDomainError({ code: "BAD_GATEWAY", message: "Upstream redirect is missing a location" });
    const redirected = validateCustomWidgetUrl(new URL(location, currentUrl));
    if (redirected.origin !== baseUrl.origin)
      throw new CustomWidgetDomainError({ code: "FORBIDDEN", message: "Cross-origin redirects are not allowed" });
    currentUrl = redirected;
  }
}

function assertRequest(input: CustomWidgetHttpRequest): void {
  if (input.kind === "query" && input.method !== "GET")
    throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: "Queries must use GET" });
  if (input.kind === "action" && input.method === "GET")
    throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: "Actions cannot use GET" });
  if (input.body !== undefined && Buffer.byteLength(input.body, "utf8") > MAX_REQUEST_BODY_BYTES)
    throw new CustomWidgetDomainError({ code: "PAYLOAD_TOO_LARGE", message: "Request body exceeds the 10 KiB limit" });
  assertSafeStaticHeaders(input.staticHeaders);
}

function buildHeaders(input: CustomWidgetHttpRequest, url: URL): Headers {
  const headers = new Headers({ Accept: "application/json" });
  for (const [name, value] of Object.entries(input.staticHeaders ?? {})) headers.set(name, value);
  if (input.body !== undefined) headers.set("Content-Type", "application/json");
  if (input.auth) {
    if (input.auth.type === "apiKeyHeader") assertSafeStaticHeaders({ [input.auth.headerName ?? "X-API-Key"]: "" });
    applyAuth(headers, url, input.auth.type, input.auth.secrets, input.auth.headerName);
  }
  return headers;
}

export async function executeCustomWidgetRequest(input: CustomWidgetHttpRequest): Promise<CustomWidgetHttpResponse> {
  const key = input.method === "GET" ? input.cacheKey : undefined;
  if (!key) return performRequest(input);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.response;
  if (cached) cache.delete(key);
  const pending = inFlight.get(key);
  if (pending) return pending;
  const request = performRequest(input)
    .then((response) => {
      if (response.ok && (input.cacheTtlSeconds ?? 0) > 0) {
        pruneCache();
        cache.set(key, { expiresAt: Date.now() + (input.cacheTtlSeconds ?? 0) * 1000, response });
      }
      return response;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

function pruneCache(): void {
  for (const [key, entry] of cache) if (entry.expiresAt <= Date.now()) cache.delete(key);
  while (cache.size >= MAX_RESPONSE_CACHE_ENTRIES) {
    const key = cache.keys().next().value as string | undefined;
    if (!key) return;
    cache.delete(key);
  }
}
