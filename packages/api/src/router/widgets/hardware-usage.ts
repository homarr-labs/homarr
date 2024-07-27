import {createTRPCRouter, publicProcedure} from "../../trpc";
import {createManyIntegrationMiddleware} from "../../middlewares/integration";
import {createItemAndIntegrationChannel} from "@homarr/redis";
import {CpuLoad} from "@homarr/integrations";

export const hardwareUsageRouter = createTRPCRouter({
  getCpuHistory: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("query", "getDashDot"))
    .query(async ({ ctx }) => {
      return await Promise.all(
        ctx.integrations.map(async (integration) => {
          const channel = createItemAndIntegrationChannel<CpuLoad[]>("hardwareUsage", integration.id);
          const data = await channel.getAsync();
          return {
            integrationId: integration.id,
            sessions: data?.data ?? [],
          };
        }),
      );
    })
});
