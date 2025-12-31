import { env } from "@homarr/docker/env";
import { TRPCError } from "@trpc/server";

import { publicProcedure } from "../trpc";

export const dockerMiddleware = () => {
  return publicProcedure.use(async ({ next }) => {
    if (env.ENABLE_DOCKER) {
      return await next();
    }
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Docker route is not available",
    });
  });
};
