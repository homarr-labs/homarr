import SuperJSON from "superjson";
import { escapeForRegEx } from "@tiptap/react";
import { z } from "zod/v4";

import { decryptSecret } from "@homarr/common/server";
import { eq } from "@homarr/db";
import { boards, items, widgetSecrets } from "@homarr/db/schema";
import { releaseProviderKinds } from "@homarr/definitions";
import { releasesRequestHandler } from "@homarr/request-handler/releases";

import { createTRPCRouter, publicProcedure } from "../../trpc";
import { throwIfActionForbiddenAsync } from "../board/board-access";

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
        itemId: z.string().optional(),
        repositories: z.array(
          z.object({
            id: z.string().optional(),
            provider: z.enum(releaseProviderKinds),
            identifier: z.string(),
            versionFilter: releaseVersionFilterSchema.optional(),
            providerUrl: z.string().url().optional(),
          }),
        ),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tokensByProvider = new Map<string, string>();
      let allowedRepoIds: Set<string> | null = null;

      if (input.itemId) {
        try {
          const item = await ctx.db.query.items.findFirst({ where: eq(items.id, input.itemId) });
          if (item && item.kind === "releases") {
            await throwIfActionForbiddenAsync(ctx, eq(boards.id, item.boardId), "view");

            const options = SuperJSON.parse<Record<string, unknown>>(item.options);
            const repos = options.repositories as Array<{ id?: string }> | undefined;
            if (repos) {
              allowedRepoIds = new Set(repos.map((r) => r.id).filter((id): id is string => Boolean(id)));
            }

            const secrets = await ctx.db.query.widgetSecrets.findMany({
              where: eq(widgetSecrets.itemId, input.itemId),
            });
            for (const secret of secrets) {
              try {
                tokensByProvider.set(secret.kind, decryptSecret(secret.value));
              } catch {
                // Skip corrupt secrets
              }
            }
          }
        } catch {
          // Access denied or table not yet migrated -- proceed without tokens
        }
      }

      return await Promise.all(
        input.repositories.map(async (repository) => {
          const repositoryId = repository.id ?? repository.identifier;
          try {
            const useToken = allowedRepoIds === null || allowedRepoIds.has(repositoryId);
            const response = await releasesRequestHandler
              .handler({
                id: repositoryId,
                provider: repository.provider,
                identifier: repository.identifier,
                versionRegex: formatVersionFilterRegex(repository.versionFilter),
                providerUrl: repository.providerUrl,
                token: useToken ? tokensByProvider.get(repository.provider) : undefined,
              })
              .getDataAsync();

            return {
              id: repositoryId,
              provider: repository.provider,
              timestamp: response.timestamp,
              ...response.data,
            };
          } catch (error) {
            return {
              id: repositoryId,
              provider: repository.provider,
              timestamp: new Date(),
              success: false as const,
              error: { code: "unexpected" as const, message: String(error) },
            };
          }
        }),
      );
    }),
});
