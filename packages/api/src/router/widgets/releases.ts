import { escapeForRegEx } from "@tiptap/react";
import { z } from "zod/v4";

import { releaseProviderKinds } from "@homarr/definitions";
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
            id: z.string(),
            provider: z.enum(releaseProviderKinds),
            identifier: z.string(),
            versionFilter: releaseVersionFilterSchema.optional(),
            providerUrl: z.string().url().optional(),
          }),
        ),
      }),
    )
    .query(async ({ input }) => {
      return await Promise.all(
        input.repositories.map(async (repository) => {
          const response = await releasesRequestHandler
            .handler({
              id: repository.id,
              provider: repository.provider,
              identifier: repository.identifier,
              versionRegex: formatVersionFilterRegex(repository.versionFilter),
              providerUrl: repository.providerUrl,
            })
            .getCachedOrUpdatedDataAsync({
              forceUpdate: false,
            });

          return {
            id: repository.id,
            provider: repository.provider,
            timestamp: response.timestamp,
            ...response.data,
          };
        }),
      );
    }),
});
