import type { CalendarEvent } from "@homarr/integrations/types";
import { createCacheChannel } from "@homarr/redis";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const calendarRouter = createTRPCRouter({
  findAllEvents: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("sonarr", "radarr", "readarr", "lidarr"))
    .query(async ({ ctx }) => {
      return await Promise.all(
        ctx.integrations.map(async (integration) => {
          const cache = createCacheChannel<CalendarEvent[]>(`calendar:${integration.id}`);
          return await cache.getAsync();
        }),
      );
    }),
});
