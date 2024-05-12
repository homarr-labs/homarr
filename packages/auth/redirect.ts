import { headers } from "next/headers";

/**
 * The redirect_uri is constructed to work behind a reverse proxy. It is constructed from the headers x-forwarded-proto and x-forwarded-host.
 * @param headers
 * @param pathname
 * @returns
 */
export const createRedirectUri = (pathname: string) => {
  const currentHeaders = headers();
  let protocol = currentHeaders.get("x-forwarded-proto") ?? "http";

  // @see https://support.glitch.com/t/x-forwarded-proto-contains-multiple-protocols/17219
  if (protocol.includes(",")) {
    protocol = protocol.includes("https") ? "https" : "http";
  }

  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;

  const host =
    currentHeaders.get("x-forwarded-host") ?? currentHeaders.get("host");

  return `${protocol}://${host}${path}`;
};
