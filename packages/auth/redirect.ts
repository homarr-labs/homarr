import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";

/**
 * The redirect_uri is constructed to work behind a reverse proxy. It is constructed from the headers x-forwarded-proto and x-forwarded-host.
 * @param headers
 * @param pathname
 * @returns
 */
export const createRedirectUri = (
  headers: ReadonlyHeaders | null,
  pathname: string,
) => {
  if (!headers) {
    return pathname;
  }

  let protocol = headers.get("x-forwarded-proto") ?? "http";

  // @see https://support.glitch.com/t/x-forwarded-proto-contains-multiple-protocols/17219
  if (protocol.includes(",")) {
    protocol = protocol.includes("https") ? "https" : "http";
  }

  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;

  const host = headers.get("x-forwarded-host") ?? headers.get("host");

  return `${protocol}://${host}${path}`;
};
