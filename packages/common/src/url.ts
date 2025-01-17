import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";

export const removeTrailingSlash = (path: string) => {
  return path.at(-1) === "/" ? path.substring(0, path.length - 1) : path;
};

export const extractBaseUrlFromHeaders = (
  headers: ReadonlyHeaders,
  fallbackProtocol: "http" | "https" = "http",
): `${string}://${string}` => {
  let protocol = headers.get("x-forwarded-proto");

  // If the protocol is not set or an empty string
  if (!protocol) {
    protocol = fallbackProtocol;
  }

  // @see https://support.glitch.com/t/x-forwarded-proto-contains-multiple-protocols/17219
  if (protocol.includes(",")) {
    protocol = protocol.includes("https") ? "https" : "http";
  }

  const host = headers.get("x-forwarded-host") ?? headers.get("host");

  return `${protocol}://${host}`;
};
