import { observable } from "@trpc/server/observable";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import type { UpsSummary } from "@homarr/integrations/types";
import { upsSummariesRequestHandler } from "@homarr/request-handler/ups";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const upsRouter = createTRPCRouter({
  getSummaries: publicProcedure
    .concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("ups")))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = upsSummariesRequestHandler.handler(integration, {});
          const { data, timestamp } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });

          return {
            integrationId: integration.id,
            integrationName: integration.name,
            integrationUrl: integration.url,
            summaries: data,
            updatedAt: timestamp,
          };
        }),
      );

      return results;
    }),
  subscribeSummaries: publicProcedure
    .concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("ups")))
    .subscription(({ ctx }) => {
      return observable<{ integrationId: string; summaries: UpsSummary[]; timestamp: Date }>((emit) => {
        const unsubscribes = ctx.integrations.map((integration) => {
          const innerHandler = upsSummariesRequestHandler.handler(integration, {});
          return innerHandler.subscribe((summaries) => {
            emit.next({
              integrationId: integration.id,
              summaries,
              timestamp: new Date(),
            });
          });
        });

        return () => {
          unsubscribes.forEach((unsubscribe) => unsubscribe());
        };
      });
    }),
});
