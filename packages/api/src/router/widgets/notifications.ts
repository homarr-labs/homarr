import { z } from "zod/v4";

import { createIntegrationAsync } from "@homarr/integrations/factory";
import { notificationsRequestHandler } from "@homarr/request-handler/notifications";

import { createManyWidgetIntegrationMiddleware, createOneIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries, toPublicIntegrationError } from "../../settle-integrations";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

export const notificationsRouter = createTRPCRouter({
  deleteNotification: protectedProcedure
    .concat(createOneIntegrationMiddleware("interact", "gotify"))
    .input(
      z.object({
        notificationId: z
          .string()
          .regex(/^[1-9]\d*$/)
          .max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const integration = await createIntegrationAsync(ctx.integration);
      await integration.deleteNotificationAsync(input.notificationId);
      await notificationsRequestHandler.invalidateCacheAsync([ctx.integration.id]);
    }),
  getNotifications: publicProcedure
    .unstable_concat(createManyWidgetIntegrationMiddleware("query", "notifications"))
    .query(async ({ ctx }) => {
      return await settleIntegrationQueries(
        ctx.integrations,
        async (integration) => {
          const innerHandler = notificationsRequestHandler.handler(integration, {});
          const { data, timestamp } = await innerHandler.getDataAsync();

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
