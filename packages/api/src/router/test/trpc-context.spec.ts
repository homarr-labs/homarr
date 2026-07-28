import { describe, expect, test } from "vitest";

import { ipAddressFromHeaders, rateLimitAddressFromHeaders } from "@homarr/common/server";

import { createTRPCContext } from "../../trpc";

describe("tRPC client address context", () => {
  test("does not use a forged forwarded address as the anonymous rate-limit identity", () => {
    const headers = new Headers({
      "user-agent": "vitest",
      "x-forwarded-for": " 198.51.100.10, 10.0.0.2 ",
      "x-real-ip": "203.0.113.20",
    });

    expect(ipAddressFromHeaders(headers)).toBe("198.51.100.10");
    expect(rateLimitAddressFromHeaders(headers)).toBe("203.0.113.20");
    expect(createTRPCContext({ headers, session: null }).clientAddress).toBe("203.0.113.20");
  });

  test("canonicalizes a trusted IPv6 address", () => {
    const headers = new Headers({
      "user-agent": "vitest",
      "x-real-ip": " 2001:0DB8:0000:0000:0000:0000:0000:0001 ",
    });

    expect(rateLimitAddressFromHeaders(headers)).toBe("2001:db8::1");
    expect(createTRPCContext({ headers, session: null }).clientAddress).toBe("2001:db8::1");
  });

  test("uses a shared anonymous bucket without a valid trusted address", () => {
    const headers = new Headers({
      "user-agent": "vitest",
      "x-forwarded-for": "198.51.100.10",
      "x-real-ip": "not-an-ip",
    });

    expect(rateLimitAddressFromHeaders(headers)).toBeNull();
    expect(createTRPCContext({ headers, session: null }).clientAddress).toBeUndefined();
  });

  test("retains the general client-address helper for existing API-key behavior", () => {
    const headers = new Headers({ "user-agent": "vitest", "x-real-ip": " 203.0.113.20 " });

    expect(ipAddressFromHeaders(headers)).toBe("203.0.113.20");
  });
});
