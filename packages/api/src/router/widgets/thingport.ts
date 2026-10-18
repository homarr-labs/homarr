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
    .input(z.object({ from: isoDateSchema, to: isoDateSchema, timeZone: z.string().max(64) }))
    .query(async ({ ctx, input }) => {
      if (ctx.integration.kind === "mock") return createThingportMockActivity(input.from, input.to);
      const innerHandler = thingportActivityRequestHandler.handler({ ...ctx.integration, kind: "thingport" }, input);
      const data = await innerHandler.getDataAsync();
      return data.data;
    }),
});
