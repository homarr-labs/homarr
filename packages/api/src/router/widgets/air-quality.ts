import { z } from "zod/v4";

import { env } from "@homarr/common/env";
import { airQualityRequestHandler } from "@homarr/request-handler/air-quality";

import { createTRPCRouter, publicProcedure } from "../../trpc";

const atLocationInput = z.object({
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
});

export const airQualityRouter = createTRPCRouter({
  atLocation: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get current and forecast air quality, UV, pollutant, and pollen data for geographic coordinates. REQUIRED: latitude (-90 to 90) and longitude (-180 to 180).",
      },
    })
    .input(atLocationInput)
    .query(async ({ input }) => {
      if (env.NO_EXTERNAL_CONNECTION) return null;

      const handler = airQualityRequestHandler.handler(input);
      return await handler.getDataAsync().then((result) => result.data);
    }),
});
