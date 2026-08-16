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

const getOrCreateInstanceId = async (
  analyticsSettings: Awaited<ReturnType<typeof getServerSettingByKeyAsync<"analytics">>>,
): Promise<string> => {
  if (analyticsSettings.instanceId) return analyticsSettings.instanceId;

  const instanceId = createId();
  await updateServerSettingByKeyAsync(db, "analytics", { ...analyticsSettings, instanceId });

  const verified = await getServerSettingByKeyAsync(db, "analytics");
  return verified.instanceId ?? instanceId;
};

const sumGroupedCounts = (rows: { count: number }[]): number => rows.reduce((sum, row) => sum + row.count, 0);

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

    const [
      cultureSettings,
      countBoards,
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
    ] = await Promise.all([
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
    ]);

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

      countBoards,
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

    for (const row of integrationKinds) {
      properties[`integration_${row.kind}`] = row.count;
    }
    for (const row of widgetKinds) {
      properties[`widget_${row.kind}`] = row.count;
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
