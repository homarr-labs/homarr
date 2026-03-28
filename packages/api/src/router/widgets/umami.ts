import { z } from "zod/v4";

import { createIntegrationAsync } from "@homarr/integrations";
import {
  umamiActiveVisitorsRequestHandler,
  umamiEventNamesRequestHandler,
  umamiMultiEventRequestHandler,
  umamiRequestHandler,
  umamiTopPagesRequestHandler,
  umamiTopReferrersRequestHandler,
} from "@homarr/request-handler/umami";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const umamiRouter = createTRPCRouter({
  getWebsites: publicProcedure
    .input(z.object({ integrationIds: z.array(z.string()) }))
    .concat(createManyIntegrationMiddleware("query", "umami"))
    .query(async ({ ctx }) => {
      const integration = ctx.integrations[0];
      if (!integration) return [];
      try {
        const instance = await createIntegrationAsync(integration);
        return await instance.getWebsitesAsync();
      } catch {
        return [];
      }
    }),

  getVisitorStats: publicProcedure
    .input(
      z.object({
        integrationIds: z.array(z.string()),
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
    .input(z.object({ integrationIds: z.array(z.string()), websiteId: z.string() }))
    .concat(createManyIntegrationMiddleware("query", "umami"))
    .query(async ({ ctx, input }) => {
      const integration = ctx.integrations[0];
      if (!integration) return [];

      try {
        const innerHandler = umamiEventNamesRequestHandler.handler(integration, { websiteId: input.websiteId });
        const { data } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
        return data;
      } catch {
        return [];
      }
    }),

  getTopPages: publicProcedure
    .input(
      z.object({
        integrationIds: z.array(z.string()),
        websiteId: z.string(),
        timeFrame: z.string(),
        limit: z.number().int().min(1).max(500),
      }),
    )
    .concat(createManyIntegrationMiddleware("query", "umami"))
    .query(async ({ ctx, input }) => {
      const integration = ctx.integrations[0];
      if (!integration) return [];
      try {
        const innerHandler = umamiTopPagesRequestHandler.handler(integration, {
          websiteId: input.websiteId,
          timeFrame: input.timeFrame,
          limit: input.limit,
        });
        const { data } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
        return data;
      } catch {
        return [];
      }
    }),

  getTopReferrers: publicProcedure
    .input(
      z.object({
        integrationIds: z.array(z.string()),
        websiteId: z.string(),
        timeFrame: z.string(),
        limit: z.number().int().min(1).max(500),
      }),
    )
    .concat(createManyIntegrationMiddleware("query", "umami"))
    .query(async ({ ctx, input }) => {
      const integration = ctx.integrations[0];
      if (!integration) return [];
      try {
        const innerHandler = umamiTopReferrersRequestHandler.handler(integration, {
          websiteId: input.websiteId,
          timeFrame: input.timeFrame,
          limit: input.limit,
        });
        const { data } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
        return data;
      } catch {
        return [];
      }
    }),

  getMultiEventTimeSeries: publicProcedure
    .input(
      z.object({
        integrationIds: z.array(z.string()),
        websiteId: z.string(),
        timeFrame: z.string(),
        eventNames: z.array(z.string()),
      }),
    )
    .concat(createManyIntegrationMiddleware("query", "umami"))
    .query(async ({ ctx, input }) => {
      const integration = ctx.integrations[0];
      if (!integration) return [];
      try {
        const sortedNames = [...input.eventNames].sort();
        const innerHandler = umamiMultiEventRequestHandler.handler(integration, {
          websiteId: input.websiteId,
          timeFrame: input.timeFrame,
          eventNames: sortedNames,
        });
        const { data } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
        return data;
      } catch {
        return [];
      }
    }),

  getActiveVisitors: publicProcedure
    .input(z.object({ integrationIds: z.array(z.string()), websiteId: z.string() }))
    .concat(createManyIntegrationMiddleware("query", "umami"))
    .query(async ({ ctx, input }) => {
      const integration = ctx.integrations[0];
      if (!integration) return 0;

      try {
        const innerHandler = umamiActiveVisitorsRequestHandler.handler(integration, { websiteId: input.websiteId });
        const { data } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
        return data;
      } catch {
        return 0;
      }
    }),
});
