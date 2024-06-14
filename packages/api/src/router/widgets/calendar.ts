import { createCacheChannel } from "@homarr/redis";
import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const calendarRouter = createTRPCRouter({
  findAllEvents: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("sonarr", "radarr", "readarr", "lidarr"))
    .query(async ({ ctx }): Promise<Event[]> => {
        for (const integration of ctx.integrations) {
            const cache = createCacheChannel<Event[]>(`calendar:${integration.id}`);

            const { data } = await cache.consumeAsync(async () => {

            });
        }
    }),
});

export interface CalendarEvent {
    name: string;
    description: string;
    thumbnail: URL;
    mediaInformation?: {
        season?: number;
        episode?: number;
    }
}
