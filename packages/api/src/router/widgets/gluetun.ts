import { gluetunVPNStatusHandler } from "@homarr/request-handler/gluetun";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const gluetunRouter = createTRPCRouter({
  getVpnInfo: publicProcedure.concat(createManyIntegrationMiddleware("query", "gluetun")).query(async ({ ctx }) => {
    const results = await Promise.all(
      ctx.integrations.map(async (integration) => {
        const innerHandler = gluetunVPNStatusHandler.handler(integration, {});
        const result = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
        return result.data;
      }),
    );

    return results;
  }),
});
