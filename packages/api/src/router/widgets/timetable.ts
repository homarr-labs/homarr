import z from "zod";

import {
  timetableGetTimetableRequestHandler,
  timetableSearchStationsRequestHandler,
} from "@homarr/request-handler/timetable";

import { createTRPCRouter, publicProcedure } from "../../trpc";

const baseUrlSchema = z.string().url();

export const timetableRouter = createTRPCRouter({
  getTimetable: publicProcedure
    .input(
      z.object({
        baseUrl: baseUrlSchema,
        stationId: z.string(),
        limit: z.number().int().min(1).max(100),
      }),
    )
    .query(async ({ input }) => {
      const innerHandler = timetableGetTimetableRequestHandler.handler({
        baseUrl: input.baseUrl,
        stationId: input.stationId,
        limit: input.limit,
      });

      const { data } = await innerHandler.getDataAsync();

      return data;
    }),
  searchStations: publicProcedure
    .input(
      z.object({
        baseUrl: baseUrlSchema,
        query: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const innerHandler = timetableSearchStationsRequestHandler.handler({
        baseUrl: input.baseUrl,
        query: input.query,
      });

      const { data } = await innerHandler.getDataAsync();

      return data;
    }),
});
