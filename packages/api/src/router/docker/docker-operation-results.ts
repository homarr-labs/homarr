import { TRPCError } from "@trpc/server";

export const throwIfDockerOperationsFailed = (results: readonly PromiseSettledResult<unknown>[]) => {
  if (results.some((result) => result.status === "rejected")) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "One or more Docker container operations failed",
    });
  }
};
