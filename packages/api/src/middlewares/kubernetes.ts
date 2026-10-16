import { ApiError } from "../procedure";

import { env } from "@homarr/docker/env";

import { publicProcedure } from "../procedure";

export const kubernetesMiddleware = () => {
  return publicProcedure.use(async ({ next }) => {
    if (env.ENABLE_KUBERNETES) {
      return await next();
    }
    throw new ApiError({
      code: "NOT_FOUND",
      message: "Kubernetes route is not available",
    });
  });
};
