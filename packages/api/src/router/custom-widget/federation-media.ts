import { z } from "zod/v4";

import { integrationKinds } from "@homarr/definitions";

import { readFederatedSourceMedia } from "../../federation/source-media";
import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { protectedProcedure } from "../../procedure";

export const federationMediaProcedures = {
  media: protectedProcedure
    .concat(createOneIntegrationMiddleware("query", ...integrationKinds))
    .input(z.object({ token: z.string().min(1).max(2048) }))
    .query(({ context, input, signal }) => readFederatedSourceMedia(context, input.integrationId, input.token, signal)),
};
