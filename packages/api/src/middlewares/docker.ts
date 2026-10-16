import { ApiError } from "../procedure";

import { env } from "@homarr/docker/env";

import { isDemoMode, publicProcedure } from "../procedure";

export const dockerMiddleware = () => {
  return publicProcedure.use(async ({ next }) => {
    if (env.ENABLE_DOCKER || isDemoMode) {
      return await next();
    }
    throw new ApiError({
      code: "NOT_FOUND",
      message: "Docker route is not available",
    });
  });
};
