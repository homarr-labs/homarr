import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { LiveStatsEvent } from "@homarr/integrations/types";
import {
  beszelAlertsRequestHandler,
  beszelStatsRequestHandler,
  beszelSystemsRequestHandler,
} from "@homarr/request-handler/beszel";

import { settleIntegrationQueries, toPublicIntegrationError } from "../../settle-integrations";
import {
  createManySharedWidgetIntegrationMiddleware,
  createManyWidgetIntegrationMiddleware,
} from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import { BoundedAsyncQueue } from "./bounded-async-queue";

const logger = createLogger({ module: "beszelRouter" });
const MAX_PENDING_LIVE_EVENTS = 4;

export const beszelRouter = createTRPCRouter({
  getSystems: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get all Beszel-monitored systems with CPU, memory, disk, GPU, network, temperature, and status. REQUIRED: integrationIds (array of Beszel integration IDs from integration_all)",
      },
    })
    .concat(
      createManySharedWidgetIntegrationMiddleware("query", "beszelSystemGrid", [
        "beszelSystemTable",
        "beszelSystemStats",
      ]),
    )
    .query(async ({ ctx }) => {
      const integrationIds = ctx.integrations.map((i) => i.id);
      logger.debug("getSystems called", { userId: ctx.session?.user?.id, integrationIds });
      const results = await settleIntegrationQueries(
        ctx.integrations,
        async (integration) => {
          const innerHandler = beszelSystemsRequestHandler.handler(integration, {});
          const { data, timestamp } = await innerHandler.getDataAsync();
          return {
            integrationId: integration.id,
            integrationName: integration.name,
            systems: data,
            updatedAt: timestamp,
          };
        },
        {
          fallback: (integration, error) => ({
            integrationId: integration.id,
            integrationName: integration.name,
            systems: [],
            updatedAt: new Date(0),
            error: toPublicIntegrationError(error),
          }),
          throwOnAllFailures: true,
        },
      );
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
    .concat(createManyWidgetIntegrationMiddleware("query", "beszelAlerts"))
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
      const results = await settleIntegrationQueries(
        ctx.integrations,
        async (integration) => {
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
        },
        {
          fallback: (integration, error) => ({
            integrationId: integration.id,
            integrationName: integration.name,
            alerts: [],
            history: [],
            systemNameMap: {},
            updatedAt: new Date(0),
            error: toPublicIntegrationError(error),
          }),
          throwOnAllFailures: true,
        },
      );
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
    .concat(
      createManySharedWidgetIntegrationMiddleware("query", "beszelSystemStats", [
        "beszelSystemTable",
        "beszelSystemGrid",
      ]),
    )
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
          error: toPublicIntegrationError(error),
        };
      }
    }),

  subscribeSystemStats: publicProcedure
    .concat(
      createManySharedWidgetIntegrationMiddleware("query", "beszelSystemStats", [
        "beszelSystemTable",
        "beszelSystemGrid",
      ]),
    )
    .input(
      z.object({
        systemId: z.string(),
      }),
    )
    .subscription(async function* ({ ctx, input, signal }) {
      const integration = ctx.integrations[0];
      if (!integration) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "At least one Beszel integrationId is required" });
      }

      const queue = new BoundedAsyncQueue<LiveStatsEvent>(MAX_PENDING_LIVE_EVENTS);
      const controller = new AbortController();
      let emittedEventCount = 0;

      const stop = () => {
        controller.abort();
        void queue.return();
      };
      if (signal?.aborted) return;
      signal?.addEventListener("abort", stop, { once: true });

      logger.debug("Beszel realtime subscription started", {
        userId: ctx.session?.user?.id,
        integrationIds: ctx.integrations.map((candidate) => candidate.id),
        systemId: input.systemId,
      });

      try {
        const instance = await createIntegrationAsync(integration);
        if (controller.signal.aborted) return;
        void (async () => {
          try {
            if (typeof instance.subscribeRealtimeMetrics !== "function") {
              throw new TRPCError({
                code: "METHOD_NOT_SUPPORTED",
                message: `Integration ${integration.kind} does not support realtime metrics`,
              });
            }

            await instance.subscribeRealtimeMetrics(
              input.systemId,
              (event) => {
                emittedEventCount += 1;
                if (emittedEventCount <= 2 || emittedEventCount % 60 === 0) {
                  logger.debug("Forwarding Beszel realtime events", {
                    userId: ctx.session?.user?.id,
                    integrationId: integration.id,
                    systemId: input.systemId,
                    eventType: event.type,
                    emittedEventCount,
                    statsCount: Array.isArray(event.record.stats) ? event.record.stats.length : undefined,
                  });
                }
                queue.push(event);
              },
              controller.signal,
            );
            queue.close();
          } catch (error) {
            if (controller.signal.aborted) {
              queue.close();
              return;
            }

            logger.warn("Beszel realtime subscription failed", {
              userId: ctx.session?.user?.id,
              integrationId: integration.id,
              systemId: input.systemId,
              emittedEventCount,
              error,
            });
            queue.fail(
              new TRPCError({
                code: "BAD_GATEWAY",
                message: "Live integration request failed",
                cause: error,
              }),
            );
          }
        })();

        for await (const event of queue) yield event;
      } finally {
        stop();
        signal?.removeEventListener("abort", stop);
        logger.debug("Beszel realtime subscription stopped", {
          userId: ctx.session?.user?.id,
          integrationId: integration.id,
          systemId: input.systemId,
          emittedEventCount,
        });
      }
    }),
});
