import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createIntegrationAsync } from "@homarr/integrations/factory";
import { notificationsRequestHandler } from "@homarr/request-handler/notifications";

import { createManyWidgetIntegrationMiddleware, createOneIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries, toPublicIntegrationError } from "../../settle-integrations";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

export const notificationsRouter = createTRPCRouter({
  deleteNotification: protectedProcedure
    .concat(createOneIntegrationMiddleware("interact", "gotify", "homeAssistant"))
    .input(
      z.object({
        notificationId: z.string().min(1).max(512),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.integration.kind === "gotify" && !/^[1-9]\d{0,19}$/.test(input.notificationId)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid Gotify notification ID" });
      }
      const integration = await createIntegrationAsync(ctx.integration);
      await integration.deleteNotificationAsync(input.notificationId);
      await notificationsRequestHandler.invalidateCacheAsync([ctx.integration.id]);
    }),
  getNotifications: publicProcedure
    .unstable_concat(createManyWidgetIntegrationMiddleware("query", "notifications"))
    .input(z.object({ forceRefresh: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      return await settleIntegrationQueries(
        ctx.integrations,
        async (integration) => {
          const innerHandler = notificationsRequestHandler.handler(integration, {});
          const { data, timestamp } = await innerHandler.getDataAsync({
            maxAgeMs: input.forceRefresh ? 1000 : undefined,
          });

          return {
            integration: {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
              updatedAt: timestamp,
            },
            data,
            error: undefined,
          };
        },
        {
          fallback: (integration, error) => ({
            integration: {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
              updatedAt: new Date(0),
            },
            data: [],
            error: toPublicIntegrationError(error),
          }),
          throwOnAllFailures: true,
        },
      );
    }),
});
