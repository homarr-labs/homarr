import { z } from "zod/v4";

import { radarrReleaseTypes } from "@homarr/integrations/types";
import { calendarMonthRequestHandler } from "@homarr/request-handler/calendar";

import { createManyWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { PUBLIC_INTEGRATION_ERROR, settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const calendarRouter = createTRPCRouter({
  findAllEvents: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get calendar events from calendar-capable integrations. REQUIRED: integrationIds (IDs from integration_all whose kinds include Sonarr, Radarr, Lidarr, Readarr, Home Assistant, Nextcloud, or iCal), year (four-digit number), month (human month number from 1=January through 12=December), releaseType (Radarr filters: 'inCinemas'|'digitalRelease'|'physicalRelease'), showUnmonitored (boolean). Great for 'what's coming out this week/month?'",
      },
    })
    .input(
      z.object({
        year: z.number().int().min(1970).max(9999),
        month: z.number().int().min(1).max(12),
        releaseType: z.array(z.enum(radarrReleaseTypes)),
        showUnmonitored: z.boolean(),
      }),
    )
    .concat(createManyWidgetIntegrationMiddleware("query", "calendar"))
    .query(async ({ ctx, input }) => {
      return await settleIntegrationQueries(
        ctx.integrations,
        async (integration) => {
          const { integrationIds: _integrationIds, ...handlerInput } = input;
          const innerHandler = calendarMonthRequestHandler.handler(integration, handlerInput);
          const { data } = await innerHandler.getDataAsync();
          const events = data.filter(
            (event) => event.metadata?.type !== "radarr" || input.releaseType.includes(event.metadata.releaseType),
          );

          return {
            events,
            integration: {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
            },
            error: undefined,
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
