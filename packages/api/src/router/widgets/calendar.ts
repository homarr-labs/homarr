import { getIntegrationKindsByCategory } from "@homarr/definitions";
import type { CalendarEvent } from "@homarr/integrations/types";
import { createItemAndIntegrationChannel } from "@homarr/redis";

import { createManyIntegrationOfOneItemMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const calendarRouter = createTRPCRouter({
  findAllEvents: publicProcedure
    .unstable_concat(createManyIntegrationOfOneItemMiddleware("query", ...getIntegrationKindsByCategory("calendar")))
    .query(async ({ ctx }) => {
      const result = await Promise.all(
        ctx.integrations.flatMap(async (integration) => {
          const cache = createItemAndIntegrationChannel<CalendarEvent[]>("calendar", integration.id);
          return await cache.getAsync();
        }),
      );
      return result.filter((item) => item !== null).flatMap((item) => item.data);
    }),
});
