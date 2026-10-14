import type { IntegrationKind } from "@homarr/definitions";
import { withIntegrationRuntimeAsync } from "@homarr/integrations/runtime";
import type { StatsValue } from "@homarr/integrations/stats";

import { createStatisticsSnapshotService } from "../stats-runtime";
import type { StatisticsInput } from "../stats-runtime";
import type { OwnedRequestFactories } from "./factories";
import type { WidgetBindingResources } from "./resources";

export interface WidgetStatisticsProviders {
  readonly fetchStatsAsync: typeof import("@homarr/integrations/stats").fetchStatsAsync;
  readonly getStatsMetrics: typeof import("@homarr/integrations/stats").getStatsMetrics;
  readonly demoMode: boolean;
}

const demoValues: Partial<Record<IntegrationKind, Record<string, StatsValue>>> = {
  sonarr: {
    shows: 74,
    monitored: 68,
    downloaded: 3128,
    storage: 1.82 * 1024 ** 4,
    missing: 6,
    queued: 3,
    episodes: 3986,
  },
  radarr: { movies: 386, monitored: 342, downloaded: 371, storage: 3.74 * 1024 ** 4, missing: 15, queued: 4 },
  qBittorrent: { download: 38 * 1024 ** 2, upload: 9.3 * 1024 ** 2, paused: false },
  proxmox: { nodes: 3, vms: 12, lxcs: 8 },
  piHole: {
    dnsQueriesToday: 119872,
    adsBlockedToday: 19641,
    adsBlockedTodayPercentage: 16.38,
    domainsBeingBlocked: 1186431,
  },
  immich: { userCount: 4, photoCount: 48392, videoCount: 2438, totalLibraryUsageInBytes: 684.5 * 1024 ** 3 },
  karakeep: { bookmarks: 1247, favorites: 86, archived: 212, highlights: 418, lists: 24, tags: 93 },
  mealie: { recipes: 318, users: 14, categories: 28, tags: 76 },
  spoolman: { spools: 24, remainingWeight: 8120 },
};

export const createWidgetStatisticsRuntime = (
  factories: OwnedRequestFactories,
  resources: WidgetBindingResources,
  providers: WidgetStatisticsProviders,
) => {
  resources.signal.throwIfAborted();
  const lifetime = new AbortController();
  const lifetimeSignal = AbortSignal.any([resources.signal, lifetime.signal]);
  const pending = new Set<Promise<unknown>>();
  const physical = new Set<string>();
  const getDemoStatsValues = (integration: Pick<StatisticsInput, "kind" | "url">) => {
    if (!providers.demoMode || integration.url !== "https://demo.homarr.dev") return undefined;
    return demoValues[integration.kind];
  };
  const service = createStatisticsSnapshotService({
    channels: resources.channels,
    generations: resources.generations,
    diagnostics: resources.diagnostics,
    getIdentity: (integration) => factories.getIntegrationCacheIdentity({ integration, options: { version: 1 } }),
    getStatsMetrics: providers.getStatsMetrics,
    getDemoStatsValues,
    fetchStatsAsync: (integration, signal) => {
      const requestSignal = AbortSignal.any([signal, lifetimeSignal]);
      requestSignal.throwIfAborted();
      if (physical.has(integration.id)) throw new Error("Previous statistics request is still running");
      if (physical.size >= 128) throw new Error("Legacy statistics request limit reached");
      physical.add(integration.id);
      const producers = new Set<Promise<void>>();
      let producerOpen = true;
      const work = (async () => {
        requestSignal.throwIfAborted();
        const deadlineAt = Date.now() + 60_000;
        const providerResources = await resources.providers.createResourcesAsync(
          integration,
          requestSignal,
          deadlineAt,
        );
        requestSignal.throwIfAborted();
        const context = {
          ...providerResources.context,
          signal: AbortSignal.any([requestSignal, providerResources.context.signal]),
          deadlineAt: Math.min(deadlineAt, providerResources.context.deadlineAt),
        };
        return await withIntegrationRuntimeAsync({ ...providerResources, context }, () => {
          context.signal.throwIfAborted();
          if (!producerOpen) throw new Error("Statistics provider execution is settled");
          const native = providers.fetchStatsAsync(integration, context.signal);
          producers.add(
            native.then(
              () => undefined,
              () => undefined,
            ),
          );
          return native;
        });
      })().finally(() => {
        producerOpen = false;
      });
      const settled = (async () => {
        try {
          await Promise.allSettled([work]);
          await Promise.allSettled(producers);
        } finally {
          physical.delete(integration.id);
        }
      })();
      pending.add(settled);
      void settled.then(
        () => pending.delete(settled),
        () => pending.delete(settled),
      );
      return work;
    },
  });
  let stopping: Promise<void> | undefined;
  return {
    getDemoStatsValues,
    getStatsSnapshotAsync: async (integration: StatisticsInput) => {
      lifetimeSignal.throwIfAborted();
      const result = await service.getStatsSnapshotAsync(integration);
      lifetimeSignal.throwIfAborted();
      return result;
    },
    refreshStatsAsync: async (integration: StatisticsInput, force: boolean) => {
      lifetimeSignal.throwIfAborted();
      await service.refreshStatsAsync(integration, force);
      lifetimeSignal.throwIfAborted();
    },
    stopAsync: () => {
      stopping ??= (async () => {
        lifetime.abort(new Error("Widget statistics bindings are stopped"));
        await service.stopAsync();
        await Promise.allSettled(pending);
      })();
      return stopping;
    },
  };
};
