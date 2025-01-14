import { userAgent as userAgentNextServer } from "next/server";

import type { Modify } from "./types";

export const userAgent = (headers: Headers) => {
  return userAgentNextServer({ headers }) as Omit<ReturnType<typeof userAgentNextServer>, "device"> & {
    device: Modify<ReturnType<typeof userAgentNextServer>["device"], { type: DeviceType }>;
  };
};

export type DeviceType = "console" | "mobile" | "tablet" | "smarttv" | "wearable" | "embedded" | undefined;
