import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import type { HealthMonitoring } from "@homarr/integrations/types";
import { createIntegrationHistoryChannel } from "@homarr/redis";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const systemInfoRequestHandler = createCachedIntegrationRequestHandler<
  HealthMonitoring,
  IntegrationKindByCategory<"healthMonitoring">,
  { pointCount: number; maxElements: number }
>({
  async requestAsync(integration, { pointCount, maxElements }) {
    const integrationInstance = await createIntegrationAsync(integration);
    const data = await integrationInstance.getSystemInfoAsync();
    const historyHandler = createIntegrationHistoryChannel<HealthMonitoring["history"][number]>(
      integration.id,
      "healthMonitoring",
      maxElements,
    );
    await historyHandler.pushAsync(data.history[0]);
    if (pointCount === 1) return data;
    const dbHistory = (await historyHandler.getSliceAsync(-pointCount, -1)).map(({ data }) => data);
    const history = (dbHistory.length > 0 ? dbHistory : data.history) as HealthMonitoring["history"];
    return { ...data, history } as HealthMonitoring;
  },
  cacheDuration: dayjs.duration(5, "seconds"),
  queryKey: "systemInfo",
});
