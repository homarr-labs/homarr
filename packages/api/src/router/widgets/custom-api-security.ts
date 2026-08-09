import { readBoundedJsonResponseAsync as readBoundedJsonResponse } from "@homarr/common/server";

export const MAX_CUSTOM_API_RESPONSE_BYTES = 2 * 1024 * 1024;
export const CUSTOM_API_FETCH_TIMEOUT_MS = 10_000;

export function validateCustomApiUrl(urlString: string): URL {
  if (urlString.length > 2_048) throw new Error("Custom API URL is too long");

  const url = new URL(urlString);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Custom API URL must use HTTP or HTTPS");
  }
  if (url.username || url.password) throw new Error("Custom API URL must not contain credentials");
  return url;
}

export async function readBoundedJsonResponseAsync(
  response: Response,
  maxBytes = MAX_CUSTOM_API_RESPONSE_BYTES,
): Promise<unknown> {
  return await readBoundedJsonResponse(response, maxBytes, "Custom API response");
}

export async function consumeBoundedResponseAsync(
  response: Response,
  maxBytes = MAX_CUSTOM_API_RESPONSE_BYTES,
): Promise<void> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body?.cancel();
    throw new Error(`Custom API response exceeds ${maxBytes} bytes`);
  }

  if (!response.body) return;
  const reader = response.body.getReader();
  let byteLength = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    byteLength += value?.byteLength ?? 0;
    if (byteLength > maxBytes) {
      await reader.cancel();
      throw new Error(`Custom API response exceeds ${maxBytes} bytes`);
    }
  }
}

export async function withCustomApiResponseAsync<TResult>(
  url: URL,
  init: Omit<RequestInit, "redirect" | "signal">,
  consumeResponseAsync: (response: Response) => Promise<TResult>,
  timeoutMs = CUSTOM_API_FETCH_TIMEOUT_MS,
): Promise<TResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      ...init,
      redirect: "error",
      signal: controller.signal,
    });
    return await consumeResponseAsync(response);
  } finally {
    clearTimeout(timeout);
  }
}
