import type { UmamiEventData } from "@umami/node";
import { Umami } from "@umami/node";

import { count, db } from "@homarr/db";
import { integrations } from "@homarr/db/schema/sqlite";

import { UMAMI_HOST_URL, UMAMI_WEBSITE_ID } from "./constants";

export const sendServerAnalyticsAsync = async () => {
  const umamiInstance = new Umami();
  umamiInstance.init({
    hostUrl: UMAMI_HOST_URL,
    websiteId: UMAMI_WEBSITE_ID,
  });

  await sendIntegrationDataAsync(umamiInstance);
};

const sendIntegrationDataAsync = async (umamiInstance: Umami) => {
  const integrationKinds = await db
    .select({ kind: integrations.kind, count: count(integrations.id) })
    .from(integrations)
    .groupBy(integrations.kind);
  console.log("distinct: ", JSON.stringify(integrationKinds));

  const map: UmamiEventData = {};

  integrationKinds.forEach((integrationKind) => {
    map[integrationKind.kind] = integrationKind.count;
  });

  await umamiInstance.track("server-integration-data", map);
};
