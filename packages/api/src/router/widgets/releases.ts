import { escapeForRegEx } from "@tiptap/react";
import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { releasesRequestHandler } from "@homarr/request-handler/releases";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const logger = createLogger({ module: "releases" });

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
    .concat(createOneIntegrationMiddleware("query", ...getIntegrationKindsByCategory("releasesProvider")))
    .input(
      z.object({
        repositories: z.array(
          z.object({
            id: z.string(),
            identifier: z.string(),
            versionFilter: releaseVersionFilterSchema.optional(),
          }),
        ),
      }),
    )
    .query(async ({ ctx, input }) => {
      const settled = await Promise.allSettled(
        input.repositories.map(async (repository) => {
          const response = await releasesRequestHandler
            .handler(ctx.integration, {
              id: repository.id,
              identifier: repository.identifier,
              versionRegex: formatVersionFilterRegex(repository.versionFilter),
            })
            .getDataAsync();

          return {
            id: repository.id,
            integration: { name: ctx.integration.name, kind: ctx.integration.kind },
            timestamp: response.timestamp,
            ...response.data,
          };
        }),
      );

      return settled.flatMap((result, index) => {
        if (result.status === "fulfilled") return [result.value];
        logger.warn("Release fetch failed", { repository: input.repositories[index]?.identifier, error: result.reason });
        return [];
      });
    }),
});
