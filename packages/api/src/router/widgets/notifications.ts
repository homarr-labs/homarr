import { observable } from "@trpc/server/observable";
import { z } from "zod";

import type { Modify } from "@homarr/common/types";
import type { Integration } from "@homarr/db/schema";
import type { IntegrationKindByCategory } from "@homarr/definitions";
import { getIntegrationKindsByCategory } from "@homarr/definitions";
import type { Notification } from "@homarr/integrations";
import { notificationsRequestHandler } from "@homarr/request-handler/notifications";

import type { IntegrationAction } from "../../middlewares/integration";
import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const createNotificationsIntegrationMiddleware = (action: IntegrationAction) =>
  createManyIntegrationMiddleware(action, ...getIntegrationKindsByCategory("notifications"));

const notificationsInputSchema = z.object({
  topics: z.array(z.string()),
});

export const notificationsRouter = createTRPCRouter({
  getNotifications: publicProcedure
    .input(notificationsInputSchema)
    .unstable_concat(createNotificationsIntegrationMiddleware("query"))
    .query(async ({ input, ctx }) => {
      return await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = notificationsRequestHandler.handler(integration, {
            topics: input.topics,
          });
          const { data, timestamp } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });

          return {
            integration: {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
              updatedAt: timestamp,
            },
            data,
          };
        }),
      );
    }),
  subscribeNotifications: publicProcedure
    .input(notificationsInputSchema)
    .unstable_concat(createNotificationsIntegrationMiddleware("query"))
    .subscription(({ input, ctx }) => {
      return observable<{
        integration: Modify<Integration, { kind: IntegrationKindByCategory<"notifications"> }>;
        data: Notification[];
      }>((emit) => {
        const unsubscribes: (() => void)[] = [];
        for (const integrationWithSecrets of ctx.integrations) {
          const { decryptedSecrets: _, ...integration } = integrationWithSecrets;
          const innerHandler = notificationsRequestHandler.handler(integrationWithSecrets, {
            topics: input.topics,
          });
          const unsubscribe = innerHandler.subscribe((data) => {
            emit.next({
              integration,
              data,
            });
          });
          unsubscribes.push(unsubscribe);
        }
        return () => {
          unsubscribes.forEach((unsubscribe) => {
            unsubscribe();
          });
        };
      });
    }),
});
