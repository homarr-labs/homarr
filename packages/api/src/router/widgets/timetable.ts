import z from "zod";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import { timetableOptionsSchema } from "@homarr/integrations/types";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const timetableRouter = createTRPCRouter({
  getTimetable: publicProcedure
    .concat(createOneIntegrationMiddleware("query", ...getIntegrationKindsByCategory("timetable")))
    .input(timetableOptionsSchema)
    .query(async ({ input, ctx }) => {
      // TODO: Add caching
      const integration = await createIntegrationAsync(ctx.integration);

      return await integration.getTimetableAsync(input);
    }),
  searchStations: publicProcedure
    .concat(createOneIntegrationMiddleware("query", ...getIntegrationKindsByCategory("timetable")))
    .input(
      z.object({
        query: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const integration = await createIntegrationAsync(ctx.integration);

      return await integration.searchStationsAsync(input.query);
    }),
});
