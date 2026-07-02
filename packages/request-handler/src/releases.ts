import dayjs from "dayjs";

import { createWidgetOptionsChannel } from "@homarr/redis";

import { createCachedRequestHandler } from "./lib/cached-request-handler";
import type { ReleaseResponse, ReleasesRepositoryRequest } from "./release-providers";
import { getLatestMatchingReleaseAsync } from "./release-providers";

export const releasesRequestHandler = {
  handler: (itemOptions: ReleasesRepositoryRequest) =>
    createCachedRequestHandler<ReleaseResponse, ReleasesRepositoryRequest>({
      requestAsync: async (input) => await getLatestMatchingReleaseAsync(input),
      cacheDuration: dayjs.duration(5, "minutes"),
      queryKey: "repositoriesReleases",
      createRedisChannel(input, handlerOptions) {
        return createWidgetOptionsChannel<ReleaseResponse>("releases", handlerOptions.queryKey, input);
      },
    }).handler(itemOptions),
};
