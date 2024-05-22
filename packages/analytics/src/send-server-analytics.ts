import type { UmamiEventData } from "@umami/node";
import { Umami } from "@umami/node";
import SuperJSON from "superjson";

import { count, db, eq } from "@homarr/db";
import { integrations, items, serverSettings, users } from "@homarr/db/schema/sqlite";
import { logger } from "@homarr/log";
import type { defaultServerSettings } from "@homarr/server-settings";

import { Stopwatch } from "../../common/src";
import { UMAMI_HOST_URL, UMAMI_WEBSITE_ID } from "./constants";

export const sendServerAnalyticsAsync = async () => {
  const stopWatch = new Stopwatch();
  const setting = await db.query.serverSettings.findFirst({
    where: eq(serverSettings.settingKey, "analytics"),
  });

  if (!setting) {
    logger.info(
      "Server does not know the configured state of analytics. No data will be sent. Enable analytics in the settings",
    );
    return;
  }

  const analyticsSettings = SuperJSON.parse<typeof defaultServerSettings.analytics>(setting.value);

  if (!analyticsSettings.enableGeneral) {
    logger.info("Analytics are disabled. No data will be sent. Enable analytics in the settings");
    return;
  }

  const umamiInstance = new Umami();
  umamiInstance.init({
    hostUrl: UMAMI_HOST_URL,
    websiteId: UMAMI_WEBSITE_ID,
  });

  await sendIntegrationDataAsync(umamiInstance, analyticsSettings);
  await sendWidgetDataAsync(umamiInstance, analyticsSettings);
  await sendUserDataAsync(umamiInstance, analyticsSettings);

  logger.info(`Sent all analytics in ${stopWatch.getElapsedInHumanWords()}`);
};

const sendWidgetDataAsync = async (umamiInstance: Umami, analyticsSettings: typeof defaultServerSettings.analytics) => {
  if (!analyticsSettings.enableWidgetData) {
    return;
  }
  const widgetCount = (await db.select({ count: count(items.id) }).from(items))[0]?.count ?? 0;

  const response = await umamiInstance.track("server-widget-data", {
    countWidgets: widgetCount,
  });
  if (response.ok) {
    return;
  }

  logger.warn("Unable to send track event data to Umami instance");
};

const sendUserDataAsync = async (umamiInstance: Umami, analyticsSettings: typeof defaultServerSettings.analytics) => {
  if (!analyticsSettings.enableUserData) {
    return;
  }
  const userCount = (await db.select({ count: count(users.id) }).from(users))[0]?.count ?? 0;

  const response = await umamiInstance.track("server-user-data", {
    countUsers: userCount,
  });
  if (response.ok) {
    return;
  }

  logger.warn("Unable to send track event data to Umami instance");
};

const sendIntegrationDataAsync = async (
  umamiInstance: Umami,
  analyticsSettings: typeof defaultServerSettings.analytics,
) => {
  if (!analyticsSettings.enableIntegrationData) {
    return;
  }
  const integrationKinds = await db
    .select({ kind: integrations.kind, count: count(integrations.id) })
    .from(integrations)
    .groupBy(integrations.kind);

  const map: UmamiEventData = {};

  integrationKinds.forEach((integrationKind) => {
    map[integrationKind.kind] = integrationKind.count;
  });

  const response = await umamiInstance.track("server-integration-data-kind", map);
  if (response.ok) {
    return;
  }

  logger.warn("Unable to send track event data to Umami instance");
};
