import { mediaTranscodingRequestHandler } from "@homarr/request-handler/media-transcoding";
import { paginatedSchema } from "@homarr/validation/common";

import { createOneWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const mediaTranscodingRouter = createTRPCRouter({
  getDataAsync: publicProcedure
    .concat(createOneWidgetIntegrationMiddleware("query", "mediaTranscoding"))
    .input(paginatedSchema.pick({ page: true, pageSize: true }))
    .query(async ({ ctx, input }) => {
      const innerHandler = mediaTranscodingRequestHandler.handler(ctx.integration, {
        pageOffset: (input.page - 1) * input.pageSize,
        pageSize: input.pageSize,
      });
      const { data } = await innerHandler.getDataAsync();

      return {
        integrationId: ctx.integration.id,
        data,
      };
    }),
});
