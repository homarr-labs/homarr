import { userAgent as userAgentNextServer } from "next/server";

import type { Modify } from "./types";

export const userAgent = (headers: Headers) => {
  return userAgentNextServer({ headers }) as Omit<ReturnType<typeof userAgentNextServer>, "device"> & {
    device: Modify<ReturnType<typeof userAgentNextServer>["device"], { type: DeviceType }>;
  };
};

export type DeviceType = "console" | "mobile" | "tablet" | "smarttv" | "wearable" | "embedded" | undefined;

/**
 * The client-reported forwarding chain, verbatim. Behind an additional reverse
 * proxy this still contains the originating client, so it is the useful value
 * for audit logging and diagnostics. A caller can put anything in front of the
 * chain, so never key a limit or quota on it.
 */
export const ipAddressFromHeaders = (headers: Headers): string | null => {
  return headers.get("x-forwarded-for");
};

/**
 * The last hop of the forwarding chain. The bundled nginx proxy appends its own
 * transport peer, so this is the only entry a caller cannot choose, which makes
 * it the right identity for rate limits and concurrency budgets.
 *
 * Behind an additional reverse proxy the last hop is that proxy, so every client
 * behind it shares one identity. Distinguishing them needs an explicit
 * trusted-proxy configuration, which Homarr does not have yet.
 */
export const trustedIpAddressFromHeaders = (headers: Headers): string | null => {
  const forwardedFor = headers.get("x-forwarded-for");
  if (!forwardedFor) return null;

  return forwardedFor.split(",").at(-1)?.trim() || null;
};
