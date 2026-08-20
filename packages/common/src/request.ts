import { userAgent as userAgentNextServer } from "next/server";

import type { Modify } from "./types";

export const userAgent = (headers: Headers) => {
  return userAgentNextServer({ headers }) as Omit<ReturnType<typeof userAgentNextServer>, "device"> & {
    device: Modify<ReturnType<typeof userAgentNextServer>["device"], { type: DeviceType }>;
  };
};

export type DeviceType = "console" | "mobile" | "tablet" | "smarttv" | "wearable" | "embedded" | undefined;

export const ipAddressFromHeaders = (headers: Headers): string | null => {
  const forwardedFor = headers.get("x-forwarded-for");
  if (!forwardedFor) return null;

  // The bundled nginx proxy appends the transport peer to this chain. Using
  // the last hop prevents a caller-controlled prefix from creating arbitrary
  // rate-limit identities.
  return forwardedFor.split(",").at(-1)?.trim() || null;
};
