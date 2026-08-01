import { readBoundedJsonResponseAsync as readBoundedJsonResponse } from "@homarr/common/server";

export const MAX_CUSTOM_API_RESPONSE_BYTES = 2 * 1024 * 1024;

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
