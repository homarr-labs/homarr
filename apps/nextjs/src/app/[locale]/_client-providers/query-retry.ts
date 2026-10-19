import { ORPCError } from "@orpc/client";

const nonRetryableRpcCodes = new Set([
  "PARSE_ERROR",
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "METHOD_NOT_SUPPORTED",
  "CONFLICT",
  "PRECONDITION_FAILED",
  "PAYLOAD_TOO_LARGE",
  "UNPROCESSABLE_CONTENT",
]);

export const createQueryRetry = (maxRetries: number) => (failureCount: number, error: unknown) => {
  if (failureCount >= maxRetries) return false;
  if (error instanceof ORPCError && error.code && nonRetryableRpcCodes.has(error.code)) return false;
  return true;
};
