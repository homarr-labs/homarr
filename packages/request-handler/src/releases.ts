import type { ReleaseResponse, ReleasesRepositoryRequest } from "./release-providers";
import { getLatestMatchingReleaseAsync } from "./release-providers";
import { createRequestHandler } from "./lib/request-handler";

export const releasesRequestHandler = createRequestHandler<ReleaseResponse, ReleasesRepositoryRequest>({
  async requestAsync(input) {
    return await getLatestMatchingReleaseAsync(input);
  },
  cacheTtlMs: 5 * 60 * 1000,
});
