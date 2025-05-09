import { escapeForRegEx } from "@tiptap/react";
import { z } from "zod";

import { releasesRequestHandler } from "@homarr/request-handler/releases";

import { createTRPCRouter, publicProcedure } from "../../trpc";

const formatVersionFilterRegex = (versionFilter: z.infer<typeof releaseVersionFilterSchema> | undefined) => {
  if (!versionFilter) return undefined;

  const escapedPrefix = versionFilter.prefix ? escapeForRegEx(versionFilter.prefix) : "";
  const precision = "[0-9]+\\.".repeat(versionFilter.precision).slice(0, -2);
  const escapedSuffix = versionFilter.suffix ? escapeForRegEx(versionFilter.suffix) : "";

  return `^${escapedPrefix}${precision}${escapedSuffix}$`;
};

const releaseVersionFilterSchema = z.object({
  prefix: z.string().optional(),
  precision: z.number(),
  suffix: z.string().optional(),
});

export const releasesRouter = createTRPCRouter({
  getLatest: publicProcedure
    .input(
      z.object({
        repositories: z.array(
          z.object({
            providerKey: z.string(),
            identifier: z.string(),
            versionFilter: releaseVersionFilterSchema.optional(),
          }),
        ),
      }),
    )
    .query(async ({ input }) => {
      const result = await Promise.all(
        input.repositories.map(async (repository) => {
          const innerHandler = releasesRequestHandler.handler({
            providerKey: repository.providerKey,
            identifier: repository.identifier,
            versionRegex: formatVersionFilterRegex(repository.versionFilter),
          });
          return await innerHandler.getCachedOrUpdatedDataAsync({
            forceUpdate: false,
          });
        }),
      );

      return result;
    }),
});
