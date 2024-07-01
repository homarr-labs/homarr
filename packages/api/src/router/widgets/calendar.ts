import type { CalendarEvent } from "@homarr/integrations/types";

import { createItemWithIntegrationChannel } from "@homarr/redis";
import { createManyIntegrationOfOneItemMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const calendarRouter = createTRPCRouter({
  findAllEvents: publicProcedure
    .unstable_concat(createManyIntegrationOfOneItemMiddleware("sonarr", "radarr", "readarr", "lidarr"))
    .query(async ({ ctx }) => {
      return await Promise.all(
        ctx.integrations.flatMap(async (integration) => {
          for (const item of integration.items) {
            const cache = createItemWithIntegrationChannel<CalendarEvent[]>(item.itemId, integration.id);
            return await cache.getAsync();
          }
        }),
      );
    }),
});
