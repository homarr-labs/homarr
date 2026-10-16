import UAParser from "ua-parser-js";

import type { Modify } from "./types";

export const userAgent = (headers: Headers) => {
  return new UAParser(headers.get("user-agent") ?? "").getResult() as Omit<UAParser.IResult, "device"> & {
    device: Modify<UAParser.IDevice, { type: DeviceType }>;
  };
};

export type DeviceType = "console" | "mobile" | "tablet" | "smarttv" | "wearable" | "embedded" | undefined;

export const ipAddressFromHeaders = (headers: Headers): string | null => {
  return headers.get("x-forwarded-for");
};
