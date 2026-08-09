import { z } from "zod/v4";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { radarrReleaseTypes } from "@homarr/integrations/types";
import { calendarMonthRequestHandler } from "@homarr/request-handler/calendar";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { PUBLIC_INTEGRATION_ERROR, settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const calendarRouter = createTRPCRouter({
  findAllEvents: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get calendar events for upcoming and recent media releases. REQUIRED: integrationIds (array of integration IDs from integration_all, filter by kind sonarr/radarr/lidarr/readarr), year (number), month (number), releaseType (array of 'inCinemas'|'digitalRelease'|'physicalRelease'), showUnmonitored (boolean). Great for 'what's coming out this week/month?'",
      },
    })
    .input(
      z.object({
        year: z.number(),
        month: z.number(),
        releaseType: z.array(z.enum(radarrReleaseTypes)),
        showUnmonitored: z.boolean(),
      }),
    )
    .concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("calendar")))
    .query(async ({ ctx, input }) => {
      return await settleIntegrationQueries(
        ctx.integrations,
        async (integration) => {
          const { integrationIds: _integrationIds, ...handlerInput } = input;
          const innerHandler = calendarMonthRequestHandler.handler(integration, handlerInput);
          const { data } = await innerHandler.getDataAsync();

          return {
            events: data,
            integration: {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
            },
            error: undefined as string | undefined,
          };
        },
        {
          fallback: (integration) => ({
            events: [],
            integration: {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
            },
            error: PUBLIC_INTEGRATION_ERROR,
          }),
          throwOnAllFailures: true,
        },
      );
    }),
});
