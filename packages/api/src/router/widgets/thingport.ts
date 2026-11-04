import { z } from "zod/v4";

import { createThingportMockActivity, mockWidgetData, thingportModelLists } from "@homarr/integrations";
import {
  thingportActivityRequestHandler,
  thingportFeaturedModelRequestHandler,
  thingportLibraryStatsRequestHandler,
  thingportModelsRequestHandler,
} from "@homarr/request-handler/thingport";

import { createOneWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// The heatmap shows at most a calendar year (366 days in a leap year), inclusive of both ends.
const MAX_ACTIVITY_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;
const activityInputSchema = z
  .object({ from: isoDateSchema, to: isoDateSchema, timeZone: z.string().max(64) })
  .refine(({ from, to }) => {
    const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS + 1;
    return days >= 1 && days <= MAX_ACTIVITY_DAYS;
  }, `The range must run forwards and cover at most ${MAX_ACTIVITY_DAYS} days`);

export const thingportRouter = createTRPCRouter({
  getLibraryStats: publicProcedure
    .concat(createOneWidgetIntegrationMiddleware("query", "thingport-libraryStats"))
    .query(async ({ ctx }) => {
      if (ctx.integration.kind === "mock") return mockWidgetData.thingportLibraryStats;
      const innerHandler = thingportLibraryStatsRequestHandler.handler({ ...ctx.integration, kind: "thingport" }, {});
      const data = await innerHandler.getDataAsync();
      return data.data;
    }),

  getModels: publicProcedure
    .concat(createOneWidgetIntegrationMiddleware("query", "thingport-models"))
    .input(z.object({ list: z.enum(thingportModelLists), limit: z.number().int().min(1).max(50) }))
    .query(async ({ ctx, input }) => {
      if (ctx.integration.kind === "mock") return mockWidgetData.thingportModels[input.list].slice(0, input.limit);
      const innerHandler = thingportModelsRequestHandler.handler({ ...ctx.integration, kind: "thingport" }, input);
      const data = await innerHandler.getDataAsync();
      return data.data;
    }),

  getFeaturedModel: publicProcedure
    .concat(createOneWidgetIntegrationMiddleware("query", "thingport-featuredModel"))
    .input(z.object({ date: isoDateSchema }))
    .query(async ({ ctx, input }) => {
      if (ctx.integration.kind === "mock") return mockWidgetData.thingportFeaturedModel;
      const innerHandler = thingportFeaturedModelRequestHandler.handler(
        { ...ctx.integration, kind: "thingport" },
        input,
      );
      const data = await innerHandler.getDataAsync();
      return data.data;
    }),

  getActivity: publicProcedure
    .concat(createOneWidgetIntegrationMiddleware("query", "thingport-activityHeatmap"))
    .input(activityInputSchema)
    .query(async ({ ctx, input }) => {
      if (ctx.integration.kind === "mock") return createThingportMockActivity(input.from, input.to);
      const innerHandler = thingportActivityRequestHandler.handler({ ...ctx.integration, kind: "thingport" }, input);
      const data = await innerHandler.getDataAsync();
      return data.data;
    }),
});
