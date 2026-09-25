import { createHash } from "node:crypto";

import { isProviderEnabled } from "@homarr/auth/server";
import { createId, Stopwatch } from "@homarr/common";
import { env } from "@homarr/common/env";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { count, countDistinct, db, eq } from "@homarr/db";
import { isPostgresql } from "@homarr/db/collection";
import { getServerSettingByKeyAsync, updateAnalyticsServerSettingAsync } from "@homarr/db/queries";
import {
  accounts,
  apiKeys,
  apps,
  boards,
  cronJobConfigurations,
  customWidgetDefinitions,
  groups,
  iconRepositories,
  icons,
  integrationItems,
  integrations,
  invites,
  itemLayouts,
  items,
  layouts,
  medias,
  searchEngines,
  sectionLayouts,
  sections,
  sessions,
  trustedCertificateHostnames,
  users,
} from "@homarr/db/schema";
import { env as dockerEnv } from "@homarr/docker/env";

import packageJson from "../../../package.json";
import { createPostHogClient } from "./client";

const logger = createLogger({ module: "analytics" });

type AnalyticsResult = "sent" | "skipped" | "disabled" | "failed";
const snapshotIntervalMs = 7 * 24 * 60 * 60 * 1_000;

const getOrCreateInstanceId = async (
  analyticsSettings: Awaited<ReturnType<typeof getServerSettingByKeyAsync<"analytics">>>,
): Promise<string> => {
  if (analyticsSettings.instanceId) return analyticsSettings.instanceId;

  const instanceId = createId();
  const updated = await updateAnalyticsServerSettingAsync(db, (current) => {
    if (current.instanceId) return current;
    return { ...current, instanceId };
  });
  return updated.instanceId ?? instanceId;
};

const sumGroupedCounts = (rows: { count: number }[]): number => rows.reduce((sum, row) => sum + row.count, 0);

const isSnapshotDue = (lastSuccessfulSnapshotAt: string | null, now: Date) => {
  if (!lastSuccessfulSnapshotAt) return true;
  const lastSent = Date.parse(lastSuccessfulSnapshotAt);
  if (!Number.isFinite(lastSent)) return true;
  return now.getTime() - lastSent >= snapshotIntervalMs;
};

const getSnapshotUuid = (instanceId: string, now: Date) => {
  const period = Math.floor(now.getTime() / snapshotIntervalMs);
  const hash = createHash("sha256").update(`${instanceId}:${period}:server-analytics`).digest("hex").slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20)}`;
};

const getItemCountBucket = (itemCount: number) => {
  if (itemCount === 0) return "empty";
  if (itemCount === 1) return "one";
  if (itemCount <= 3) return "two-to-three";
  if (itemCount <= 7) return "four-to-seven";
  if (itemCount <= 15) return "eight-to-fifteen";
  return "sixteen-plus";
};

const sendSnapshotAsync = async (): Promise<AnalyticsResult> => {
  const stopWatch = new Stopwatch();
  if (env.NO_EXTERNAL_CONNECTION) return "disabled";
  const analyticsSettings = await getServerSettingByKeyAsync(db, "analytics");

  if (!analyticsSettings.enableGeneral) {
    logger.info("Analytics are disabled. No data will be sent. Enable analytics in the settings");
    return "disabled";
  }

  const now = new Date();
  if (!isSnapshotDue(analyticsSettings.lastSuccessfulSnapshotAt, now)) return "skipped";

  try {
    const instanceId = await getOrCreateInstanceId(analyticsSettings);

    const [
      cultureSettings,
      boardSettings,
      countBoards,
      countPublicBoards,
      countBoardsWithStatusEnabled,
      countGroups,
      countApps,
      countSections,
      countSearchEngines,
      countIconRepositories,
      countIcons,
      countLayouts,
      countItemLayouts,
      countSectionLayouts,
      countCronJobConfigs,
      countCustomWidgets,
      countTrustedCertificates,
      countUsers,
      countApiKeys,
      countInvites,
      countMedias,
      countSessions,
      countAccounts,
      integrationKinds,
      widgetKinds,
      boardsWithWidgetKinds,
      boardItemCounts,
      boardsWithIntegrationKinds,
      layoutRoleCounts,
      sectionKindCounts,
    ] = await Promise.all([
      getServerSettingByKeyAsync(db, "culture"),
      getServerSettingByKeyAsync(db, "board"),
      db.$count(boards),
      db.$count(boards, eq(boards.isPublic, true)),
      db.$count(boards, eq(boards.disableStatus, false)),
      db.$count(groups),
      db.$count(apps),
      db.$count(sections),
      db.$count(searchEngines),
      db.$count(iconRepositories),
      db.$count(icons),
      db.$count(layouts),
      db.$count(itemLayouts),
      db.$count(sectionLayouts),
      db.$count(cronJobConfigurations),
      db.$count(customWidgetDefinitions),
      db.$count(trustedCertificateHostnames),
      db.$count(users),
      db.$count(apiKeys),
      db.$count(invites),
      db.$count(medias),
      db.$count(sessions),
      db.$count(accounts),
      db
        .select({ kind: integrations.kind, count: count(integrations.id) })
        .from(integrations)
        .groupBy(integrations.kind),
      db
        .select({ kind: items.kind, count: count(items.id) })
        .from(items)
        .groupBy(items.kind),
      db
        .select({ kind: items.kind, count: countDistinct(items.boardId) })
        .from(items)
        .groupBy(items.kind),
      db
        .select({ boardId: items.boardId, count: count(items.id) })
        .from(items)
        .groupBy(items.boardId),
      db
        .select({ kind: integrations.kind, count: countDistinct(items.boardId) })
        .from(integrationItems)
        .innerJoin(integrations, eq(integrationItems.integrationId, integrations.id))
        .innerJoin(items, eq(integrationItems.itemId, items.id))
        .groupBy(integrations.kind),
      db
        .select({ kind: layouts.role, count: count(layouts.id) })
        .from(layouts)
        .groupBy(layouts.role),
      db
        .select({ kind: sections.kind, count: count(sections.id) })
        .from(sections)
        .groupBy(sections.kind),
    ]);

    const enabledAuthProviders = (["credentials", "oidc", "ldap"] as const).filter(isProviderEnabled);

    const properties: Record<string, unknown> = {
      homarrVersion: packageJson.version,
      databaseType: isPostgresql() ? "postgresql" : "sqlite",
      dockerEnabled: Boolean(dockerEnv.ENABLE_DOCKER),
      kubernetesEnabled: Boolean(dockerEnv.ENABLE_KUBERNETES),
      authProviders: enabledAuthProviders,

      osPlatform: process.platform,
      osArch: process.arch,
      uptimeSeconds: Math.floor(process.uptime()),
      defaultLocale: cultureSettings.defaultLocale,

      countBoards,
      countPublicBoards,
      countGroups,
      countApps,
      countSections,
      countSearchEngines,
      countIconRepositories,
      countIcons,
      countLayouts,
      countItemLayouts,
      countSectionLayouts,
      countCronJobConfigs,
      countCustomWidgets,
      countTrustedCertificates,

      countUsers,
      countApiKeys,
      countInvites,
      countMedias,
      countSessions,
      countAccounts,

      countIntegrations: sumGroupedCounts(integrationKinds),
      countWidgets: sumGroupedCounts(widgetKinds),
    };

    if (!boardSettings.forceDisableStatus && countBoardsWithStatusEnabled > 0) {
      properties.countBoardsWithStatusEnabled = countBoardsWithStatusEnabled;
    }

    for (const row of integrationKinds) {
      if (row.count > 0) properties[`integration_${row.kind}`] = row.count;
    }
    for (const row of widgetKinds) {
      if (row.count > 0) properties[`widget_${row.kind}`] = row.count;
    }
    for (const row of boardsWithWidgetKinds) {
      if (row.count > 0) properties[`boardsWithWidget_${row.kind}`] = row.count;
    }
    for (const row of boardsWithIntegrationKinds) {
      if (row.count > 0) properties[`boardsWithIntegration_${row.kind}`] = row.count;
    }
    for (const row of layoutRoleCounts) {
      if (row.count > 0) properties[`layout_${row.kind}`] = row.count;
    }
    for (const row of sectionKindCounts) {
      if (row.count > 0) properties[`section_${row.kind}`] = row.count;
    }
    const boardSizeCounts = new Map<string, number>();
    const emptyBoardCount = countBoards - boardItemCounts.length;
    if (emptyBoardCount > 0) boardSizeCounts.set("empty", emptyBoardCount);
    for (const row of boardItemCounts) {
      const bucket = getItemCountBucket(row.count);
      boardSizeCounts.set(bucket, (boardSizeCounts.get(bucket) ?? 0) + 1);
    }
    for (const [bucket, boardCount] of boardSizeCounts) {
      properties[`boardsWithItemCount_${bucket}`] = boardCount;
    }
    for (const [key, value] of Object.entries(properties)) {
      if (key.startsWith("count") && value === 0) delete properties[key];
    }

    const currentSettings = await getServerSettingByKeyAsync(db, "analytics");
    if (!currentSettings.enableGeneral || env.NO_EXTERNAL_CONNECTION) return "disabled";

    const client = createPostHogClient();
    client.capture({
      uuid: getSnapshotUuid(instanceId, now),
      distinctId: instanceId,
      event: "server-analytics",
      properties: { ...properties, $process_person_profile: false },
      disableGeoip: true,
    });

    await client.flush();
    await updateAnalyticsServerSettingAsync(db, (current) => ({
      ...current,
      lastSuccessfulSnapshotAt: now.toISOString(),
    }));
    logger.info(`Sent analytics to PostHog in ${stopWatch.getElapsedInHumanWords()}`);
    return "sent";
  } catch (error) {
    logger.warn("Failed to send analytics to PostHog", { error });
    return "failed";
  }
};

let pendingSnapshot: Promise<AnalyticsResult> | null = null;

export const sendServerAnalyticsAsync = (): Promise<AnalyticsResult> => {
  if (pendingSnapshot) return pendingSnapshot;
  pendingSnapshot = sendSnapshotAsync().finally(() => {
    pendingSnapshot = null;
  });
  return pendingSnapshot;
};
