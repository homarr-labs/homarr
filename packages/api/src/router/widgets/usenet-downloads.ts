import {createTRPCRouter, publicProcedure} from "../../trpc";
import {createManyIntegrationMiddleware} from "../../middlewares/integration";
import {createItemAndIntegrationChannel} from "@homarr/redis";
import type { UsenetQueueItem} from "@homarr/integrations";
import {NzbGetIntegration, SabnzbdIntegration} from "@homarr/integrations";
import {observable} from "@trpc/server/observable";
import {TRPCError} from "@trpc/server";

export const usenetDownloadsRouter = createTRPCRouter({
  getQueue: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("query", "sabNzbd", "nzbGet"))
    .query(async ({ctx}) => {
      return await Promise.all(ctx.integrations.map(async (integration) => {
        const channel = createItemAndIntegrationChannel<UsenetQueueItem[]>("usenet-downloads", integration.id);
        const data = await channel.getAsync();
        return {
          integrationId: integration.id,
          queue: data?.data ?? []
        }
      }))
    }),
  subscribeToQueue: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("query", "sabNzbd", "nzbGet"))
    .subscription(({ctx}) => {
      return observable<{ integrationId: string; data: UsenetQueueItem[] }>((emit) => {
        const unsubscribes: (() => void)[] = [];
        for (const integration of ctx.integrations) {
          const channel = createItemAndIntegrationChannel<UsenetQueueItem[]>("usenet-downloads", integration.id);
          const unsubscribe = channel.subscribe((sessions) => {
            emit.next({
              integrationId: integration.id,
              data: sessions,
            });
          });
          unsubscribes.push(unsubscribe);
        }
        return () => {
          unsubscribes.forEach((unsubscribe) => {
            unsubscribe();
          });
        };
      });
    }),
  resume: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("interact", "sabNzbd", "nzbGet"))
    .mutation(async ({ctx}) => {
      await Promise.all(ctx.integrations.map(async (integration) => {
        switch (integration.kind) {
          case "sabNzbd":
            await new SabnzbdIntegration(integration).resumeQueueAsync();
            break;
          case "nzbGet":
            await new NzbGetIntegration(integration).resumeQueueAsync();
            break;
          default:
            throw new TRPCError({
              code: 'BAD_REQUEST'
            })
        }
      }));
    }),
  pause: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("interact", "sabNzbd", "nzbGet"))
    .mutation(async ({ctx}) => {
      await Promise.all(ctx.integrations.map(async (integration) => {
        switch (integration.kind) {
          case "sabNzbd":
            await new SabnzbdIntegration(integration).pauseQueueAsync();
            break;
          case "nzbGet":
            await new NzbGetIntegration().pauseQueueAsync();
            break;
          default:
            throw new TRPCError({
              code: 'BAD_REQUEST'
            })
        }
      }));
    })
});
