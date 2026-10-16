import { z } from "zod/v4";

import { createIntegrationAsync } from "@homarr/integrations/factory";
import { notificationsRequestHandler } from "@homarr/request-handler/notifications";

import { createManyWidgetIntegrationMiddleware, createOneIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries, toPublicIntegrationError } from "../../settle-integrations";
import { createApiRouter, protectedProcedure, publicProcedure } from "../../procedure";

export const notificationsRouter = createApiRouter({
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
    .mutation(async ({ context, input }) => {
      const integration = await createIntegrationAsync(context.integration);
      await integration.deleteNotificationAsync(input.notificationId);
      await notificationsRequestHandler.invalidateCacheAsync([context.integration.id]);
    }),
  getNotifications: publicProcedure
    .concat(createManyWidgetIntegrationMiddleware("query", "notifications"))
    .query(async ({ context }) => {
      return await settleIntegrationQueries(
        context.integrations,
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
