import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { notificationsRequestHandler } from "@homarr/request-handler/notifications";

import type { IntegrationAction } from "../../middlewares/integration";
import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const createNotificationsIntegrationMiddleware = (action: IntegrationAction) =>
  createManyIntegrationMiddleware(action, ...getIntegrationKindsByCategory("notifications"));

export const notificationsRouter = createTRPCRouter({
  getNotifications: publicProcedure
    .unstable_concat(createNotificationsIntegrationMiddleware("query"))
    .query(async ({ ctx }) => {
      return await settleIntegrationQueries(ctx.integrations, async (integration) => {
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
        };
      });
    }),
});
