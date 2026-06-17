import { isProviderEnabled } from "@homarr/auth/server";
import { createId, Stopwatch } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { count, db } from "@homarr/db";
import { isMysql, isPostgresql } from "@homarr/db/collection";
import { getServerSettingByKeyAsync, updateServerSettingByKeyAsync } from "@homarr/db/queries";
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
import { getPostHogClient } from "./client";

const logger = createLogger({ module: "analytics" });

type AnalyticsResult = "sent" | "disabled" | "failed";

// ponytail: no DB-level lock; concurrent calls may both generate an ID, but the last write wins
// and the ID stabilizes after the first successful run. Upgrade path: use DB upsert with WHERE instanceId IS NULL.
const getOrCreateInstanceId = async (
  analyticsSettings: Awaited<ReturnType<typeof getServerSettingByKeyAsync<"analytics">>>,
): Promise<string> => {
  if (analyticsSettings.instanceId) return analyticsSettings.instanceId;

  const instanceId = createId();
  await updateServerSettingByKeyAsync(db, "analytics", { ...analyticsSettings, instanceId });

  const verified = await getServerSettingByKeyAsync(db, "analytics");
  return verified.instanceId ?? instanceId;
};

const sumGroupedCounts = (rows: { count: number }[]): number =>
  rows.reduce((sum, row) => sum + row.count, 0);

export const sendServerAnalyticsAsync = async (): Promise<AnalyticsResult> => {
  const stopWatch = new Stopwatch();
  const analyticsSettings = await getServerSettingByKeyAsync(db, "analytics");

  if (!analyticsSettings.enableGeneral) {
    logger.info("Analytics are disabled. No data will be sent. Enable analytics in the settings");
    return "disabled";
  }

  const client = getPostHogClient();

  try {
    const instanceId = await getOrCreateInstanceId(analyticsSettings);

    const queries: Promise<unknown>[] = [
      getServerSettingByKeyAsync(db, "culture"),
      db.$count(boards),
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
    ];

    const userOffset = queries.length;
    if (analyticsSettings.enableUserData) {
      queries.push(
        db.$count(users), db.$count(apiKeys), db.$count(invites),
        db.$count(medias), db.$count(sessions), db.$count(accounts),
      );
    }

    const integrationOffset = queries.length;
    if (analyticsSettings.enableIntegrationData) {
      queries.push(
        db.select({ kind: integrations.kind, count: count(integrations.id) })
          .from(integrations).groupBy(integrations.kind),
      );
    }

    const widgetOffset = queries.length;
    if (analyticsSettings.enableWidgetData) {
      queries.push(
        db.select({ kind: items.kind, count: count(items.id) })
          .from(items).groupBy(items.kind),
      );
    }

    const results = await Promise.all(queries);

    const cultureSettings = results[0] as Awaited<ReturnType<typeof getServerSettingByKeyAsync<"culture">>>;
    const [
      countBoards, countGroups, countApps, countSections,
      countSearchEngines, countIconRepositories, countIcons,
      countLayouts, countItemLayouts, countSectionLayouts,
      countCronJobConfigs, countCustomWidgets, countTrustedCertificates,
    ] = results.slice(1, 14) as number[];

    const enabledAuthProviders = (["credentials", "oidc", "ldap"] as const).filter(isProviderEnabled);

    const properties: Record<string, unknown> = {
      homarrVersion: packageJson.version,
      databaseType: isMysql() ? "mysql" : isPostgresql() ? "postgresql" : "sqlite",
      dockerEnabled: Boolean(dockerEnv.ENABLE_DOCKER),
      kubernetesEnabled: Boolean(dockerEnv.ENABLE_KUBERNETES),
      authProviders: enabledAuthProviders,

      osPlatform: process.platform,
      osArch: process.arch,
      uptimeSeconds: Math.floor(process.uptime()),
      defaultLocale: cultureSettings.defaultLocale,

      countBoards, countGroups, countApps, countSections,
      countSearchEngines, countIconRepositories, countIcons,
      countLayouts, countItemLayouts, countSectionLayouts,
      countCronJobConfigs, countCustomWidgets, countTrustedCertificates,
    };

    if (analyticsSettings.enableUserData) {
      const [countUsers, countApiKeys, countInvites, countMedias, countSessions, countAccounts] =
        results.slice(userOffset, userOffset + 6) as number[];
      Object.assign(properties, { countUsers, countApiKeys, countInvites, countMedias, countSessions, countAccounts });
    }

    if (analyticsSettings.enableIntegrationData) {
      const integrationKinds = results[integrationOffset] as { kind: string; count: number }[];
      properties.countIntegrations = sumGroupedCounts(integrationKinds);
      for (const row of integrationKinds) {
        properties[`integration_${row.kind}`] = row.count;
      }
    }

    if (analyticsSettings.enableWidgetData) {
      const widgetKinds = results[widgetOffset] as { kind: string; count: number }[];
      properties.countWidgets = sumGroupedCounts(widgetKinds);
      for (const row of widgetKinds) {
        properties[`widget_${row.kind}`] = row.count;
      }
    }

    client.capture({
      distinctId: instanceId,
      event: "server-analytics",
      properties,
    });

    await client.flush();
    logger.info(`Sent analytics to PostHog in ${stopWatch.getElapsedInHumanWords()}`);
    return "sent";
  } catch (error) {
    logger.warn("Failed to send analytics to PostHog", { error });
    return "failed";
  }
};
