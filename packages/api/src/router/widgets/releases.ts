import { z } from "zod";

import { releasesRequestHandler } from "@homarr/request-handler/releases";

import { createTRPCRouter, publicProcedure } from "../../trpc";

export const releasesRouter = createTRPCRouter({
  getLatest: publicProcedure
    .input(
      z.object({
        repositories: z.array(
          z.object({
            providerName: z.string(),
            identifier: z.string(),
            versionRegex: z.string().optional(),
          }),
        ),
      }),
    )
    .query(async ({ input }) => {
      const result = await Promise.all(
        input.repositories.map(async (repository) => {
          const innerHandler = releasesRequestHandler.handler({
            providerName: repository.providerName,
            identifier: repository.identifier,
            versionRegex: repository.versionRegex,
          });
          return await innerHandler.getCachedOrUpdatedDataAsync({
            forceUpdate: false,
          });
        }),
      );

      return result;
    }),
});
