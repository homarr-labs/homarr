import { describe, expect, it } from "vitest";
import { ORPCError } from "@orpc/client";

import { createQueryRetry } from "./query-retry";

const createRpcError = (code: string) => new ORPCError(code);

describe("createQueryRetry", () => {
  it.each(["BAD_REQUEST", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "UNPROCESSABLE_CONTENT"])(
    "does not retry the permanent %s response",
    (code) => {
      expect(createQueryRetry(3)(0, createRpcError(code))).toBe(false);
    },
  );

  it("retries transient and network failures only up to the configured limit", () => {
    const retry = createQueryRetry(3);

    expect(retry(0, createRpcError("INTERNAL_SERVER_ERROR"))).toBe(true);
    expect(retry(2, new Error("connection reset"))).toBe(true);
    expect(retry(3, new Error("connection reset"))).toBe(false);
  });
});
