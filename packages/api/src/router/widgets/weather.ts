import { z } from "zod/v4";

import { env } from "@homarr/common/env";
import { weatherRequestHandler } from "@homarr/request-handler/weather";

import { createTRPCRouter, publicProcedure } from "../../trpc";

const atLocationInput = z.object({
  longitude: z.number(),
  latitude: z.number(),
});

export const weatherRouter = createTRPCRouter({
  atLocation: publicProcedure.input(atLocationInput).query(async ({ input }) => {
    if (env.NO_EXTERNAL_CONNECTION) return null;

    const handler = weatherRequestHandler.handler(input);
    return await handler.getDataAsync().then((result) => result.data);
  }),
});
