import type { IntegrationKind } from "@homarr/definitions";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { fetchStatsAsync, getStatsMetrics } from "@homarr/integrations/stats";
import type { StatsValue } from "@homarr/integrations/stats";
import { createGetSetChannel, createLockChannel, getIntegrationCacheGenerationAsync } from "@homarr/redis";

import { getIntegrationCacheIdentity } from "./lib/integration-request-handler";
import { createStatisticsSnapshotService } from "./stats-runtime";
import type { StatisticsInput } from "./stats-runtime";

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

export const getDemoStatsValues = (integration: Pick<StatisticsInput, "kind" | "url">) => {
  const demoMode = ["1", "yes", "t", "true"].includes((process.env.DEMO_MODE ?? "").toLowerCase());
  if (!demoMode || integration.url !== "https://demo.homarr.dev") return undefined;
  return demoValues[integration.kind];
};

const logger = createLogger({ module: "integrationStats" });
const runtime = createStatisticsSnapshotService({
  channels: {
    createGetSetChannel: <TData>(name: string) => createGetSetChannel<TData>(name, { useBoundedCacheClient: true }),
    createLockChannel: (name: string) => ({
      ...createLockChannel(name, { useBoundedCacheClient: true }),
      setManyIfOwnedAsync: async () => {
        throw new Error("Legacy statistics adapter does not support atomic multi-write");
      },
    }),
  },
  generations: {
    getIntegrationCacheGenerationAsync: async (id) => ({
      ...(await getIntegrationCacheGenerationAsync(id)),
      fence: [],
    }),
  },
  diagnostics: { warn: (message, metadata) => logger.warn(message, metadata) },
  getIdentity: (integration) => getIntegrationCacheIdentity({ integration, options: { version: 1 } }),
  fetchStatsAsync,
  getStatsMetrics,
  getDemoStatsValues,
});

export const { getStatsSnapshotAsync, refreshStatsAsync } = runtime;
