import { observable } from "@trpc/server/observable";

import type { CpuLoad, MemoryLoad, NetworkLoad, ServerInfo } from "@homarr/integrations";
import { createItemAndIntegrationChannel } from "@homarr/redis";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const hardwareUsageRouter = createTRPCRouter({
  getServerInfo: publicProcedure
    .unstable_concat(createOneIntegrationMiddleware("query", "getDashDot"))
    .query(async ({ ctx }) => {
      const channel = createItemAndIntegrationChannel<{
        info: ServerInfo;
      }>("hardwareUsage", ctx.integration.id);
      const data = await channel.getAsync();
      return {
        info: data?.data.info ?? ({} as ServerInfo),
      };
    }),
  getHardwareInformationHistory: publicProcedure
    .unstable_concat(createOneIntegrationMiddleware("query", "getDashDot"))
    .query(async ({ ctx }) => {
      const channel = createItemAndIntegrationChannel<{
        cpuLoad: CpuLoad;
        memoryLoad: MemoryLoad;
        networkLoad: NetworkLoad;
      }>("hardwareUsage", ctx.integration.id);
      const data = await channel.getAsync();
      return {
        cpuLoad: data?.data.cpuLoad ?? ({} as CpuLoad),
        memoryLoad: data?.data.memoryLoad ?? ({} as MemoryLoad),
        networkLoad: data?.data.networkLoad ?? ({} as NetworkLoad),
      };
    }),
  subscribeCpu: publicProcedure
    .unstable_concat(createOneIntegrationMiddleware("query", "getDashDot"))
    .subscription(({ ctx }) => {
      return observable<{ cpuLoad: CpuLoad; memoryLoad: MemoryLoad; networkLoad: NetworkLoad }>((emit) => {
        const channel = createItemAndIntegrationChannel<{
          cpuLoad: CpuLoad;
          memoryLoad: MemoryLoad;
          networkLoad: NetworkLoad;
        }>("hardwareUsage", ctx.integration.id);
        const unsubscribe = channel.subscribe((data) => {
          emit.next(data);
        });
        return () => {
          unsubscribe();
        };
      });
    }),
});
