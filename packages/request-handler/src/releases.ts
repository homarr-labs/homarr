import { withHttpRequestSignalAsync } from "@homarr/core/infrastructure/http";

import type { ReleaseError, ReleaseResponse, ReleasesRepositoryRequest } from "./release-providers";
import { getLatestMatchingReleaseAsync } from "./release-providers";
import { createRequestHandler } from "./lib/request-handler";

const transientErrorCodes: ReleaseError["code"][] = ["rateLimited", "unexpected"];

export const releasesRequestHandler = createRequestHandler<ReleaseResponse, ReleasesRepositoryRequest>({
  async requestAsync(input, signal) {
    return await withHttpRequestSignalAsync(signal, () => getLatestMatchingReleaseAsync(input));
  },
  requestTimeoutMs: 10_000,
  getCacheKey: ({ id: _id, ...input }) => JSON.stringify(input),
  cacheTtlMs: (response) =>
    !response.success && transientErrorCodes.includes(response.error.code) ? 5 * 60 * 1000 : 60 * 60 * 1000,
});
