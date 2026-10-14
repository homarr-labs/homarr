import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import {
  createGetSetChannel,
  createLockChannel,
  getIntegrationCacheGenerationAsync,
  getWidgetCacheGenerationAsync,
} from "@homarr/redis";

import { createSharedCacheRuntime } from "./shared-cache-runtime";

export { hashSharedCacheInput, hashIntegrationCacheOptions } from "./shared-cache-runtime";

const logger = createLogger({ module: "sharedRequestCache" });
const runtime = createSharedCacheRuntime({
  channels: {
    createGetSetChannel: <TData>(name: string) => createGetSetChannel<TData>(name, { useBoundedCacheClient: true }),
    createLockChannel: (name: string) => ({
      ...createLockChannel(name, { useBoundedCacheClient: true }),
      setManyIfOwnedAsync: async () => {
        throw new Error("Legacy cache adapter does not support atomic multi-write");
      },
    }),
  },
  getIntegrationCacheGenerationAsync: async (id) => ({ ...(await getIntegrationCacheGenerationAsync(id)), fence: [] }),
  getWidgetCacheGenerationAsync: async (namespace) => ({
    ...(await getWidgetCacheGenerationAsync(namespace)),
    fence: [],
  }),
  diagnostics: {
    warn: (message, metadata, error) => logger.warn(new ErrorWithMetadata(message, metadata, { cause: error })),
  },
});

export const { createWidgetSharedCacheAsync, createIntegrationSharedCacheAsync } = runtime;
