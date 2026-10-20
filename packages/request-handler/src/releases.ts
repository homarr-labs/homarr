import { withHttpRequestSignalAsync } from "@homarr/core/infrastructure/http";

import type { ReleaseResponse, ReleasesRepositoryRequest } from "./release-providers";
import { getLatestMatchingReleaseAsync } from "./release-providers";
import { createRequestHandler } from "./lib/request-handler";

export const releasesRequestHandler = createRequestHandler<ReleaseResponse, ReleasesRepositoryRequest>({
  async requestAsync(input, signal) {
    return await withHttpRequestSignalAsync(signal, () => getLatestMatchingReleaseAsync(input));
  },
  requestTimeoutMs: 10_000,
  cacheTtlMs: 5 * 60 * 1000,
});
