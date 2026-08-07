import { TRPCClientError } from "@trpc/client";
import type { DefaultErrorData } from "@trpc/server/unstable-core-do-not-import";

/**
 * Detects the UNAUTHORIZED error the tennis router raises when
 * LIVE_TENNIS_API_KEY is missing or was rejected by the Live Tennis API.
 *
 * The component passes this as the query's `throwOnError` so only this failure
 * is escalated to the widget error boundary, which then renders the dedicated
 * API key state declared in the widget definition (see ./index.ts). Every other
 * failure keeps falling back to the inline empty state.
 */
export const isTennisApiKeyError = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return false;

  // `data` is undefined for transport level failures, so it can not be narrowed with `in`.
  const errorData = error.data as DefaultErrorData | undefined;

  return errorData?.code === "UNAUTHORIZED";
};

/** Matches the query client's default retry count, which this only narrows. */
const defaultRetryCount = 3;

/**
 * Retry policy for the tennis query.
 *
 * The query client retries three times by default. A missing or rejected API
 * key is not transient, so retrying only delays the configuration message by
 * three backoff rounds while the board shows nothing. Every other failure keeps
 * the default behaviour.
 */
export const shouldRetryTennisQuery = (failureCount: number, error: unknown) =>
  !isTennisApiKeyError(error) && failureCount < defaultRetryCount;
