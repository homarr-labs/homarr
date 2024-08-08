import {createTRPCRouter, publicProcedure} from "../../trpc";
import { createOneIntegrationMiddleware} from "../../middlewares/integration";
import {createItemAndIntegrationChannel} from "@homarr/redis";
import type {CpuLoad, MemoryLoad, NetworkLoad} from "@homarr/integrations";
import { observable } from "@trpc/server/observable";

export const hardwareUsageRouter = createTRPCRouter({
  getHardwareInformationHistory: publicProcedure
    .unstable_concat(createOneIntegrationMiddleware("query", "getDashDot"))
    .query(async ({ctx}) => {
      const channel = createItemAndIntegrationChannel<{ cpuLoad: CpuLoad, memoryLoad: MemoryLoad, networkLoad: NetworkLoad }>("hardwareUsage", ctx.integration.id);
      const data = await channel.getAsync();
      return {
        cpuLoad: data?.data.cpuLoad ?? {},
        memoryLoad: data?.data.memoryLoad ?? {},
        networkLoad: data?.data.networkLoad ?? {},
      };
    }),
  subscribeCpu: publicProcedure
    .unstable_concat(createOneIntegrationMiddleware("query", "getDashDot"))
    .subscription(({ ctx }) => {
      return observable<{ cpuLoad: CpuLoad, memoryLoad: MemoryLoad, networkLoad: NetworkLoad }>((emit) => {
        const channel = createItemAndIntegrationChannel<{ cpuLoad: CpuLoad, memoryLoad: MemoryLoad, networkLoad: NetworkLoad }>("hardwareUsage", ctx.integration.id);
        const unsubscribe = channel.subscribe((data) => {
          emit.next(data);
        });
        return () => {
          unsubscribe();
        }
      })
    })
});
