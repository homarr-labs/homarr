import { isIP } from "node:net";

import { userAgent as userAgentNextServer } from "next/server";

import type { Modify } from "./types";

export const userAgent = (headers: Headers) => {
  return userAgentNextServer({ headers }) as Omit<ReturnType<typeof userAgentNextServer>, "device"> & {
    device: Modify<ReturnType<typeof userAgentNextServer>["device"], { type: DeviceType }>;
  };
};

export type DeviceType = "console" | "mobile" | "tablet" | "smarttv" | "wearable" | "embedded" | undefined;

export const ipAddressFromHeaders = (headers: Headers): string | null => {
  const forwardedAddress = headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  if (forwardedAddress) return forwardedAddress;

  const realAddress = headers.get("x-real-ip")?.trim();
  return realAddress || null;
};

const canonicalizeIpAddress = (value: string | null): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const unwrapped = trimmed.startsWith("[") && trimmed.endsWith("]") ? trimmed.slice(1, -1) : trimmed;
  const family = isIP(unwrapped);
  if (family === 4) return unwrapped;
  if (family !== 6) return null;

  const hostname = new URL(`http://[${unwrapped}]/`).hostname;
  return hostname.slice(1, -1);
};

/**
 * Returns the canonical address supplied by Homarr's trusted ingress for
 * abuse-control buckets. Do not fall back to X-Forwarded-For here: clients can
 * prepend arbitrary values to that chain. Deployments without a trusted
 * X-Real-IP header deliberately share the anonymous fallback bucket.
 */
export const rateLimitAddressFromHeaders = (headers: Headers): string | null =>
  canonicalizeIpAddress(headers.get("x-real-ip"));
