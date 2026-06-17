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

const getDatabaseType = (): "mysql" | "postgresql" | "sqlite" => {
  if (isMysql()) return "mysql";
  if (isPostgresql()) return "postgresql";
  return "sqlite";
};

const getEnabledAuthProviders = (): string[] => {
  const providers: string[] = [];
  if (isProviderEnabled("credentials")) providers.push("credentials");
  if (isProviderEnabled("oidc")) providers.push("oidc");
  if (isProviderEnabled("ldap")) providers.push("ldap");
  return providers;
};

// ponytail: no DB-level lock; concurrent calls may both generate an ID, but the last write wins
// and the ID stabilizes after the first successful run. Upgrade path: use DB upsert with WHERE instanceId IS NULL.
const getOrCreateInstanceId = async (analyticsSettings: Awaited<ReturnType<typeof getServerSettingByKeyAsync<"analytics">>>): Promise<string> => {
  if (analyticsSettings.instanceId) return analyticsSettings.instanceId;

  const instanceId = createId();
  await updateServerSettingByKeyAsync(db, "analytics", { ...analyticsSettings, instanceId });

  const verified = await getServerSettingByKeyAsync(db, "analytics");
  return verified.instanceId ?? instanceId;
};

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
    const enabledAuthProviders = getEnabledAuthProviders();

    const [cultureSettings, ...baseCounts] = await Promise.all([
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
    ]);

    const [
      countBoards, countGroups, countApps, countSections,
      countSearchEngines, countIconRepositories, countIcons,
      countLayouts, countItemLayouts, countSectionLayouts,
      countCronJobConfigs, countCustomWidgets, countTrustedCertificates,
    ] = baseCounts;

    const properties: Record<string, unknown> = {
      homarrVersion: packageJson.version,
      databaseType: getDatabaseType(),
      dockerEnabled: Boolean(dockerEnv.ENABLE_DOCKER),
      kubernetesEnabled: Boolean(dockerEnv.ENABLE_KUBERNETES),
      authCredentials: enabledAuthProviders.includes("credentials"),
      authOidc: enabledAuthProviders.includes("oidc"),
      authLdap: enabledAuthProviders.includes("ldap"),
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
      const [countUsers, countApiKeys, countInvites, countMedias, countSessions, countAccounts] = await Promise.all([
        db.$count(users),
        db.$count(apiKeys),
        db.$count(invites),
        db.$count(medias),
        db.$count(sessions),
        db.$count(accounts),
      ]);
      Object.assign(properties, { countUsers, countApiKeys, countInvites, countMedias, countSessions, countAccounts });
    }

    if (analyticsSettings.enableIntegrationData) {
      const [countIntegrations, integrationKinds] = await Promise.all([
        db.$count(integrations),
        db.select({ kind: integrations.kind, count: count(integrations.id) })
          .from(integrations)
          .groupBy(integrations.kind),
      ]);
      properties.countIntegrations = countIntegrations;
      for (const row of integrationKinds) {
        properties[`integration_${row.kind}`] = row.count;
      }
    }

    if (analyticsSettings.enableWidgetData) {
      const [countWidgets, widgetKinds] = await Promise.all([
        db.$count(items),
        db.select({ kind: items.kind, count: count(items.id) })
          .from(items)
          .groupBy(items.kind),
      ]);
      properties.countWidgets = countWidgets;
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
