import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import { createIntegrationAsync, mockWidgetData } from "@homarr/integrations";
import {
  umamiActiveVisitorsRequestHandler,
  umamiEventNamesRequestHandler,
  umamiMultiEventRequestHandler,
  umamiRequestHandler,
  umamiTopPagesRequestHandler,
  umamiTopReferrersRequestHandler,
} from "@homarr/request-handler/umami";

import { createManyIntegrationMiddleware, createOneIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const logger = createLogger({ module: "umami-router" });

export const umamiRouter = createTRPCRouter({
  getWebsites: publicProcedure
    .concat(createOneIntegrationMiddleware("query", "umami", "mock"))
    .query(async ({ ctx }) => {
      if (ctx.integration.kind === "mock") return mockWidgetData.umamiWebsites;
      try {
        const instance = await createIntegrationAsync({ ...ctx.integration, kind: "umami" });
        return await instance.getWebsitesAsync();
      } catch (error) {
        logger.warn(new Error("Failed to load websites", { cause: error }));
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
    .concat(createManyIntegrationMiddleware("query", "umami", "mock"))
    .query(async ({ ctx, input }) => {
      return await settleIntegrationQueries(ctx.integrations, async (integration) => {
        if (integration.kind === "mock") {
          return {
            integrationId: integration.id,
            integrationName: integration.name,
            integrationUrl: integration.url,
            visitorStats: { ...mockWidgetData.umamiVisitorStats, timeFrame: input.timeFrame },
            updatedAt: new Date(mockWidgetData.timestamp),
          };
        }
        const innerHandler = umamiRequestHandler.handler(
          { ...integration, kind: "umami" },
          {
            websiteId: input.websiteId,
            timeFrame: input.timeFrame,
            eventName: input.eventName,
          },
        );
        const { data, timestamp } = await innerHandler.getDataAsync();

        return {
          integrationId: integration.id,
          integrationName: integration.name,
          integrationUrl: integration.url,
          visitorStats: data,
          updatedAt: timestamp,
        };
      });
    }),

  getEventNames: publicProcedure
    .input(z.object({ websiteId: z.string() }))
    .concat(createOneIntegrationMiddleware("query", "umami", "mock"))
    .query(async ({ ctx, input }) => {
      if (ctx.integration.kind === "mock") return mockWidgetData.umamiEventNames;
      try {
        const innerHandler = umamiEventNamesRequestHandler.handler(
          { ...ctx.integration, kind: "umami" },
          {
            websiteId: input.websiteId,
          },
        );
        const { data } = await innerHandler.getDataAsync();
        return data;
      } catch (error) {
        logger.warn(
          new ErrorWithMetadata("Failed to load event names", { websiteId: input.websiteId }, { cause: error }),
        );
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
    .concat(createOneIntegrationMiddleware("query", "umami", "mock"))
    .query(async ({ ctx, input }) => {
      if (ctx.integration.kind === "mock") return mockWidgetData.umamiTopPages.slice(0, input.limit);
      try {
        const innerHandler = umamiTopPagesRequestHandler.handler(
          { ...ctx.integration, kind: "umami" },
          {
            websiteId: input.websiteId,
            timeFrame: input.timeFrame,
            limit: input.limit,
          },
        );
        const { data } = await innerHandler.getDataAsync();
        return data;
      } catch (error) {
        logger.warn(
          new ErrorWithMetadata(
            "Failed to load top pages",
            { websiteId: input.websiteId, timeFrame: input.timeFrame, limit: input.limit },
            { cause: error },
          ),
        );
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
    .concat(createOneIntegrationMiddleware("query", "umami", "mock"))
    .query(async ({ ctx, input }) => {
      if (ctx.integration.kind === "mock") return mockWidgetData.umamiTopReferrers.slice(0, input.limit);
      try {
        const innerHandler = umamiTopReferrersRequestHandler.handler(
          { ...ctx.integration, kind: "umami" },
          {
            websiteId: input.websiteId,
            timeFrame: input.timeFrame,
            limit: input.limit,
          },
        );
        const { data } = await innerHandler.getDataAsync();
        return data;
      } catch (error) {
        logger.warn(
          new ErrorWithMetadata(
            "Failed to load top referrers",
            { websiteId: input.websiteId, timeFrame: input.timeFrame, limit: input.limit },
            { cause: error },
          ),
        );
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
    .concat(createOneIntegrationMiddleware("query", "umami", "mock"))
    .query(async ({ ctx, input }) => {
      if (ctx.integration.kind === "mock") {
        return mockWidgetData.umamiEventSeries.filter((series) => input.eventNames.includes(series.eventName));
      }
      try {
        const sortedNames = [...input.eventNames].toSorted();
        const innerHandler = umamiMultiEventRequestHandler.handler(
          { ...ctx.integration, kind: "umami" },
          {
            websiteId: input.websiteId,
            timeFrame: input.timeFrame,
            eventNames: sortedNames,
          },
        );
        const { data } = await innerHandler.getDataAsync();
        return data;
      } catch (error) {
        logger.warn(
          new ErrorWithMetadata(
            "Failed to load multi-event time series",
            { websiteId: input.websiteId, timeFrame: input.timeFrame, eventNames: JSON.stringify(input.eventNames) },
            { cause: error },
          ),
        );
        return [];
      }
    }),

  getActiveVisitors: publicProcedure
    .input(z.object({ websiteId: z.string() }))
    .concat(createOneIntegrationMiddleware("query", "umami", "mock"))
    .query(async ({ ctx, input }) => {
      if (ctx.integration.kind === "mock") return 7;
      try {
        const innerHandler = umamiActiveVisitorsRequestHandler.handler(
          { ...ctx.integration, kind: "umami" },
          {
            websiteId: input.websiteId,
          },
        );
        const { data } = await innerHandler.getDataAsync();
        return data;
      } catch (error) {
        logger.warn(
          new ErrorWithMetadata("Failed to load active visitors", { websiteId: input.websiteId }, { cause: error }),
        );
        return 0;
      }
    }),
});
