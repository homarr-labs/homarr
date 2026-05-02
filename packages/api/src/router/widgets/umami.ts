import { observable } from "@trpc/server/observable";
import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { createIntegrationAsync } from "@homarr/integrations";
import {
  umamiActiveVisitorsRequestHandler,
  umamiEventNamesRequestHandler,
  umamiMultiEventRequestHandler,
  umamiRequestHandler,
  umamiTopPagesRequestHandler,
  umamiTopReferrersRequestHandler,
} from "@homarr/request-handler/umami";

import { createManyIntegrationMiddleware, createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const logger = createLogger({ module: "umami-router" });

export const umamiRouter = createTRPCRouter({
  getWebsites: publicProcedure.concat(createOneIntegrationMiddleware("query", "umami")).query(async ({ ctx }) => {
    try {
      const instance = await createIntegrationAsync(ctx.integration);
      return await instance.getWebsitesAsync();
    } catch (e) {
      logger.warn("Failed to load websites", { error: e });
      return [];
    }
  }),

  getVisitorStats: publicProcedure
    .input(
      z.object({
        websiteId: z.string(),
        timeFrame: z.string(),
        eventName: z.string().optional(),
      }),
    )
    .concat(createManyIntegrationMiddleware("query", "umami"))
    .query(async ({ ctx, input }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = umamiRequestHandler.handler(integration, {
            websiteId: input.websiteId,
            timeFrame: input.timeFrame,
            eventName: input.eventName,
          });
          const { data, timestamp } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });

          return {
            integrationId: integration.id,
            integrationName: integration.name,
            integrationUrl: integration.url,
            visitorStats: data,
            updatedAt: timestamp,
          };
        }),
      );

      return results;
    }),

  getEventNames: publicProcedure
    .input(z.object({ websiteId: z.string() }))
    .concat(createOneIntegrationMiddleware("query", "umami"))
    .query(async ({ ctx, input }) => {
      try {
        const innerHandler = umamiEventNamesRequestHandler.handler(ctx.integration, { websiteId: input.websiteId });
        const { data } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
        return data;
      } catch (e) {
        logger.warn("Failed to load event names", { error: e });
        return [];
      }
    }),

  getTopPages: publicProcedure
    .input(
      z.object({
        websiteId: z.string(),
        timeFrame: z.string(),
        limit: z.number().int().min(1).max(500),
      }),
    )
    .concat(createOneIntegrationMiddleware("query", "umami"))
    .query(async ({ ctx, input }) => {
      try {
        const innerHandler = umamiTopPagesRequestHandler.handler(ctx.integration, {
          websiteId: input.websiteId,
          timeFrame: input.timeFrame,
          limit: input.limit,
        });
        const { data } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
        return data;
      } catch (e) {
        logger.warn("Failed to load top pages", { error: e });
        return [];
      }
    }),

  getTopReferrers: publicProcedure
    .input(
      z.object({
        websiteId: z.string(),
        timeFrame: z.string(),
        limit: z.number().int().min(1).max(500),
      }),
    )
    .concat(createOneIntegrationMiddleware("query", "umami"))
    .query(async ({ ctx, input }) => {
      try {
        const innerHandler = umamiTopReferrersRequestHandler.handler(ctx.integration, {
          websiteId: input.websiteId,
          timeFrame: input.timeFrame,
          limit: input.limit,
        });
        const { data } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
        return data;
      } catch (e) {
        logger.warn("Failed to load top referrers", { error: e });
        return [];
      }
    }),

  getMultiEventTimeSeries: publicProcedure
    .input(
      z.object({
        websiteId: z.string(),
        timeFrame: z.string(),
        eventNames: z.array(z.string()),
      }),
    )
    .concat(createOneIntegrationMiddleware("query", "umami"))
    .query(async ({ ctx, input }) => {
      try {
        const sortedNames = [...input.eventNames].sort();
        const innerHandler = umamiMultiEventRequestHandler.handler(ctx.integration, {
          websiteId: input.websiteId,
          timeFrame: input.timeFrame,
          eventNames: sortedNames,
        });
        const { data } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
        return data;
      } catch (e) {
        logger.warn("Failed to load multi-event time series", { error: e });
        return [];
      }
    }),

  getActiveVisitors: publicProcedure
    .input(z.object({ websiteId: z.string() }))
    .concat(createOneIntegrationMiddleware("query", "umami"))
    .query(async ({ ctx, input }) => {
      try {
        const innerHandler = umamiActiveVisitorsRequestHandler.handler(ctx.integration, {
          websiteId: input.websiteId,
        });
        const { data } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
        return data;
      } catch (e) {
        logger.warn("Failed to load active visitors", { error: e });
        return 0;
      }
    }),

  subscribeActiveVisitors: publicProcedure
    .input(z.object({ websiteId: z.string() }))
    .concat(createOneIntegrationMiddleware("query", "umami"))
    .subscription(({ ctx, input }) => {
      return observable<number>((emit) => {
        const innerHandler = umamiActiveVisitorsRequestHandler.handler(ctx.integration, {
          websiteId: input.websiteId,
        });
        const unsubscribe = innerHandler.subscribe((count) => {
          emit.next(count);
        });
        return () => {
          unsubscribe();
        };
      });
    }),
});
