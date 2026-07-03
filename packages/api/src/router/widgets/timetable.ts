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
      const { data } = await timetableGetTimetableRequestHandler.handler(input).getDataAsync();
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
      const { data } = await timetableSearchStationsRequestHandler.handler(input).getDataAsync();
      return data;
    }),
});
