import { describe, expect, it } from "vitest";
import { TRPCClientError } from "@trpc/client";

import { createQueryRetry } from "./query-retry";

const createTrpcError = (code: string) => {
  const error = Object.assign(new Error(code), { data: { code } });
  Object.setPrototypeOf(error, TRPCClientError.prototype);
  return error;
};

describe("createQueryRetry", () => {
  it.each(["BAD_REQUEST", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "UNPROCESSABLE_CONTENT"])(
    "does not retry the permanent %s response",
    (code) => {
      expect(createQueryRetry(3)(0, createTrpcError(code))).toBe(false);
    },
  );

  it("retries transient and network failures only up to the configured limit", () => {
    const retry = createQueryRetry(3);

    expect(retry(0, createTrpcError("INTERNAL_SERVER_ERROR"))).toBe(true);
    expect(retry(2, new Error("connection reset"))).toBe(true);
    expect(retry(3, new Error("connection reset"))).toBe(false);
  });
});
