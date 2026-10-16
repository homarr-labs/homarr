import { mediaTranscodingRequestHandler } from "@homarr/request-handler/media-transcoding";
import { paginatedSchema } from "@homarr/validation/common";

import { createOneWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { createApiRouter, publicProcedure } from "../../procedure";

export const mediaTranscodingRouter = createApiRouter({
  getDataAsync: publicProcedure
    .concat(createOneWidgetIntegrationMiddleware("query", "mediaTranscoding"))
    .input(paginatedSchema.pick({ page: true, pageSize: true }))
    .query(async ({ context, input }) => {
      const innerHandler = mediaTranscodingRequestHandler.handler(context.integration, {
        pageOffset: (input.page - 1) * input.pageSize,
        pageSize: input.pageSize,
      });
      const { data } = await innerHandler.getDataAsync();

      return {
        integrationId: context.integration.id,
        data,
      };
    }),
});
