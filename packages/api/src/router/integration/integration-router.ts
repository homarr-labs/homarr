import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { hasQueryAccessToIntegrationsAsync } from "@homarr/auth/server";
import { constructIntegrationPermissions } from "@homarr/auth/shared";
import { createId, objectEntries } from "@homarr/common";
import { decryptSecret, encryptSecret } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import type { Database } from "@homarr/db";
import { and, asc, eq, handleTransactionsAsync, inArray, like, or } from "@homarr/db";
import {
  apps,
  groupMembers,
  groupPermissions,
  integrationGroupPermissions,
  integrations,
  integrationSecrets,
  integrationUserPermissions,
} from "@homarr/db/schema";
import type { IntegrationSecretKind } from "@homarr/definitions";
import {
  getIntegrationKindsByCategory,
  getPermissionsWithParents,
  integrationCategories,
  integrationDefs,
  integrationKinds,
  integrationSecretKindObject,
} from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import { invalidateIntegrationCacheAsync } from "@homarr/redis";
import { byIdSchema } from "@homarr/validation/common";
import {
  integrationCreateSchema,
  integrationSavePermissionsSchema,
  integrationUpdateSchema,
} from "@homarr/validation/integration";
import { mediaRequestOptionsSchema, mediaRequestRequestSchema } from "@homarr/validation/widgets/media-request";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure, publicProcedure } from "../../trpc";
import { throwIfActionForbiddenAsync } from "./integration-access";
import { MissingSecretError, testConnectionAsync } from "./integration-test-connection";
import { mapTestConnectionError } from "./map-test-connection-error";

const logger = createLogger({ module: "integrationRouter" });
const mediaRequestSearchKinds = getIntegrationKindsByCategory("mediaSearch");

export const integrationRouter = createTRPCRouter({
  getKinds: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "List all supported integration kinds (e.g. sonarr, radarr, overseerr, pihole, homeAssistant) with the secret fields each kind requires. Use this before creating an integration to know which 'kind' values are valid and what secrets to provide.",
      },
    })
    .query(() => {
      return objectEntries(integrationDefs).map(([kind, def]) => ({
        kind,
        name: def.name,
        category: def.category,
        requiredSecrets: def.secretKinds,
      }));
    }),
  all: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "List all configured integrations (connections to services like Sonarr, Radarr, Plex, etc.). Returns each integration's id, name, kind, url, and permissions. Use the 'id' field as 'integrationId' in other tools. Check permissions.hasUseAccess before reading data and permissions.hasInteractAccess before performing actions — false means the API key owner lacks that permission level for this integration, not an error",
      },
    })
    .query(async ({ ctx }) => {
      const groupsOfCurrentUser = await ctx.db.query.groupMembers.findMany({
        where: eq(groupMembers.userId, ctx.session.user.id),
      });

      const integrations = await ctx.db.query.integrations.findMany({
        with: {
          userPermissions: {
            where: eq(integrationUserPermissions.userId, ctx.session.user.id),
          },
          groupPermissions: {
            where: inArray(
              integrationGroupPermissions.groupId,
              groupsOfCurrentUser.map((group) => group.groupId),
            ),
          },
        },
      });
      return integrations
        .map((integration) => {
          const permissions = integration.userPermissions
            .map(({ permission }) => permission)
            .concat(integration.groupPermissions.map(({ permission }) => permission));

          return {
            id: integration.id,
            name: integration.name,
            kind: integration.kind,
            url: integration.url,
            permissions: {
              hasUseAccess:
                permissions.includes("use") || permissions.includes("interact") || permissions.includes("full"),
              hasInteractAccess: permissions.includes("interact") || permissions.includes("full"),
              hasFullAccess: permissions.includes("full"),
            },
          };
        })
        .toSorted(
          (integrationA, integrationB) =>
            integrationKinds.indexOf(integrationA.kind) - integrationKinds.indexOf(integrationB.kind),
        );
    }),
  allThatSupportSearch: protectedProcedure.query(async ({ ctx }) => {
    const groupsOfCurrentUser = await ctx.db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, ctx.session.user.id),
    });

    const integrationsFromDb = await ctx.db.query.integrations.findMany({
      with: {
        userPermissions: {
          where: eq(integrationUserPermissions.userId, ctx.session.user.id),
        },
        groupPermissions: {
          where: inArray(
            integrationGroupPermissions.groupId,
            groupsOfCurrentUser.map((group) => group.groupId),
          ),
        },
      },
      where: inArray(
        integrations.kind,
        objectEntries(integrationDefs)
          .filter(([_, integration]) => [...integration.category].includes("search"))
          .map(([kind, _]) => kind),
      ),
    });
    return integrationsFromDb
      .map((integration) => {
        const permissions = integration.userPermissions
          .map(({ permission }) => permission)
          .concat(integration.groupPermissions.map(({ permission }) => permission));

        return {
          id: integration.id,
          name: integration.name,
          kind: integration.kind,
          url: integration.url,
          permissions: {
            hasUseAccess:
              permissions.includes("use") || permissions.includes("interact") || permissions.includes("full"),
            hasInteractAccess: permissions.includes("interact") || permissions.includes("full"),
            hasFullAccess: permissions.includes("full"),
          },
        };
      })
      .toSorted(
        (integrationA, integrationB) =>
          integrationKinds.indexOf(integrationA.kind) - integrationKinds.indexOf(integrationB.kind),
      );
  }),
  allOfGivenCategory: protectedProcedure
    .input(
      z.object({
        category: z.enum(integrationCategories),
      }),
    )
    .query(async ({ ctx, input }) => {
      const groupsOfCurrentUser = await ctx.db.query.groupMembers.findMany({
        where: eq(groupMembers.userId, ctx.session.user.id),
      });

      const intergrationKinds = getIntegrationKindsByCategory(input.category);

      const integrationsFromDb = await ctx.db.query.integrations.findMany({
        with: {
          userPermissions: {
            where: eq(integrationUserPermissions.userId, ctx.session.user.id),
          },
          groupPermissions: {
            where: inArray(
              integrationGroupPermissions.groupId,
              groupsOfCurrentUser.map((group) => group.groupId),
            ),
          },
        },
        where: inArray(integrations.kind, intergrationKinds),
      });
      return integrationsFromDb
        .map((integration) => {
          const permissions = integration.userPermissions
            .map(({ permission }) => permission)
            .concat(integration.groupPermissions.map(({ permission }) => permission));

          return {
            id: integration.id,
            name: integration.name,
            kind: integration.kind,
            url: integration.url,
            permissions: {
              hasUseAccess:
                permissions.includes("use") || permissions.includes("interact") || permissions.includes("full"),
              hasInteractAccess: permissions.includes("interact") || permissions.includes("full"),
              hasFullAccess: permissions.includes("full"),
            },
          };
        })
        .toSorted(
          (integrationA, integrationB) =>
            integrationKinds.indexOf(integrationA.kind) - integrationKinds.indexOf(integrationB.kind),
        );
    }),
  search: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Search integrations by name. REQUIRED: query (search string). OPTIONAL: limit (number, default 10). Returns matching integrations with id (use as integrationId), name, kind, url, and permissions",
      },
    })
    .input(
      z.object({
        query: z.string(),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.integrations.findMany({
        where: like(integrations.name, `%${input.query}%`),
        orderBy: asc(integrations.name),
        limit: input.limit,
      });
    }),
  // This is used to get the integrations by their ids it's public because it's needed to get integrations data in the boards
  byIds: publicProcedure.input(z.array(z.string())).query(async ({ ctx, input }) => {
    return await ctx.db.query.integrations.findMany({
      where: inArray(integrations.id, input),
      columns: {
        id: true,
        kind: true,
      },
    });
  }),
  byId: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get integration details by ID, including secrets metadata and linked app. REQUIRED: id (integration ID string)",
      },
    })
    .input(byIdSchema)
    .query(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(integrations.id, input.id), "full");
      const integration = await ctx.db.query.integrations.findFirst({
        where: eq(integrations.id, input.id),
        with: {
          secrets: {
            columns: {
              kind: true,
              value: true,
              updatedAt: true,
            },
          },
          app: {
            columns: {
              id: true,
              name: true,
              iconUrl: true,
              href: true,
            },
          },
        },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      return {
        id: integration.id,
        name: integration.name,
        kind: integration.kind,
        url: integration.url,
        secrets: integration.secrets.map((secret) => ({
          kind: secret.kind,
          // Only return the value if the secret is public, so for example the username
          value: integrationSecretKindObject[secret.kind].isPublic ? decryptSecret(secret.value) : null,
          updatedAt: secret.updatedAt,
        })),
        app: integration.app,
      };
    }),
  create: permissionRequiredProcedure
    .requiresPermission("integration-create")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Create a new integration (connection to an external service). REQUIRED fields: name, url (http/https), kind, secrets, attemptSearchEngineCreation. The 'secrets' field is REQUIRED and must be a non-empty array — call integration_getKinds first to see which secret kinds each integration type needs. Example for Radarr: secrets=[{kind:'apiKey', value:'your-radarr-api-key'}]. Example for Proxmox: secrets=[{kind:'tokenId', value:'...'}, {kind:'personalAccessToken', value:'...'}, {kind:'realm', value:'pam'}]. The connection is tested before saving — if secrets are wrong, an error is returned. Set attemptSearchEngineCreation to false unless explicitly requested. The 'app' field is optional — pass {id:'...'} to link to an existing app, or omit it.",
      },
    })
    .input(integrationCreateSchema)
    .mutation(async ({ ctx, input }) => {
      logger.info("Creating integration", {
        name: input.name,
        kind: input.kind,
        url: input.url,
      });

      if (input.app && "name" in input.app && !ctx.session.user.permissions.includes("app-create")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Permission denied",
        });
      }

      const result = await testConnectionAsync({
        id: "new",
        name: input.name,
        url: input.url,
        kind: input.kind,
        secrets: input.secrets,
      }).catch((error) => {
        if (!(error instanceof MissingSecretError)) throw error;

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      });

      if (!result.success) {
        logger.error(result.error);
        return {
          error: mapTestConnectionError(result.error),
        };
      }

      const appId = await createAppIfNecessaryAsync(ctx.db, input.app);

      const integrationId = createId();
      await ctx.db.insert(integrations).values({
        id: integrationId,
        name: input.name,
        url: input.url,
        kind: input.kind,
        appId,
      });

      if (input.secrets.length >= 1) {
        await ctx.db.insert(integrationSecrets).values(
          input.secrets.map((secret) => ({
            kind: secret.kind,
            value: encryptSecret(secret.value),
            integrationId,
          })),
        );
      }

      logger.info("Created integration", {
        id: integrationId,
        name: input.name,
        kind: input.kind,
        url: input.url,
      });
    }),
  update: protectedProcedure.input(integrationUpdateSchema).mutation(async ({ ctx, input }) => {
    await throwIfActionForbiddenAsync(ctx, eq(integrations.id, input.id), "full");

    logger.info("Updating integration", {
      id: input.id,
    });

    const integration = await ctx.db.query.integrations.findFirst({
      where: eq(integrations.id, input.id),
      with: {
        secrets: true,
      },
    });

    if (!integration) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Integration not found",
      });
    }

    const testResult = await testConnectionAsync(
      {
        id: input.id,
        name: input.name,
        url: input.url,
        kind: integration.kind,
        secrets: input.secrets,
      },
      integration.secrets,
    ).catch((error) => {
      if (!(error instanceof MissingSecretError)) throw error;

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error.message,
      });
    });

    if (!testResult.success) {
      logger.error(testResult.error);
      return {
        error: mapTestConnectionError(testResult.error),
      };
    }

    await ctx.db
      .update(integrations)
      .set({
        name: input.name,
        url: input.url,
        appId: input.appId,
      })
      .where(eq(integrations.id, input.id));

    const changedSecrets = input.secrets.filter(
      (secret): secret is { kind: IntegrationSecretKind; value: string } =>
        secret.value !== null && // only update secrets that have a value
        !integration.secrets.find(
          // Checked above
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          (dbSecret) => dbSecret.kind === secret.kind && dbSecret.value === encryptSecret(secret.value!),
        ),
    );

    if (changedSecrets.length > 0) {
      for (const changedSecret of changedSecrets) {
        const secretInput = {
          integrationId: input.id,
          value: changedSecret.value,
          kind: changedSecret.kind,
        };
        if (!integration.secrets.some((secret) => secret.kind === changedSecret.kind)) {
          await addSecretAsync(ctx.db, secretInput);
        } else {
          await updateSecretAsync(ctx.db, secretInput);
        }
      }
    }

    const removedSecrets = integration.secrets.filter(
      (dbSecret) => !input.secrets.some((secret) => dbSecret.kind === secret.kind),
    );
    if (removedSecrets.length >= 1) {
      await ctx.db
        .delete(integrationSecrets)
        .where(
          or(
            ...removedSecrets.map((secret) =>
              and(eq(integrationSecrets.integrationId, input.id), eq(integrationSecrets.kind, secret.kind)),
            ),
          ),
        );
    }

    logger.info("Updated integration", {
      id: input.id,
      name: input.name,
      kind: integration.kind,
      url: input.url,
    });

    // Invalidate all cached data for this integration so that widgets pick up the
    // new configuration immediately instead of serving stale (or errored) data.
    await invalidateIntegrationCacheAsync(input.id);
  }),
  delete: protectedProcedure
    .meta({
      mcp: { enabled: true, description: "Delete an integration by ID. REQUIRED: id (integration ID string)" },
    })
    .input(byIdSchema)
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(integrations.id, input.id), "full");

      const integration = await ctx.db.query.integrations.findFirst({
        where: eq(integrations.id, input.id),
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      await ctx.db.delete(integrations).where(eq(integrations.id, input.id));

      // Clean up any cached data left behind by the deleted integration.
      await invalidateIntegrationCacheAsync(input.id);
    }),
  getIntegrationPermissions: protectedProcedure.input(byIdSchema).query(async ({ input, ctx }) => {
    await throwIfActionForbiddenAsync(ctx, eq(integrations.id, input.id), "full");

    const dbGroupPermissions = await ctx.db.query.groupPermissions.findMany({
      where: inArray(
        groupPermissions.permission,
        getPermissionsWithParents(["integration-use-all", "integration-interact-all", "integration-full-all"]),
      ),
      columns: {
        groupId: false,
      },
      with: {
        group: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    const userPermissions = await ctx.db.query.integrationUserPermissions.findMany({
      where: eq(integrationUserPermissions.integrationId, input.id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
      },
    });

    const dbGroupIntegrationPermission = await ctx.db.query.integrationGroupPermissions.findMany({
      where: eq(integrationGroupPermissions.integrationId, input.id),
      with: {
        group: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      inherited: dbGroupPermissions.toSorted((permissionA, permissionB) => {
        return permissionA.group.name.localeCompare(permissionB.group.name);
      }),
      users: userPermissions
        .map(({ user, permission }) => ({
          user,
          permission,
        }))
        .toSorted((permissionA, permissionB) => {
          return (permissionA.user.name ?? "").localeCompare(permissionB.user.name ?? "");
        }),
      groups: dbGroupIntegrationPermission
        .map(({ group, permission }) => ({
          group: {
            id: group.id,
            name: group.name,
          },
          permission,
        }))
        .toSorted((permissionA, permissionB) => {
          return permissionA.group.name.localeCompare(permissionB.group.name);
        }),
    };
  }),
  saveUserIntegrationPermissions: protectedProcedure
    .input(integrationSavePermissionsSchema)
    .mutation(async ({ input, ctx }) => {
      await throwIfActionForbiddenAsync(ctx, eq(integrations.id, input.entityId), "full");

      await handleTransactionsAsync(ctx.db, {
        async handleAsync(db, schema) {
          await ctx.db.transaction(async (transaction) => {
            await transaction
              .delete(schema.integrationUserPermissions)
              .where(eq(schema.integrationUserPermissions.integrationId, input.entityId));
            if (input.permissions.length === 0) {
              return;
            }
            await transaction.insert(schema.integrationUserPermissions).values(
              input.permissions.map((permission) => ({
                userId: permission.principalId,
                permission: permission.permission,
                integrationId: input.entityId,
              })),
            );
          });
        },
        handleSync(db) {
          db.transaction((transaction) => {
            transaction
              .delete(integrationUserPermissions)
              .where(eq(integrationUserPermissions.integrationId, input.entityId))
              .run();
            if (input.permissions.length === 0) {
              return;
            }
            transaction
              .insert(integrationUserPermissions)
              .values(
                input.permissions.map((permission) => ({
                  userId: permission.principalId,
                  permission: permission.permission,
                  integrationId: input.entityId,
                })),
              )
              .run();
          });
        },
      });
    }),
  saveGroupIntegrationPermissions: protectedProcedure
    .input(integrationSavePermissionsSchema)
    .mutation(async ({ input, ctx }) => {
      await throwIfActionForbiddenAsync(ctx, eq(integrations.id, input.entityId), "full");

      await handleTransactionsAsync(ctx.db, {
        async handleAsync(db, schema) {
          await db.transaction(async (transaction) => {
            await transaction
              .delete(schema.integrationGroupPermissions)
              .where(eq(schema.integrationGroupPermissions.integrationId, input.entityId));
            if (input.permissions.length === 0) {
              return;
            }
            await transaction.insert(schema.integrationGroupPermissions).values(
              input.permissions.map((permission) => ({
                groupId: permission.principalId,
                permission: permission.permission,
                integrationId: input.entityId,
              })),
            );
          });
        },
        handleSync(db) {
          db.transaction((transaction) => {
            transaction
              .delete(integrationGroupPermissions)
              .where(eq(integrationGroupPermissions.integrationId, input.entityId))
              .run();
            if (input.permissions.length === 0) {
              return;
            }
            transaction
              .insert(integrationGroupPermissions)
              .values(
                input.permissions.map((permission) => ({
                  groupId: permission.principalId,
                  permission: permission.permission,
                  integrationId: input.entityId,
                })),
              )
              .run();
          });
        },
      });
    }),
  searchInIntegration: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Search within a specific integration (e.g. Overseerr, Jellyseerr). REQUIRED: integrationId (from integration_all), query (search string)",
      },
    })
    .concat(createOneIntegrationMiddleware("query", ...getIntegrationKindsByCategory("search")))
    .input(z.object({ integrationId: z.string(), query: z.string() }))
    .query(async ({ ctx, input }) => {
      const integrationInstance = await createIntegrationAsync(ctx.integration);
      return await integrationInstance.searchAsync(encodeURI(input.query));
    }),
  mediaRequestSearchTargets: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description: "List integrations that support media request search (Overseerr, Jellyseerr, Seerr)",
      },
    })
    .query(async ({ ctx }) => {
      const integrationsWithAccess = await getAccessibleMediaRequestSearchIntegrationsAsync(ctx);

      return integrationsWithAccess.map((integration) => {
        const permissions = constructIntegrationPermissions(integration, ctx.session);

        return {
          id: integration.id,
          name: integration.name,
          kind: integration.kind,
          url: integration.url,
          permissions: {
            hasInteractAccess: permissions.hasInteractAccess,
          },
        };
      });
    }),
  searchMediaRequests: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Search for movies and TV shows across Overseerr/Jellyseerr/Seerr. REQUIRED: query (search string). OPTIONAL: integrationIds (array of integration IDs — omit to search all accessible Overseerr/Jellyseerr/Seerr integrations). Returns results with integrationId, mediaId, and mediaType for use with getMediaRequestOptions and requestMedia",
      },
    })
    .input(
      z.object({
        query: z.string(),
        integrationIds: z.array(z.string()).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const query = input.query.trim();
      if (query.length === 0) return [];

      const integrationsWithAccess = await getAccessibleMediaRequestSearchIntegrationsAsync(ctx, input.integrationIds);

      const results = await Promise.all(
        integrationsWithAccess.map(async (integration) => {
          const integrationInstance = await createIntegrationAsync({
            id: integration.id,
            name: integration.name,
            url: integration.url,
            kind: integration.kind as (typeof mediaRequestSearchKinds)[number],
            externalUrl: integration.app?.href ?? null,
            decryptedSecrets: integration.secrets.map((secret) => ({
              ...secret,
              value: decryptSecret(secret.value),
            })),
          });
          const permissions = constructIntegrationPermissions(integration, ctx.session);

          return await integrationInstance.searchAsync(encodeURI(query)).then((searchResults) =>
            searchResults.map((result) => ({
              ...result,
              integration: {
                id: integration.id,
                name: integration.name,
                kind: integration.kind,
                url: integration.url,
                permissions: {
                  hasInteractAccess: permissions.hasInteractAccess,
                },
              },
            })),
          );
        }),
      );

      return results.flat();
    }),
  getMediaRequestOptions: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get available options (seasons/episodes for TV) before requesting media. REQUIRED: integrationId (Overseerr/Jellyseerr ID), mediaId (number from searchMediaRequests), mediaType ('tv' or 'movie'). Required step for TV shows — for movies you can skip this and go straight to requestMedia",
      },
    })
    .concat(createOneIntegrationMiddleware("query", "jellyseerr", "overseerr", "seerr"))
    .input(mediaRequestOptionsSchema)
    .query(async ({ ctx, input }) => {
      const integration = await createIntegrationAsync(ctx.integration);
      return await integration.getSeriesInformationAsync(input.mediaType, input.mediaId);
    }),
  requestMedia: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Submit a media request to Overseerr/Jellyseerr/Seerr. REQUIRED: integrationId (Overseerr/Jellyseerr ID), mediaId (number), mediaType ('tv' or 'movie'). OPTIONAL: seasons (array of season numbers — for TV only, omit to request all). Workflow: searchMediaRequests → (getMediaRequestOptions for TV) → requestMedia",
      },
    })
    .concat(createOneIntegrationMiddleware("interact", "jellyseerr", "overseerr", "seerr"))
    .input(mediaRequestRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const integration = await createIntegrationAsync(ctx.integration);
      return await integration.requestMediaAsync(input.mediaType, input.mediaId, input.seasons);
    }),
});

interface IntegrationRouterContext {
  db: Database;
  session: Parameters<typeof hasQueryAccessToIntegrationsAsync>[2];
}

const getAccessibleMediaRequestSearchIntegrationsAsync = async (
  ctx: IntegrationRouterContext,
  integrationIds?: string[],
) => {
  const groupsOfCurrentUser = await ctx.db.query.groupMembers.findMany({
    where: eq(groupMembers.userId, ctx.session?.user.id ?? ""),
  });

  const integrationsFromDb = await ctx.db.query.integrations.findMany({
    where:
      integrationIds && integrationIds.length > 0
        ? and(inArray(integrations.id, integrationIds), inArray(integrations.kind, mediaRequestSearchKinds))
        : inArray(integrations.kind, mediaRequestSearchKinds),
    orderBy: asc(integrations.name),
    with: {
      app: true,
      secrets: true,
      items: {
        with: {
          item: true,
        },
      },
      userPermissions: {
        where: eq(integrationUserPermissions.userId, ctx.session?.user.id ?? ""),
      },
      groupPermissions: {
        where: inArray(
          integrationGroupPermissions.groupId,
          groupsOfCurrentUser.map((group) => group.groupId),
        ),
      },
    },
  });

  if (integrationIds && integrationsFromDb.length !== integrationIds.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "One or more media request search integrations were not found",
    });
  }

  const integrationsWithAccess = await Promise.all(
    integrationsFromDb.map(async (integration) => ({
      integration,
      hasAccess: await hasQueryAccessToIntegrationsAsync(ctx.db, [integration], ctx.session),
    })),
  );

  if (integrationIds && integrationsWithAccess.some(({ hasAccess }) => !hasAccess)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "User does not have permission to query one or more media request search integrations",
    });
  }

  return integrationsWithAccess.filter(({ hasAccess }) => hasAccess).map(({ integration }) => integration);
};

interface UpdateSecretInput {
  integrationId: string;
  value: string;
  kind: IntegrationSecretKind;
}
const updateSecretAsync = async (db: Database, input: UpdateSecretInput) => {
  await db
    .update(integrationSecrets)
    .set({
      value: encryptSecret(input.value),
    })
    .where(and(eq(integrationSecrets.integrationId, input.integrationId), eq(integrationSecrets.kind, input.kind)));
};

interface AddSecretInput {
  integrationId: string;
  value: string;
  kind: IntegrationSecretKind;
}

const addSecretAsync = async (db: Database, input: AddSecretInput) => {
  await db.insert(integrationSecrets).values({
    kind: input.kind,
    value: encryptSecret(input.value),
    integrationId: input.integrationId,
  });
};

const createAppIfNecessaryAsync = async (db: Database, app: z.infer<typeof integrationCreateSchema>["app"]) => {
  if (!app) return null;
  if ("id" in app) return app.id;

  logger.info("Creating app", {
    name: app.name,
    url: app.href,
  });
  const appId = createId();
  await db.insert(apps).values({
    id: appId,
    name: app.name,
    description: app.description,
    iconUrl: app.iconUrl,
    href: app.href,
    pingUrl: app.pingUrl,
  });

  logger.info("Created app", {
    id: appId,
    name: app.name,
    url: app.href,
  });

  return appId;
};
