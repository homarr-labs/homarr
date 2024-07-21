import { decryptSecret } from "@homarr/common/server";
import { EVERY_SECOND } from "@homarr/cron-jobs-core/expressions";
import { db, eq } from "@homarr/db";
import { items } from "@homarr/db/schema/sqlite";
import type { CpuLoad, MemoryLoad, NetworkLoad, ServerInfo } from "@homarr/integrations";
import { DashDotIntegration } from "@homarr/integrations";
import { createItemAndIntegrationChannel } from "@homarr/redis";

import { createCronJob } from "../../lib";

export const hardwareUsageJob = createCronJob("hardwareUsage", EVERY_SECOND).withCallback(async () => {
  const itemsForIntegration = await db.query.items.findMany({
    where: eq(items.kind, "hardwareUsage"),
    with: {
      integrations: {
        with: {
          integration: {
            with: {
              secrets: {
                columns: {
                  kind: true,
                  value: true,
                },
              },
            },
          },
        },
      },
    },
  });

  for (const itemForIntegration of itemsForIntegration) {
    for (const integration of itemForIntegration.integrations) {
      const dashDotIntegration = new DashDotIntegration({
        ...integration.integration,
        decryptedSecrets: integration.integration.secrets.map((secret) => ({
          ...secret,
          value: decryptSecret(secret.value),
        })),
      });

      const info = await dashDotIntegration.getInfoAsync();
      const cpuLoad = await dashDotIntegration.getCurrentCpuLoadAsync();
      const memoryLoad = await dashDotIntegration.getCurrentMemoryLoadAsync();
      const networkLoad = await dashDotIntegration.getCurrentNetworkLoadAsync();

      const cache = createItemAndIntegrationChannel<{
        info: ServerInfo;
        cpuLoad: CpuLoad;
        memoryLoad: MemoryLoad;
        networkLoad: NetworkLoad;
      }>("hardwareUsage", integration.integrationId);
      await cache.setAsync({
        memoryLoad,
        networkLoad,
        cpuLoad,
        info,
      });
      await cache.publishAndUpdateLastStateAsync({
        cpuLoad,
        networkLoad,
        memoryLoad,
        info,
      });
    }
  }
});
