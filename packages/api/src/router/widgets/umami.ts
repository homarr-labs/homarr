import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
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
import { settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const logger = createLogger({ module: "umami-router" });

export const umamiRouter = createTRPCRouter({
  getWebsites: publicProcedure.concat(createOneIntegrationMiddleware("query", "umami")).query(async ({ ctx }) => {
    try {
      const instance = await createIntegrationAsync(ctx.integration);
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
    .concat(createManyIntegrationMiddleware("query", "umami"))
    .query(async ({ ctx, input }) => {
      return await settleIntegrationQueries(ctx.integrations, async (integration) => {
        const innerHandler = umamiRequestHandler.handler(integration, {
          websiteId: input.websiteId,
          timeFrame: input.timeFrame,
          eventName: input.eventName,
        });
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
    .concat(createOneIntegrationMiddleware("query", "umami"))
    .query(async ({ ctx, input }) => {
      try {
        const innerHandler = umamiEventNamesRequestHandler.handler(ctx.integration, { websiteId: input.websiteId });
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
    .concat(createOneIntegrationMiddleware("query", "umami"))
    .query(async ({ ctx, input }) => {
      try {
        const innerHandler = umamiTopPagesRequestHandler.handler(ctx.integration, {
          websiteId: input.websiteId,
          timeFrame: input.timeFrame,
          limit: input.limit,
        });
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
    .concat(createOneIntegrationMiddleware("query", "umami"))
    .query(async ({ ctx, input }) => {
      try {
        const innerHandler = umamiTopReferrersRequestHandler.handler(ctx.integration, {
          websiteId: input.websiteId,
          timeFrame: input.timeFrame,
          limit: input.limit,
        });
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
    .concat(createOneIntegrationMiddleware("query", "umami"))
    .query(async ({ ctx, input }) => {
      try {
        const sortedNames = [...input.eventNames].toSorted();
        const innerHandler = umamiMultiEventRequestHandler.handler(ctx.integration, {
          websiteId: input.websiteId,
          timeFrame: input.timeFrame,
          eventNames: sortedNames,
        });
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
    .concat(createOneIntegrationMiddleware("query", "umami"))
    .query(async ({ ctx, input }) => {
      try {
        const innerHandler = umamiActiveVisitorsRequestHandler.handler(ctx.integration, {
          websiteId: input.websiteId,
        });
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
