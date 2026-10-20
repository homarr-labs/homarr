import SuperJSON from "superjson";
import { z } from "zod/v4";

import { decryptSecret } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { eq } from "@homarr/db";
import { boards, items, widgetSecrets } from "@homarr/db/schema";
import { releaseProviderKinds } from "@homarr/definitions";
import { releasesRequestHandler } from "@homarr/request-handler/releases";
import { serviceVersionRequestHandler } from "@homarr/request-handler/service-version";

import { createManyWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries, toPublicIntegrationError } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import { isActionAllowedAsync, throwIfActionForbiddenAsync } from "../board/board-access";

const logger = createLogger({ module: "releasesRouter" });
const PUBLIC_RELEASE_ERROR_MESSAGE: string = "Release provider request failed";
const escapeForRegEx = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
        boardId: z.string().optional(),
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
      const savedRepos = new Map<string, { providerUrl?: string }>();
      let configurationBoardId = input.boardId;

      if (input.itemId) {
        try {
          const item = await ctx.db.query.items.findFirst({ where: eq(items.id, input.itemId) });
          if (item && item.kind === "releases") {
            await throwIfActionForbiddenAsync(ctx, eq(boards.id, item.boardId), "view");
            configurationBoardId = item.boardId;

            const options = SuperJSON.parse<Record<string, unknown>>(item.options);
            const repos = options.repositories as
              | Array<{ provider?: string; identifier: string; providerUrl?: string }>
              | undefined;
            if (repos) {
              for (const repo of repos) {
                if (repo.provider && repo.identifier) {
                  savedRepos.set(`${repo.provider}:${repo.identifier}`, { providerUrl: repo.providerUrl });
                }
              }
            }

            const secrets = await ctx.db.query.widgetSecrets.findMany({
              where: eq(widgetSecrets.itemId, input.itemId),
            });
            for (const secret of secrets) {
              try {
                tokensByProvider.set(secret.kind, decryptSecret(secret.value));
              } catch (error) {
                logger.warn("Failed to decrypt widget secret", { itemId: input.itemId, kind: secret.kind, error });
              }
            }
          }
        } catch (error) {
          logger.warn("Failed to load release widget tokens", { itemId: input.itemId, error });
        }
      }

      const canConfigure = configurationBoardId
        ? await isActionAllowedAsync(ctx, eq(boards.id, configurationBoardId), "modify")
        : false;

      return await Promise.all(
        input.repositories.map(async (repository) => {
          const repositoryId = repository.id ?? repository.identifier;
          const savedRepo = savedRepos.get(`${repository.provider}:${repository.identifier}`);
          const providerUrl = canConfigure ? repository.providerUrl : savedRepo?.providerUrl;
          const token =
            savedRepo && providerUrl === savedRepo.providerUrl ? tokensByProvider.get(repository.provider) : undefined;
          try {
            const response = await releasesRequestHandler
              .handler({
                id: repositoryId,
                provider: repository.provider,
                identifier: repository.identifier,
                versionRegex: formatVersionFilterRegex(repository.versionFilter),
                providerUrl,
                token,
              })
              .getDataAsync();

            const data = response.data.success
              ? response.data
              : {
                  success: false as const,
                  error: { code: response.data.error.code, message: PUBLIC_RELEASE_ERROR_MESSAGE },
                };
            if (!response.data.success) {
              logger.warn("Release provider request failed", {
                repositoryId,
                provider: repository.provider,
                error: response.data.error,
              });
            }

            return {
              id: repositoryId,
              provider: repository.provider,
              timestamp: response.timestamp,
              ...data,
            };
          } catch (error) {
            logger.warn("Release provider request failed", {
              repositoryId,
              provider: repository.provider,
              error,
            });
            return {
              id: repositoryId,
              provider: repository.provider,
              timestamp: new Date(),
              success: false as const,
              error: { code: "unexpected" as const, message: PUBLIC_RELEASE_ERROR_MESSAGE },
            };
          }
        }),
      );
    }),
  getServiceVersions: publicProcedure
    .concat(createManyWidgetIntegrationMiddleware("query", "releases"))
    .query(async ({ ctx }) => {
      return await settleIntegrationQueries(
        ctx.integrations,
        async (integration) => {
          const innerHandler = serviceVersionRequestHandler.handler(integration, {});
          const { data, timestamp } = await innerHandler.getDataAsync();

          return {
            integrationId: integration.id,
            integrationName: integration.name,
            integrationKind: integration.kind,
            version: data.version,
            updatedAt: timestamp,
            error: undefined,
          };
        },
        {
          fallback: (integration, error) => ({
            integrationId: integration.id,
            integrationName: integration.name,
            integrationKind: integration.kind,
            version: null,
            updatedAt: new Date(0),
            error: toPublicIntegrationError(error),
          }),
          throwOnAllFailures: true,
        },
      );
    }),
});
