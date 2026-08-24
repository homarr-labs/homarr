import { notificationsRequestHandler } from "@homarr/request-handler/notifications";

import { createManyWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries, toPublicIntegrationError } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const notificationsRouter = createTRPCRouter({
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
