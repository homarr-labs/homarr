import { observable } from "@trpc/server/observable";
import { z } from "zod/v4";

import { createIntegrationAsync } from "@homarr/integrations";
import type { BeszelContainerStatsRecord, BeszelSystemStatsRecord } from "@homarr/integrations/types";
import {
  beszelAlertsRequestHandler,
  beszelStatsRequestHandler,
  beszelSystemsRequestHandler,
} from "@homarr/request-handler/beszel";
import type { BeszelAlertsData, BeszelSystemRow } from "@homarr/request-handler/beszel";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const beszelRouter = createTRPCRouter({
  getSystems: publicProcedure
    .concat(createManyIntegrationMiddleware("query", "beszel", "mock"))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = beszelSystemsRequestHandler.handler(integration, {});
          const { data, timestamp } = await innerHandler.getCachedOrUpdatedDataAsync({
            forceUpdate: false,
          });
          return {
            integrationId: integration.id,
            integrationName: integration.name,
            integrationUrl: integration.url,
            systems: data,
            updatedAt: timestamp,
          };
        }),
      );
      return results;
    }),

  subscribeSystems: publicProcedure
    .concat(createManyIntegrationMiddleware("query", "beszel", "mock"))
    .subscription(({ ctx }) => {
      return observable<{
        integrationId: string;
        systems: BeszelSystemRow[];
        timestamp: Date;
      }>((emit) => {
        const unsubscribes = ctx.integrations.map((integration) => {
          const innerHandler = beszelSystemsRequestHandler.handler(integration, {});
          return innerHandler.subscribe((systems) => {
            emit.next({
              integrationId: integration.id,
              systems,
              timestamp: new Date(),
            });
          });
        });
        return () => {
          unsubscribes.forEach((fn) => fn());
        };
      });
    }),

  getAlerts: publicProcedure
    .concat(createManyIntegrationMiddleware("query", "beszel", "mock"))
    .input(
      z.object({
        includeHistory: z.boolean().default(true),
        maxHistoryItems: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const alertsHandler = beszelAlertsRequestHandler.handler(integration, {
            includeHistory: input.includeHistory,
            maxHistoryItems: input.maxHistoryItems,
          });
          const systemsHandler = beszelSystemsRequestHandler.handler(integration, {});
          const [alertsResult, systemsResult] = await Promise.all([
            alertsHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false }),
            systemsHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false }),
          ]);
          const systemNameMap: Record<string, string> = {};
          for (const system of systemsResult.data) {
            systemNameMap[system.id] = system.name;
          }
          return {
            integrationId: integration.id,
            alerts: alertsResult.data.alerts,
            history: alertsResult.data.history,
            systemNameMap,
            updatedAt: alertsResult.timestamp,
          };
        }),
      );
      return results;
    }),

  subscribeAlerts: publicProcedure
    .concat(createManyIntegrationMiddleware("query", "beszel", "mock"))
    .input(
      z.object({
        includeHistory: z.boolean().default(true),
        maxHistoryItems: z.number().min(1).max(100).default(10),
      }),
    )
    .subscription(({ ctx, input }) => {
      return observable<{
        integrationId: string;
        alerts: BeszelAlertsData;
        timestamp: Date;
      }>((emit) => {
        const unsubscribes = ctx.integrations.map((integration) => {
          const innerHandler = beszelAlertsRequestHandler.handler(integration, {
            includeHistory: input.includeHistory,
            maxHistoryItems: input.maxHistoryItems,
          });
          return innerHandler.subscribe((data) => {
            emit.next({
              integrationId: integration.id,
              alerts: data,
              timestamp: new Date(),
            });
          });
        });
        return () => {
          unsubscribes.forEach((fn) => fn());
        };
      });
    }),

  getSystemStats: publicProcedure
    .concat(createManyIntegrationMiddleware("query", "beszel", "mock"))
    .input(
      z.object({
        systemId: z.string(),
        timePeriod: z.enum(["1m", "1h", "12h", "24h", "1w", "30d"]),
        includeDocker: z.boolean().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      const integration = ctx.integrations[0];
      if (!integration) return null;
      const innerHandler = beszelStatsRequestHandler.handler(integration, {
        systemId: input.systemId,
        timePeriod: input.timePeriod,
        includeDocker: input.includeDocker,
      });
      const { data, timestamp } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
      return { integrationId: integration.id, ...data, updatedAt: timestamp };
    }),

  subscribeSystemStats: publicProcedure
    .concat(createManyIntegrationMiddleware("query", "beszel", "mock"))
    .input(
      z.object({
        systemId: z.string(),
      }),
    )
    .subscription(({ ctx, input }) => {
      return observable<{
        stats: BeszelSystemStatsRecord;
        containerStats: BeszelContainerStatsRecord | null;
      }>((emit) => {
        const integration = ctx.integrations[0];
        if (!integration) {
          emit.error(new Error("No Beszel integration configured"));
          return () => {};
        }

        const abortController = new AbortController();

        void (async () => {
          try {
            const instance = await createIntegrationAsync(integration);
            await instance.subscribeRealtimeMetrics(input.systemId, (data) => emit.next(data), abortController.signal);
          } catch (error) {
            if (!abortController.signal.aborted) {
              emit.error(error instanceof Error ? error : new Error(String(error)));
            }
          }
        })();

        return () => {
          abortController.abort();
        };
      });
    }),
});
