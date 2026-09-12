import type { CustomWidgetHttpRequest, CustomWidgetHttpResponse } from "./request-types";
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

export async function performAuthenticatedRequest(
  input: CustomWidgetHttpRequest,
  signal: AbortSignal,
  perform: (input: CustomWidgetHttpRequest, signal: AbortSignal) => Promise<CustomWidgetHttpResponse>,
): Promise<CustomWidgetHttpResponse> {
  const target = resolveSameOriginTarget(input.baseUrl, input.targetUrl);
  if (input.pathPrefix !== undefined) assertCustomWidgetPathScope(target, input.pathPrefix);
  if (input.resolveConnectionAsync) {
    const connection = await withinDeadline(input.resolveConnectionAsync, signal);
    const base = new URL(connection.baseUrl);
    target.protocol = base.protocol;
    target.host = base.host;
    input = { ...input, ...connection, targetUrl: target };
  }
  let response = await perform(input, signal);
  if (!isExpired(input, response)) return response;
  response.ok = false;
  response.status = 401;
  response.statusText = "Integration session expired";
  if (!input.auth?.refreshAsync) return response;
  const auth = await withinDeadline(input.auth.refreshAsync, signal);
  // An action may have reached the service. Refresh for its next explicit invocation.
  if (input.kind === "action") return response;
  input = { ...input, auth };
  response = await perform(input, signal);
  if (isExpired(input, response)) {
    response.ok = false;
    response.status = 401;
    response.statusText = "Integration session expired";
  }
  return response;
}

function isExpired(input: CustomWidgetHttpRequest, response: CustomWidgetHttpResponse) {
  return input.auth && (response.status === 401 || input.auth.isExpired?.(response));
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
