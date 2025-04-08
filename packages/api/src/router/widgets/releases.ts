import { z } from "zod";

import { releasesRequestHandler } from "@homarr/request-handler/releases";
import type { ReleaseVersionFilter } from "../../../../widgets/src/releases/release-repository";

import { createTRPCRouter, publicProcedure } from "../../trpc";

export const releasesRouter = createTRPCRouter({
  getLatest: publicProcedure
    .input(
      z.object({
        repositories: z.array(
          z.object({
            providerName: z.string(),
            identifier: z.string(),
            versionFilter: z.custom<ReleaseVersionFilter>().optional(),
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
            versionFilter: repository.versionFilter,
          });
          return await innerHandler.getCachedOrUpdatedDataAsync({
            forceUpdate: false,
          });
        }),
      );

      return result;
    }),
});
