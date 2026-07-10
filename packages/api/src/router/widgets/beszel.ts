import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { createIntegrationAsync } from "@homarr/integrations";
import type { LiveStatsEvent } from "@homarr/integrations/types";
import {
  beszelAlertsRequestHandler,
  beszelStatsRequestHandler,
  beszelSystemsRequestHandler,
} from "@homarr/request-handler/beszel";

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
          const { data, timestamp } = await innerHandler.getDataAsync();
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
          const [alertsSettled, systemsSettled] = await Promise.allSettled([
            alertsHandler.getDataAsync(),
            systemsHandler.getDataAsync(),
          ]);
          if (alertsSettled.status === "rejected") throw alertsSettled.reason;
          const alertsResult = alertsSettled.value;
          const systemNameMap: Record<string, string> = {};
          if (systemsSettled.status === "fulfilled") {
            for (const system of systemsSettled.value.data) {
              systemNameMap[system.id] = system.name;
            }
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
        const { data, timestamp } = await innerHandler.getDataAsync();
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
      return observable<LiveStatsEvent>((emit) => {
        const controller = new AbortController();
        let isActive = true;

        void (async () => {
          const integration = ctx.integrations[0];
          if (!integration) {
            emit.error(
              new TRPCError({ code: "BAD_REQUEST", message: "At least one Beszel integrationId is required" }),
            );
            return;
          }

          try {
            const instance = await createIntegrationAsync(integration);
            if (typeof instance.subscribeRealtimeMetrics === "function") {
              await instance.subscribeRealtimeMetrics(
                input.systemId,
                (event) => {
                  if (isActive) emit.next(event);
                },
                controller.signal,
              );
            } else {
              emit.error(
                new TRPCError({
                  code: "METHOD_NOT_SUPPORTED",
                  message: `Integration ${integration.kind} does not support realtime metrics`,
                }),
              );
            }
          } catch (error) {
            if (isActive) {
              emit.error(
                error instanceof TRPCError
                  ? error
                  : new TRPCError({
                      code: "INTERNAL_SERVER_ERROR",
                      message: error instanceof Error ? error.message : String(error),
                    }),
              );
            }
          }

          if (isActive) {
            emit.complete();
          }
        })();

        return () => {
          isActive = false;
          controller.abort();
        };
      });
    }),
});
