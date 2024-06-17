import type { CalendarEvent } from "@homarr/integrations/types";

import { createItemWithIntegrationChannel } from "../../../../redis/src/lib/channel";
import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const calendarRouter = createTRPCRouter({
  findAllEvents: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("sonarr", "radarr", "readarr", "lidarr"))
    .query(async ({ ctx }) => {
      return await Promise.all(
        ctx.integrations.map(async (integration) => {
          // TODO: pass item id via middleware
          const cache = createItemWithIntegrationChannel<CalendarEvent[]>("", integration.id);
          return await cache.getAsync();
        }),
      );
    }),
});
