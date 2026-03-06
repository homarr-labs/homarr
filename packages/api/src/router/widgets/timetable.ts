import z from "zod";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { timetableOptionsSchema } from "@homarr/integrations/types";
import {
  timetableGetTimetableRequestHandler,
  timetableSearchStationsRequestHandler,
} from "@homarr/request-handler/timetable";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const timetableRouter = createTRPCRouter({
  getTimetable: publicProcedure
    .concat(createOneIntegrationMiddleware("query", ...getIntegrationKindsByCategory("timetable")))
    .input(timetableOptionsSchema)
    .query(async ({ input, ctx }) => {
      const innerHandler = timetableGetTimetableRequestHandler.handler(ctx.integration, {
        stationId: input.stationId,
        limit: input.limit,
      });

      const { data } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });

      return data;
    }),
  searchStations: publicProcedure
    .concat(createOneIntegrationMiddleware("query", ...getIntegrationKindsByCategory("timetable")))
    .input(
      z.object({
        query: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const innerHandler = timetableSearchStationsRequestHandler.handler(ctx.integration, {
        query: input.query,
      });

      const { data } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });

      return data;
    }),
});
