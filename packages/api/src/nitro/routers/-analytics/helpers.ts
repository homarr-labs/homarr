import { createHash } from "node:crypto";

import type { Database } from "@homarr/db";
import { defaultServerSettings } from "@homarr/server-settings";
import type { ServerSettings } from "@homarr/server-settings";

import type { AnalyticsResult, AnalyticsSnapshotResources, AnalyticsSnapshotService } from "./resources";

const snapshotIntervalMs = 7 * 24 * 60 * 60 * 1_000;

const isSnapshotDue = (lastSuccessfulSnapshotAt: string | null, now: Date) => {
  if (!lastSuccessfulSnapshotAt) return true;
  const lastSent = Date.parse(lastSuccessfulSnapshotAt);
  if (!Number.isFinite(lastSent)) return true;
  return now.getTime() - lastSent >= snapshotIntervalMs;
};

const getItemCountBucket = (itemCount: number) => {
  if (itemCount === 0) return "empty";
  if (itemCount === 1) return "one";
  if (itemCount <= 3) return "two-to-three";
  if (itemCount <= 7) return "four-to-seven";
  if (itemCount <= 15) return "eight-to-fifteen";
  return "sixteen-plus";
};

const sumGroupedCounts = (rows: { count: number }[]): number => rows.reduce((sum, row) => sum + row.count, 0);

const getSnapshotUuid = (instanceId: string, now: Date) => {
  const period = Math.floor(now.getTime() / snapshotIntervalMs);
  const hash = createHash("sha256").update(`${instanceId}:${period}:server-analytics`).digest("hex").slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20)}`;
};

export function createAnalyticsSnapshotService(resources: AnalyticsSnapshotResources): AnalyticsSnapshotService {
  const {
    codec,
    operators: { and, eq, count, countDistinct },
  } = resources;

  async function readSettings<Key extends "analytics" | "culture" | "board">(
    db: Database,
    key: Key,
  ): Promise<ServerSettings[Key]> {
    const { serverSettings } = resources.getSchemaForDatabase(db);
    const row = await db.query.serverSettings.findFirst({ where: eq(serverSettings.settingKey, key) });
    if (!row) return defaultServerSettings[key];
    return { ...defaultServerSettings[key], ...codec.parse<ServerSettings[Key]>(row.value) };
  }

  async function updateAnalyticsSettings(
    db: Database,
    update: (current: ServerSettings["analytics"]) => ServerSettings["analytics"],
  ) {
    const { serverSettings } = resources.getSchemaForDatabase(db);
    for (let attempt = 0; attempt < 5; attempt++) {
      const row = await db.query.serverSettings.findFirst({ where: eq(serverSettings.settingKey, "analytics") });
      if (!row) throw new Error("Analytics server settings are missing");
      const current = { ...defaultServerSettings.analytics, ...codec.parse<ServerSettings["analytics"]>(row.value) };
      const next = update(current);
      const updated = await db
        .update(serverSettings)
        .set({ value: codec.stringify(next) })
        .where(and(eq(serverSettings.settingKey, "analytics"), eq(serverSettings.value, row.value)))
        .returning({ settingKey: serverSettings.settingKey });
      if (updated.length > 0) return next;
    }
    throw new Error("Analytics server settings changed too often to update");
  }

  async function getOrCreateInstanceId(db: Database, analyticsSettings: ServerSettings["analytics"]): Promise<string> {
    if (analyticsSettings.instanceId) return analyticsSettings.instanceId;
    const instanceId = resources.createId();
    const updated = await updateAnalyticsSettings(db, (current) => {
      if (current.instanceId) return current;
      return { ...current, instanceId };
    });
    return updated.instanceId ?? instanceId;
  }

  async function sendSnapshotAsync(db: Database): Promise<AnalyticsResult> {
    const stopWatch = new resources.Stopwatch();
    if (resources.noExternalConnection()) return "disabled";
    const analyticsSettings = await readSettings(db, "analytics");
    if (!analyticsSettings.enableGeneral) {
      resources.logger.info("Analytics are disabled. No data will be sent. Enable analytics in the settings");
      return "disabled";
    }
    const now = resources.clock.now();
    if (!isSnapshotDue(analyticsSettings.lastSuccessfulSnapshotAt, now)) return "skipped";

    try {
      const instanceId = await getOrCreateInstanceId(db, analyticsSettings);
      const {
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
      } = resources.getSchemaForDatabase(db);
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
        readSettings(db, "culture"),
        readSettings(db, "board"),
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

      const enabledAuthProviders = (["credentials", "oidc", "ldap"] as const).filter((provider) =>
        resources.isProviderEnabled(provider),
      );
      const properties: Record<string, unknown> = {
        homarrVersion: resources.homarrVersion,
        databaseType: resources.isPostgresql(db) ? "postgresql" : "sqlite",
        dockerEnabled: Boolean(resources.dockerEnabled()),
        kubernetesEnabled: Boolean(resources.kubernetesEnabled()),
        authProviders: enabledAuthProviders,
        osPlatform: resources.osPlatform,
        osArch: resources.osArch,
        uptimeSeconds: Math.floor(resources.uptime()),
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
      const currentSettings = await readSettings(db, "analytics");
      if (!currentSettings.enableGeneral || resources.noExternalConnection()) return "disabled";

      const client = resources.createPostHogClient();
      client.capture({
        uuid: getSnapshotUuid(instanceId, now),
        distinctId: instanceId,
        event: "server-analytics",
        properties: {
          ...Object.fromEntries(
            Object.entries(properties).filter(([key, value]) => !key.startsWith("count") || value !== 0),
          ),
          $process_person_profile: false,
        },
        disableGeoip: true,
      });
      await client.flush();
      await updateAnalyticsSettings(db, (current) => ({ ...current, lastSuccessfulSnapshotAt: now.toISOString() }));
      resources.logger.info(`Sent analytics to PostHog in ${stopWatch.getElapsedInHumanWords()}`);
      return "sent";
    } catch (error) {
      resources.logger.warn("Failed to send analytics to PostHog", { error });
      return "failed";
    }
  }

  let pendingSnapshot: Promise<AnalyticsResult> | null = null;
  return {
    sendServerAnalyticsAsync(db) {
      if (pendingSnapshot) return pendingSnapshot;
      pendingSnapshot = sendSnapshotAsync(db).finally(() => {
        pendingSnapshot = null;
      });
      return pendingSnapshot;
    },
  };
}
