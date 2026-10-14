import { createHash } from "node:crypto";

import { synchronizeIconsAsync } from "@homarr/icons";
import type { IconSyncResources, StoredIcon } from "@homarr/icons";

export interface JobEffectsLogger {
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(error: unknown): void;
}

export interface JobEffectsClock {
  now(): Date;
  monotonicMilliseconds(): number;
}

export type AnalyticsResult = "sent" | "skipped" | "disabled" | "failed";

export class AnalyticsExternalConnectionsDisabledError extends Error {
  readonly code = "PRECONDITION_FAILED";

  constructor() {
    super("External connections are disabled");
  }
}

export interface AnalyticsSettings {
  enableGeneral: boolean;
  instanceId: string | null;
  lastSuccessfulSnapshotAt: string | null;
}

export interface AnalyticsSnapshotRows {
  cultureSettings: { defaultLocale: string };
  boardSettings: { forceDisableStatus: boolean };
  counts: {
    countBoards: number;
    countPublicBoards: number;
    countBoardsWithStatusEnabled: number;
    countGroups: number;
    countApps: number;
    countSections: number;
    countSearchEngines: number;
    countIconRepositories: number;
    countIcons: number;
    countLayouts: number;
    countItemLayouts: number;
    countSectionLayouts: number;
    countCronJobConfigs: number;
    countCustomWidgets: number;
    countTrustedCertificates: number;
    countUsers: number;
    countApiKeys: number;
    countInvites: number;
    countMedias: number;
    countSessions: number;
    countAccounts: number;
  };
  integrationKinds: readonly { kind: string; count: number }[];
  widgetKinds: readonly { kind: string; count: number }[];
  boardsWithWidgetKinds: readonly { kind: string; count: number }[];
  boardItemCounts: readonly { boardId: string; count: number }[];
  boardsWithIntegrationKinds: readonly { kind: string; count: number }[];
  layoutRoleCounts: readonly { kind: string; count: number }[];
  sectionKindCounts: readonly { kind: string; count: number }[];
}

export interface AnalyticsJobResources {
  noExternalConnection(): boolean;
  readSettingsAsync(): Promise<AnalyticsSettings>;
  updateSettingsAsync(update: (current: AnalyticsSettings) => AnalyticsSettings): Promise<AnalyticsSettings>;
  collectSnapshotAsync(): Promise<AnalyticsSnapshotRows>;
  createId(): string;
  clock: JobEffectsClock;
  logger: JobEffectsLogger;
  runtimeProperties(): {
    homarrVersion: string;
    databaseType: "sqlite" | "postgresql";
    dockerEnabled: boolean;
    kubernetesEnabled: boolean;
    authProviders: readonly string[];
    osPlatform: string;
    osArch: string;
    uptimeSeconds: number;
  };
  sendAsync(
    event: {
      uuid: string;
      distinctId: string;
      event: "server-analytics";
      properties: Record<string, unknown>;
      disableGeoip: true;
    },
    signal?: AbortSignal,
  ): Promise<void>;
}

const snapshotIntervalMs = 7 * 24 * 60 * 60 * 1000;

const getItemCountBucket = (count: number) => {
  if (count === 0) return "empty";
  if (count === 1) return "one";
  if (count <= 3) return "two-to-three";
  if (count <= 7) return "four-to-seven";
  if (count <= 15) return "eight-to-fifteen";
  return "sixteen-plus";
};

export const createAnalyticsJobService = (resources: AnalyticsJobResources) => {
  let pending: Promise<AnalyticsResult> | undefined;

  const sendSnapshotAsync = async (signal?: AbortSignal): Promise<AnalyticsResult> => {
    if (resources.noExternalConnection()) return "disabled";
    const settings = await resources.readSettingsAsync();
    if (!settings.enableGeneral) {
      resources.logger.info("Analytics are disabled. No data will be sent. Enable analytics in the settings");
      return "disabled";
    }
    const now = resources.clock.now();
    const lastSent = settings.lastSuccessfulSnapshotAt ? Date.parse(settings.lastSuccessfulSnapshotAt) : Number.NaN;
    if (Number.isFinite(lastSent) && now.getTime() - lastSent < snapshotIntervalMs) return "skipped";

    try {
      signal?.throwIfAborted();
      const proposedId = settings.instanceId ?? resources.createId();
      const updated = settings.instanceId
        ? settings
        : await resources.updateSettingsAsync((current) =>
            current.instanceId ? current : { ...current, instanceId: proposedId },
          );
      const instanceId = updated.instanceId ?? proposedId;
      const rows = await resources.collectSnapshotAsync();
      const { countBoardsWithStatusEnabled, ...counts } = rows.counts;
      const properties: Record<string, unknown> = {
        ...resources.runtimeProperties(),
        defaultLocale: rows.cultureSettings.defaultLocale,
        ...counts,
        countIntegrations: rows.integrationKinds.reduce((sum, row) => sum + row.count, 0),
        countWidgets: rows.widgetKinds.reduce((sum, row) => sum + row.count, 0),
      };
      if (!rows.boardSettings.forceDisableStatus && countBoardsWithStatusEnabled > 0) {
        properties.countBoardsWithStatusEnabled = countBoardsWithStatusEnabled;
      }
      const groups = [
        ["integration", rows.integrationKinds],
        ["widget", rows.widgetKinds],
        ["boardsWithWidget", rows.boardsWithWidgetKinds],
        ["boardsWithIntegration", rows.boardsWithIntegrationKinds],
        ["layout", rows.layoutRoleCounts],
        ["section", rows.sectionKindCounts],
      ] as const;
      for (const [prefix, group] of groups) {
        for (const row of group) if (row.count > 0) properties[`${prefix}_${row.kind}`] = row.count;
      }
      const boardSizes = new Map<string, number>();
      const emptyCount = rows.counts.countBoards - rows.boardItemCounts.length;
      if (emptyCount > 0) boardSizes.set("empty", emptyCount);
      for (const row of rows.boardItemCounts) {
        const bucket = getItemCountBucket(row.count);
        boardSizes.set(bucket, (boardSizes.get(bucket) ?? 0) + 1);
      }
      for (const [bucket, count] of boardSizes) properties[`boardsWithItemCount_${bucket}`] = count;
      const current = await resources.readSettingsAsync();
      if (!current.enableGeneral || resources.noExternalConnection()) return "disabled";
      signal?.throwIfAborted();
      const period = Math.floor(now.getTime() / snapshotIntervalMs);
      const hash = createHash("sha256").update(`${instanceId}:${period}:server-analytics`).digest("hex").slice(0, 32);
      const uuid = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20)}`;
      await resources.sendAsync(
        {
          uuid,
          distinctId: instanceId,
          event: "server-analytics",
          properties: {
            ...Object.fromEntries(
              Object.entries(properties).filter(([key, value]) => !key.startsWith("count") || value !== 0),
            ),
            $process_person_profile: false,
          },
          disableGeoip: true,
        },
        signal,
      );
      await resources.updateSettingsAsync((value) => ({ ...value, lastSuccessfulSnapshotAt: now.toISOString() }));
      resources.logger.info("Sent analytics to PostHog");
      return "sent";
    } catch (error) {
      resources.logger.warn("Failed to send analytics to PostHog", { error });
      return "failed";
    }
  };

  return {
    sendServerAnalyticsAsync(signal?: AbortSignal): Promise<AnalyticsResult> {
      if (pending) return pending;
      pending = sendSnapshotAsync(signal).finally(() => {
        pending = undefined;
      });
      return pending;
    },
  };
};

export type { FetchedIconRepository, StoredIcon } from "@homarr/icons";
export interface IconSyncPlan {
  deleteIcons:
    | { kind: "all" }
    | { kind: "repositories"; repositories: readonly { id: string; retainedChecksums: readonly string[] }[] };
  deleteRepositoryIds: readonly string[];
  insertRepositories: readonly { id: string; slug: string }[];
  insertIconBatches: readonly (readonly StoredIcon[])[];
}
export type IconsJobResources = IconSyncResources;
export const updateIconsAsync = synchronizeIconsAsync;

export type PingResult = { statusCode: number; durationMs: number } | { error: string };

export interface PingJobResources {
  logger: JobEffectsLogger;
  readBoardSettingsAsync(): Promise<{ forceDisableStatus: boolean }>;
  clearUrlsAsync(): Promise<void>;
  getUrlsAsync(): Promise<readonly string[]>;
  sendPingRequestAsync(url: string, signal?: AbortSignal): Promise<PingResult>;
  publishAsync(result: PingResult & { url: string }): Promise<void>;
}

export const clearPingUrlsAsync = async (resources: PingJobResources) => {
  await resources.clearUrlsAsync();
  resources.logger.info("Cleared previous ping urls");
};

export const pingUrlsAsync = async (resources: PingJobResources, signal?: AbortSignal) => {
  const settings = await resources.readBoardSettingsAsync();
  if (settings.forceDisableStatus) {
    resources.logger.debug("Simple ping is disabled by server settings");
    return;
  }
  signal?.throwIfAborted();
  const urls = await resources.getUrlsAsync();
  await Promise.allSettled(
    [...new Set(urls)].map(async (url) => {
      signal?.throwIfAborted();
      const result = await resources.sendPingRequestAsync(url, signal);
      if ("statusCode" in result) {
        resources.logger.debug("Executed ping successfully", { url, statusCode: result.statusCode });
      } else {
        resources.logger.error(new Error(`Executing ping failed: ${url}`, { cause: result.error }));
      }
      signal?.throwIfAborted();
      await resources.publishAsync({ url, ...result });
    }),
  );
};

export interface SessionCleanupResources<TProvider extends string> {
  supportedProviders: readonly TProvider[];
  enabledProviders: readonly TProvider[];
  deleteSessionsForProvidersAsync(providers: readonly TProvider[]): Promise<number>;
  logger: JobEffectsLogger;
}

export const cleanupDisabledProviderSessionsAsync = async <TProvider extends string>(
  resources: SessionCleanupResources<TProvider>,
) => {
  const inactive = resources.supportedProviders.filter((provider) => !resources.enabledProviders.includes(provider));
  const count = await resources.deleteSessionsForProvidersAsync(inactive);
  if (count > 0) resources.logger.info("Deleted sessions for inactive providers", { count });
  else resources.logger.debug("No sessions to delete");
};
