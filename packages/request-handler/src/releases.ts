import { withHttpRequestSignalAsync } from "@homarr/core/infrastructure/http";

import type { ReleaseError, ReleaseErrorCode, ReleaseResponse, ReleasesRepositoryRequest } from "./release-providers";
import { getLatestMatchingReleaseAsync } from "./release-providers";
import { createRequestHandler } from "./lib/request-handler";

export type { ReleaseErrorCode };

const HOUR_MS = 60 * 60 * 1000;
const RELEASE_TTL_MS = 6 * HOUR_MS;
const ERROR_TTL_MS = HOUR_MS;
const STALE_RELEASE_TTL_MS = 24 * HOUR_MS - RELEASE_TTL_MS;
const transientErrorCodes: ReleaseErrorCode[] = ["rateLimited", "unexpected"];

export class TransientReleaseError extends Error {
  constructor(readonly releaseError: ReleaseError) {
    super(releaseError.message);
    this.name = TransientReleaseError.name;
  }
}

const getReleaseCacheTtlMs = (response: ReleaseResponse) => {
  if (response.success) return RELEASE_TTL_MS;
  return ERROR_TTL_MS;
};

export const releasesRequestHandler = createRequestHandler<ReleaseResponse, ReleasesRepositoryRequest>({
  async requestAsync(input, signal) {
    const response = await withHttpRequestSignalAsync(signal, () => getLatestMatchingReleaseAsync(input));
    if (!response.success && transientErrorCodes.includes(response.error.code)) {
      throw new TransientReleaseError(response.error);
    }
    return response;
  },
  requestTimeoutMs: 10_000,
  getCacheKey: ({ id: _id, ...input }) => JSON.stringify(input),
  cacheTtlMs: getReleaseCacheTtlMs,
  fallbackToStaleOnError: true,
  staleIfErrorTtlMs: STALE_RELEASE_TTL_MS,
});
