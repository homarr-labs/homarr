import type { CustomWidgetHttpRequest, CustomWidgetHttpResponse } from "./request-types";
import { CustomWidgetDomainError } from "./errors";
import { assertCustomWidgetPathScope, resolveSameOriginTarget } from "./network-policy";

type HeaderSetter = Pick<Headers, "set">;

export const AUTH_HANDLERS: Record<
  string,
  (headers: HeaderSetter, url: URL, apiKey: string, headerName?: string) => void
> = {
  bearer: (headers, _url, apiKey) => {
    headers.set("Authorization", `Bearer ${apiKey}`);
  },
  apiKeyHeader: (headers, _url, apiKey, headerName) => {
    headers.set(headerName ?? "X-API-Key", apiKey);
  },
  apiKeyQuery: (_headers, url, apiKey, headerName) => {
    url.searchParams.set(headerName ?? "api_key", apiKey);
  },
};

export function buildSecretMap(secrets: Array<{ kind: string; value: string }>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const secret of secrets) {
    map[secret.kind] = secret.value;
  }
  return map;
}

export function applyAuth(
  headers: HeaderSetter,
  url: URL,
  authType: string,
  secrets: Array<{ kind: string; value: string }>,
  headerName?: string | null,
): void {
  const secretMap = buildSecretMap(secrets);

  if (authType === "basic" && secretMap.username && secretMap.password) {
    const credentials = Buffer.from(`${secretMap.username}:${secretMap.password}`).toString("base64");
    headers.set("Authorization", `Basic ${credentials}`);
    return;
  }

  const handler = AUTH_HANDLERS[authType];
  if (handler && secretMap.apiKey) {
    handler(headers, url, secretMap.apiKey, headerName ?? undefined);
  }
}

export function applyBodyAuth(body: string | undefined, auth: CustomWidgetHttpRequest["auth"]): string | undefined {
  if (!auth?.body) return body;
  if (!body) throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: "Authenticated JSON body is required" });
  let value: unknown;
  try {
    value = JSON.parse(body) as unknown;
  } catch {
    throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: "Authenticated JSON body is invalid" });
  }
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: "Authenticated JSON body must be an object" });
  const record = value as Record<string, unknown>;
  if (auth.body.type === "jsonField") {
    record[auth.body.name] = auth.body.value;
  } else {
    const current = record[auth.body.name];
    if (current !== undefined && !Array.isArray(current))
      throw new CustomWidgetDomainError({
        code: "BAD_REQUEST",
        message: "Authenticated JSON parameter must be an array",
      });
    record[auth.body.name] = [auth.body.value, ...(current ?? [])];
  }
  return JSON.stringify(record);
}

export async function performAuthenticatedRequest(
  input: CustomWidgetHttpRequest,
  signal: AbortSignal,
  perform: (input: CustomWidgetHttpRequest, signal: AbortSignal) => Promise<CustomWidgetHttpResponse>,
): Promise<CustomWidgetHttpResponse> {
  const target = resolveSameOriginTarget(input.baseUrl, input.targetUrl);
  if (input.pathPrefix !== undefined) assertCustomWidgetPathScope(target, input.pathPrefix);
  if (input.resolveConnectionAsync) {
    const connection = await withinDeadline(input.resolveConnectionAsync, signal);
    resolveSameOriginTarget(connection.baseUrl, target);
    input = { ...input, ...connection, targetUrl: target };
  }
  return perform(input, signal);
}

async function withinDeadline<T>(callback: () => Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  let abort: (() => void) | undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
  });
  try {
    return await Promise.race([callback(), aborted]);
  } finally {
    if (abort) signal.removeEventListener("abort", abort);
  }
}
