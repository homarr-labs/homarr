import { withHttpRequestSignalAsync } from "@homarr/core/infrastructure/http";

import type { ReleaseErrorCode, ReleaseResponse, ReleasesRepositoryRequest } from "./release-providers";
import { getLatestMatchingReleaseAsync } from "./release-providers";
import { createRequestHandler } from "./lib/request-handler";

const RESULT_TTL_MS = 60 * 60 * 1000;
const TRANSIENT_ERROR_TTL_MS = 5 * 60 * 1000;
const transientErrorCodes: ReleaseErrorCode[] = ["rateLimited", "unexpected"];

const getReleaseCacheTtlMs = (response: ReleaseResponse) => {
  if (!response.success && transientErrorCodes.includes(response.error.code)) return TRANSIENT_ERROR_TTL_MS;
  return RESULT_TTL_MS;
};

export const releasesRequestHandler = createRequestHandler<ReleaseResponse, ReleasesRepositoryRequest>({
  async requestAsync(input, signal) {
    return await withHttpRequestSignalAsync(signal, () => getLatestMatchingReleaseAsync(input));
  },
  requestTimeoutMs: 10_000,
  getCacheKey: ({ id: _id, ...input }) => JSON.stringify(input),
  cacheTtlMs: getReleaseCacheTtlMs,
});
