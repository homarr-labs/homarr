import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
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

const logger = createLogger({ module: "beszelRouter" });

export const beszelRouter = createTRPCRouter({
  getSystems: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get all Beszel-monitored systems with CPU, memory, disk, GPU, network, temperature, and status. REQUIRED: integrationIds (array of Beszel integration IDs from integration_all)",
      },
    })
    .concat(createManyIntegrationMiddleware("query", "beszel", "mock"))
    .query(async ({ ctx }) => {
      const integrationIds = ctx.integrations.map((i) => i.id);
      logger.debug("getSystems called", { userId: ctx.session?.user?.id, integrationIds });
      const settled = await Promise.allSettled(
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
      const results = settled.map((result, index) => {
        if (result.status === "fulfilled") return result.value;
        const integration = ctx.integrations[index];
        logger.warn("getSystems integration failed", {
          userId: ctx.session?.user?.id,
          integrationId: integration?.id,
          error: result.reason,
        });
        return {
          integrationId: integration?.id ?? "unknown",
          integrationName: integration?.name ?? "unknown",
          integrationUrl: integration?.url ?? "",
          systems: [],
          updatedAt: new Date(0),
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        };
      });
      logger.debug("getSystems completed", {
        userId: ctx.session?.user?.id,
        integrationIds,
        resultCount: results.length,
        errorCount: results.filter((r) => "error" in r).length,
      });
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
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get Beszel alerts and optional alert history for all monitored systems. REQUIRED: integrationIds (array of Beszel integration IDs from integration_all). OPTIONAL: includeHistory (default true), maxHistoryItems (default 10)",
      },
    })
    .concat(createManyIntegrationMiddleware("query", "beszel", "mock"))
    .input(
      z.object({
        includeHistory: z.boolean().default(true),
        maxHistoryItems: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const integrationIds = ctx.integrations.map((i) => i.id);
      logger.debug("getAlerts called", {
        userId: ctx.session?.user?.id,
        integrationIds,
        includeHistory: input.includeHistory,
        maxHistoryItems: input.maxHistoryItems,
      });
      const settled = await Promise.allSettled(
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
            integrationName: integration.name,
            alerts: alertsResult.data.alerts,
            history: alertsResult.data.history,
            systemNameMap,
            updatedAt: alertsResult.timestamp,
          };
        }),
      );
      const results = settled.map((result, index) => {
        if (result.status === "fulfilled") return result.value;
        const integration = ctx.integrations[index];
        logger.warn("getAlerts integration failed", {
          userId: ctx.session?.user?.id,
          integrationId: integration?.id,
          error: result.reason,
        });
        return {
          integrationId: integration?.id ?? "unknown",
          integrationName: integration?.name ?? "unknown",
          alerts: [],
          history: [],
          systemNameMap: {},
          updatedAt: new Date(0),
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        };
      });
      logger.debug("getAlerts completed", {
        userId: ctx.session?.user?.id,
        integrationIds,
        resultCount: results.length,
        errorCount: results.filter((r) => "error" in r).length,
      });
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
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get historical Beszel system metrics (CPU, memory, disk, network, temperature) and optional Docker container stats. REQUIRED: integrationIds (pass the single integrationId from the beszel_getSystems entry containing the target system — only the first ID is used), systemId (from beszel_getSystems). OPTIONAL: timePeriod (1m/1h/12h/24h/1w/30d, default 1h), includeDocker (default true)",
      },
    })
    .concat(createManyIntegrationMiddleware("query", "beszel", "mock"))
    .input(
      z.object({
        systemId: z.string(),
        timePeriod: z.enum(["1m", "1h", "12h", "24h", "1w", "30d"]).default("1h"),
        includeDocker: z.boolean().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      const integration = ctx.integrations[0];
      if (!integration) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "At least one Beszel integrationId is required" });
      }
      logger.debug("getSystemStats called", {
        userId: ctx.session?.user?.id,
        integrationId: integration.id,
        systemId: input.systemId,
        timePeriod: input.timePeriod,
        includeDocker: input.includeDocker,
      });
      try {
        const innerHandler = beszelStatsRequestHandler.handler(integration, {
          systemId: input.systemId,
          timePeriod: input.timePeriod,
          includeDocker: input.includeDocker,
        });
        const { data, timestamp } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
        logger.debug("getSystemStats completed", {
          userId: ctx.session?.user?.id,
          integrationId: integration.id,
          systemId: input.systemId,
        });
        return { integrationId: integration.id, ...data, updatedAt: timestamp };
      } catch (error) {
        logger.warn("getSystemStats failed", {
          userId: ctx.session?.user?.id,
          integrationId: integration.id,
          systemId: input.systemId,
          error,
        });
        return {
          integrationId: integration.id,
          systemStats: [],
          containerStats: [],
          updatedAt: new Date(0),
          error: error instanceof Error ? error.message : String(error),
        };
      }
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
        logger.debug("subscribeSystemStats opened", {
          userId: ctx.session?.user?.id,
          integrationId: integration.id,
          systemId: input.systemId,
        });

        const abortController = new AbortController();

        void (async () => {
          try {
            const instance = await createIntegrationAsync(integration);
            await instance.subscribeRealtimeMetrics(input.systemId, (data) => emit.next(data), abortController.signal);
          } catch (error) {
            if (!abortController.signal.aborted) {
              logger.warn("subscribeSystemStats error", {
                userId: ctx.session?.user?.id,
                integrationId: integration.id,
                systemId: input.systemId,
                error,
              });
              if (error instanceof Error) {
                emit.error(error);
              } else {
                emit.error(new Error(String(error)));
              }
            }
          }
        })();

        return () => {
          abortController.abort();
          logger.debug("subscribeSystemStats closed", {
            userId: ctx.session?.user?.id,
            integrationId: integration.id,
            systemId: input.systemId,
          });
        };
      });
    }),
});
