import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { mediaTranscodingRequestHandler } from "@homarr/request-handler/media-transcoding";
import { validation } from "@homarr/validation";

import type { IntegrationAction } from "../../middlewares/integration";
import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const createIndexerManagerIntegrationMiddleware = (action: IntegrationAction) =>
  createOneIntegrationMiddleware(action, ...getIntegrationKindsByCategory("mediaTranscoding"));

export const mediaTranscodingRouter = createTRPCRouter({
  getDataAsync: publicProcedure
    .unstable_concat(createIndexerManagerIntegrationMiddleware("query"))
    .input(validation.common.paginated.pick({ page: true, pageSize: true }))
    .query(async ({ ctx, input }) => {
      const innerHandler = mediaTranscodingRequestHandler.handler(ctx.integration, {
        pageOffset: input.page,
        pageSize: input.pageSize,
      });
      const { data } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });

      return {
        integrationId: ctx.integration.id,
        data,
      };
    }),
});
