import type { StateGenerations } from "@homarr/redis/state";

import { requireIntegrationProducer } from "./errors";
import type { IntegrationProducer } from "./errors";
import type { IntegrationBindingLifetime } from "./lifetime";

export interface IntegrationCacheBindingResources {
  readonly generations: IntegrationProducer<Pick<StateGenerations, "invalidateIntegrationCacheAsync">>;
  readonly mediaRequestList: IntegrationProducer<{ invalidateCache(): void }>;
  readonly mediaRequestStats: IntegrationProducer<{
    invalidateCacheAsync(integrationIds: readonly string[]): Promise<void>;
  }>;
}

export const createIntegrationCacheBindings = (
  resources: IntegrationCacheBindingResources,
  lifetime: IntegrationBindingLifetime,
) => ({
  cacheGenerations: {
    invalidateIntegrationCacheAsync: (integrationId: string) =>
      lifetime.trackAsync(() =>
        requireIntegrationProducer(resources.generations, "cache-generations").invalidateIntegrationCacheAsync(
          integrationId,
        ),
      ),
  },
  mediaRequestList: {
    invalidateCache() {
      lifetime.assertOpen();
      requireIntegrationProducer(resources.mediaRequestList, "media-request-list-cache").invalidateCache();
    },
  },
  mediaRequestStats: {
    invalidateCacheAsync: (integrationIds: readonly string[]) =>
      lifetime.trackAsync(() =>
        requireIntegrationProducer(resources.mediaRequestStats, "media-request-stats-cache").invalidateCacheAsync(
          integrationIds,
        ),
      ),
  },
  invalidateIntegrationCacheAsync: (integrationId: string) =>
    lifetime.trackAsync(async () => {
      const generations = requireIntegrationProducer(resources.generations, "cache-generations");
      const list = requireIntegrationProducer(resources.mediaRequestList, "media-request-list-cache");
      const stats = requireIntegrationProducer(resources.mediaRequestStats, "media-request-stats-cache");
      const results = await Promise.allSettled([
        Promise.resolve().then(() => generations.invalidateIntegrationCacheAsync(integrationId)),
        Promise.resolve().then(() => list.invalidateCache()),
        Promise.resolve().then(() => stats.invalidateCacheAsync([integrationId])),
      ]);
      const failures = results.flatMap((result) => (result.status === "rejected" ? [result.reason] : []));
      if (failures.length)
        throw new AggregateError(failures, "Integration cache invalidation did not settle successfully");
    }),
});
