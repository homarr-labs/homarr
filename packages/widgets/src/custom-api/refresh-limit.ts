import { isRecord } from "@homarr/common";

export function getCustomWidgetRetryAfterMs(error: unknown): number | null {
  if (!isRecord(error) || !isRecord(error.data) || error.data.code !== "TOO_MANY_REQUESTS") return null;
  const details = error.data.error;
  if (!isRecord(details) || typeof details.retryAfterMs !== "number" || !Number.isFinite(details.retryAfterMs)) {
    return 60_000;
  }
  return Math.max(1_000, details.retryAfterMs);
}
