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
  getWebsites: publicProcedure
    .input(z.object({ integrationId: z.string() }))
    .concat(createOneIntegrationMiddleware("query", "umami"))
    .query(async ({ ctx }) => {
      try {
        const instance = await createIntegrationAsync(ctx.integration);
        return await instance.getWebsitesAsync();
      } catch (e) {
        logger.warn("umami: getWebsites failed", { error: e });
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
    .input(z.object({ integrationId: z.string(), websiteId: z.string() }))
    .concat(createOneIntegrationMiddleware("query", "umami"))
    .query(async ({ ctx, input }) => {
      try {
        const innerHandler = umamiEventNamesRequestHandler.handler(ctx.integration, { websiteId: input.websiteId });
        const { data } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
        return data;
      } catch (e) {
        logger.warn("umami: getEventNames failed", { error: e });
        return [];
      }
    }),

  getTopPages: publicProcedure
    .input(
      z.object({
        integrationId: z.string(),
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
        logger.warn("umami: getTopPages failed", { error: e });
        return [];
      }
    }),

  getTopReferrers: publicProcedure
    .input(
      z.object({
        integrationId: z.string(),
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
        logger.warn("umami: getTopReferrers failed", { error: e });
        return [];
      }
    }),

  getMultiEventTimeSeries: publicProcedure
    .input(
      z.object({
        integrationId: z.string(),
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
        logger.warn("umami: getMultiEventTimeSeries failed", { error: e });
        return [];
      }
    }),

  getActiveVisitors: publicProcedure
    .input(z.object({ integrationId: z.string(), websiteId: z.string() }))
    .concat(createOneIntegrationMiddleware("query", "umami"))
    .query(async ({ ctx, input }) => {
      try {
        const innerHandler = umamiActiveVisitorsRequestHandler.handler(ctx.integration, {
          websiteId: input.websiteId,
        });
        const { data } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
        return data;
      } catch (e) {
        logger.warn("umami: getActiveVisitors failed", { error: e });
        return 0;
      }
    }),
});
