import type { UmamiEventData } from "@umami/node";
import { Umami } from "@umami/node";

import { isProviderEnabled } from "@homarr/auth/server";
import { Stopwatch } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { count, db } from "@homarr/db";
import { isMysql, isPostgresql } from "@homarr/db/collection";
import { getServerSettingByKeyAsync } from "@homarr/db/queries";
import {
  apiKeys,
  apps,
  boards,
  cronJobConfigurations,
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
  users,
} from "@homarr/db/schema";
import { env as dockerEnv } from "@homarr/docker/env";

import packageJson from "../../../package.json";
import { UMAMI_HOST_URL, UMAMI_WEBSITE_ID } from "./constants";

const logger = createLogger({ module: "analytics" });

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

export const sendServerAnalyticsAsync = async () => {
  const stopWatch = new Stopwatch();
  const analyticsSettings = await getServerSettingByKeyAsync(db, "analytics");

  if (!analyticsSettings.enableGeneral) {
    logger.info("Analytics are disabled. No data will be sent. Enable analytics in the settings");
    return;
  }

  const umamiInstance = new Umami();
  umamiInstance.init({
    hostUrl: UMAMI_HOST_URL,
    websiteId: UMAMI_WEBSITE_ID,
  });

  const enabledAuthProviders = getEnabledAuthProviders();

  const analyticsData: UmamiEventData = {
    homarrVersion: packageJson.version,
    databaseType: getDatabaseType(),
    dockerEnabled: dockerEnv.ENABLE_DOCKER ? 1 : 0,
    kubernetesEnabled: dockerEnv.ENABLE_KUBERNETES ? 1 : 0,
    authCredentials: enabledAuthProviders.includes("credentials") ? 1 : 0,
    authOidc: enabledAuthProviders.includes("oidc") ? 1 : 0,
    authLdap: enabledAuthProviders.includes("ldap") ? 1 : 0,
    countUsers: await db.$count(users),
    countBoards: await db.$count(boards),
    countGroups: await db.$count(groups),
    countApps: await db.$count(apps),
    countWidgets: await db.$count(items),
    countSections: await db.$count(sections),
    countIntegrations: await db.$count(integrations),
    countSearchEngines: await db.$count(searchEngines),
    countIconRepositories: await db.$count(iconRepositories),
    countIcons: await db.$count(icons),
    countApiKeys: await db.$count(apiKeys),
    countInvites: await db.$count(invites),
    countMedias: await db.$count(medias),
    countLayouts: await db.$count(layouts),
    countItemLayouts: await db.$count(itemLayouts),
    countSectionLayouts: await db.$count(sectionLayouts),
    countCronJobConfigs: await db.$count(cronJobConfigurations),
  };

  const integrationKinds = await db
    .select({ kind: integrations.kind, count: count(integrations.id) })
    .from(integrations)
    .groupBy(integrations.kind);

  integrationKinds.forEach((integrationKind) => {
    analyticsData[`integration_${integrationKind.kind}`] = integrationKind.count;
  });

  const response = await umamiInstance.track("server-analytics-v2", analyticsData);
  if (!response.ok) {
    logger.warn("Unable to send analytics to Umami instance");
  }

  logger.info(`Sent analytics in ${stopWatch.getElapsedInHumanWords()}`);
};
