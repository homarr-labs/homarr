import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import type { Session } from "@homarr/auth";
import { hasQueryAccessToIntegrationsAsync } from "@homarr/auth/server";
import { constructIntegrationPermissions } from "@homarr/auth/shared";
import { createId, objectEntries } from "@homarr/common";
import { decryptSecret, encryptSecret } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import type { Database, SQL } from "@homarr/db";
import { and, asc, eq, handleTransactionsAsync, inArray, like, or } from "@homarr/db";
import {
  apps,
  groupMembers,
  groupPermissions,
  groups,
  integrationGroupPermissions,
  integrations,
  integrationSecrets,
  integrationUserPermissions,
  users,
} from "@homarr/db/schema";
import type {
  GroupPermissionKey,
  IntegrationKind,
  IntegrationPermission,
  IntegrationSecretKind,
} from "@homarr/definitions";
import {
  getAllSecretKindOptions,
  getIntegrationKindsByCategory,
  getPermissionsWithParents,
  integrationCategories,
  integrationDefs,
  integrationKinds,
  integrationSecretKindObject,
} from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations/factory";
import { invalidateIntegrationCacheAsync } from "@homarr/redis";
import { mediaRequestListRequestHandler } from "@homarr/request-handler/media-request-list";
import { mediaRequestStatsRequestHandler } from "@homarr/request-handler/media-request-stats";
import { byIdSchema } from "@homarr/validation/common";
import {
  integrationCreateResultSchema,
  integrationCreateSchema,
  integrationDetailsSchema,
  integrationKindDefinitionSchema,
  integrationPermissionsSchema,
  integrationSavePermissionsSchema,
  integrationSummarySchema,
  integrationUpdateSchema,
} from "@homarr/validation/integration";
import { mediaRequestOptionsSchema, mediaRequestRequestSchema } from "@homarr/validation/widgets/media-request";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure, publicProcedure } from "../../trpc";
import { throwIfActionForbiddenAsync } from "./integration-access";
import { integrationRequestProcedure } from "./integration-request";
import { MissingSecretError, testConnectionAsync } from "./integration-test-connection";
import { integrationTestStoredConnectionProcedure } from "./integration-test-stored-connection";
import { mapTestConnectionError, TestConnectionFailedError } from "./map-test-connection-error";

const logger = createLogger({ module: "integrationRouter" });
const mediaRequestSearchKinds = getIntegrationKindsByCategory("mediaSearch");

export const integrationRouter = createTRPCRouter({
  request: integrationRequestProcedure,
  testConnection: integrationTestStoredConnectionProcedure,
  getKinds: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/api/integrations/kinds",
        tags: ["integrations"],
        protect: true,
        summary: "List integration kinds",
        description:
          "Return every supported integration kind with its name, categories and secret kind options. An integration needs all secret kinds of one option in requiredSecrets; an empty option means no secrets are needed.",
      },
      mcp: {
        enabled: true,
        description:
          "List integration kinds and required secret fields. Saved integrations can be used with integration_request and Custom Widget sources when permissions.hasFullAccess is true, except iCalendar feeds (iCal) and the TrueNAS WebSocket API, which are not generic HTTP APIs. qBittorrent generic HTTP requires an API key and qBittorrent 5.2.0 or newer. Reuse saved credentials instead of asking for secrets again.",
      },
    })
    .output(z.array(integrationKindDefinitionSchema))
    .query(() => {
      return objectEntries(integrationDefs).map(([kind, def]) => ({
        kind,
        name: def.name,
        category: [...def.category],
        requiredSecrets: getAllSecretKindOptions(kind),
      }));
    }),
  all: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/api/integrations",
        tags: ["integrations"],
        protect: true,
        summary: "List accessible integrations",
        description:
          "Return the integrations the caller can use, with the caller's use, interact and full access flags. Secrets are not included.",
      },
      mcp: {
        enabled: true,
        description:
          "List accessible configured integrations with id, name, kind, url, and permissions. Use id as integrationId. Native read tools require permissions.hasUseAccess; native action tools require permissions.hasInteractAccess. Custom Widget integration sources and arbitrary HTTP requests require permissions.hasFullAccess, including GET. False means the API key owner lacks that permission level; never bypass it.",
      },
    })
    .output(z.array(integrationSummarySchema))
    .query(async ({ ctx }) => {
      return await getAccessibleIntegrationsAsync(ctx);
    }),
  allThatSupportSearch: protectedProcedure.query(async ({ ctx }) => {
    return await getAccessibleIntegrationsAsync(
      ctx,
      inArray(
        integrations.kind,
        objectEntries(integrationDefs)
          .filter(([_, integration]) => [...integration.category].includes("search"))
          .map(([kind, _]) => kind),
      ),
    );
  }),
  allOfGivenCategory: protectedProcedure
    .input(
      z.object({
        category: z.enum(integrationCategories),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await getAccessibleIntegrationsAsync(
        ctx,
        inArray(integrations.kind, getIntegrationKindsByCategory(input.category)),
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
      const groupsOfCurrentUser = await ctx.db.query.groupMembers.findMany({
        where: eq(groupMembers.userId, ctx.session.user.id),
      });

      const integrationsFromDb = await ctx.db.query.integrations.findMany({
        where: like(integrations.name, `%${input.query}%`),
        orderBy: asc(integrations.name),
        with: getIntegrationAccessRelationsAsync(
          ctx.session.user.id,
          groupsOfCurrentUser.map((group) => group.groupId),
        ),
      });

      return integrationsFromDb
        .filter((integration) => hasIntegrationQueryAccess(ctx.session, integration))
        .toSorted(
          (integrationA, integrationB) =>
            integrationA.name.localeCompare(integrationB.name) || integrationA.id.localeCompare(integrationB.id),
        )
        .slice(0, input.limit)
        .map(
          ({ userPermissions: _userPermissions, groupPermissions: _groupPermissions, ...integration }) => integration,
        );
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
      openapi: {
        method: "GET",
        path: "/api/integrations/{id}",
        tags: ["integrations"],
        protect: true,
        summary: "Get an integration",
        description:
          "Return an integration with its linked app and stored secret kinds. Secret values are only returned for public kinds such as usernames, all others are null; updatedAt shows when each secret was last saved. Requires full access to the integration.",
      },
      mcp: {
        enabled: true,
        description:
          "Get integration details by ID, including secrets metadata and linked app. REQUIRED: id (integration ID string)",
      },
    })
    .input(byIdSchema)
    .output(integrationDetailsSchema)
    .query(async ({ ctx, input }) => {
      const integrationWhere = eq(integrations.id, input.id);

      await throwIfActionForbiddenAsync(ctx, integrationWhere, "full").catch((error) => {
        if (error instanceof TRPCError && error.code === "NOT_FOUND") {
          logger.warn("Integration lookup refused", {
            integrationId: input.id,
            errorCode: error.code,
            reason: "integration-not-found-or-forbidden",
          });
        }
        throw error;
      });

      const integration = await ctx.db.query.integrations.findFirst({
        where: integrationWhere,
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
        logger.warn("Integration lookup refused", {
          integrationId: input.id,
          errorCode: "NOT_FOUND",
          reason: "integration-not-found",
        });
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
      openapi: {
        method: "POST",
        path: "/api/integrations",
        tags: ["integrations"],
        protect: true,
        summary: "Create an integration",
        description:
          "Create an integration with its secrets and optionally link an existing app or create a new one. Requires integration-create permission, and app-create permission for a new app. The secrets must cover one secret kind option from GET /api/integrations/kinds, each kind at most once. The connection is tested before saving: a failed test returns BAD_REQUEST with only the failure category (authorization, certificate, request, statusCode, parse or unknown) as message. skipConnectionTest saves without contacting the service.",
      },
      mcp: {
        enabled: true,
        effect: "additive",
        description:
          "Create a new integration (connection to an external service). REQUIRED fields: name, url (http/https), kind, secrets. The 'secrets' field is REQUIRED and must be a non-empty array — call integration_getKinds first to see which secret kinds each integration type needs. Example for Radarr: secrets=[{kind:'apiKey', value:'your-radarr-api-key'}]. Example for Proxmox: secrets=[{kind:'tokenId', value:'...'}, {kind:'personalAccessToken', value:'...'}, {kind:'realm', value:'pam'}]. The connection is tested before saving — if it fails, nothing is saved and an error is returned. Leave skipConnectionTest unset unless the user explicitly asks to save an unreachable integration. The 'app' field is optional — pass {id:'...'} to link to an existing app, or omit it. Returns integration details and appId, which is null when no app is linked or created.",
      },
    })
    .input(integrationCreateSchema)
    .output(integrationCreateResultSchema)
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

      await throwIfAppNotFoundAsync(ctx.db, input.app && "id" in input.app ? input.app.id : null);

      if (input.skipConnectionTest) {
        throwIfSecretsMissing(
          input.kind,
          input.secrets.map((secret) => secret.kind),
        );
      } else {
        await throwIfConnectionTestFailedAsync(ctx, {
          id: "new",
          name: input.name,
          url: input.url,
          kind: input.kind,
          secrets: input.secrets,
        });
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

      return {
        integration: {
          id: integrationId,
          name: input.name,
          kind: input.kind,
          url: input.url,
        },
        appId,
      };
    }),
  update: protectedProcedure
    .meta({
      openapi: {
        method: "PUT",
        path: "/api/integrations/{id}",
        tags: ["integrations"],
        protect: true,
        summary: "Update an integration",
        description:
          "Replace the name, URL, linked app and secrets of an integration; its kind cannot be changed. secrets lists every secret kind to keep, each at most once: a value replaces the stored secret, null keeps the stored value, and stored kinds that are not listed are deleted. The kept secrets must cover one secret kind option. Requires full access to the integration. The connection is tested with the kept secrets before saving: a failed test returns BAD_REQUEST with only the failure category as message. skipConnectionTest saves without contacting the service.",
      },
    })
    .input(integrationUpdateSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
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

      await throwIfAppNotFoundAsync(ctx.db, input.appId);

      if (input.skipConnectionTest) {
        throwIfSecretsMissing(
          integration.kind,
          input.secrets
            .filter(
              (secret) =>
                secret.value !== null || integration.secrets.some((dbSecret) => dbSecret.kind === secret.kind),
            )
            .map((secret) => secret.kind),
        );
      } else {
        await throwIfConnectionTestFailedAsync(
          ctx,
          {
            id: input.id,
            name: input.name,
            url: input.url,
            kind: integration.kind,
            secrets: input.secrets,
          },
          // Stored secrets that are not listed are deleted below, so the test must not rely on them
          integration.secrets.filter((dbSecret) => input.secrets.some((secret) => secret.kind === dbSecret.kind)),
        );
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
      openapi: {
        method: "DELETE",
        path: "/api/integrations/{id}",
        tags: ["integrations"],
        protect: true,
        summary: "Delete an integration",
        description:
          "Delete an integration with its secrets and permissions. Widgets lose the integration. Requires full access to the integration.",
      },
      mcp: {
        enabled: true,
        effect: "destructive",
        description: "Delete an integration by ID. REQUIRED: id (integration ID string)",
      },
    })
    .input(byIdSchema)
    .output(z.void())
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
  getIntegrationPermissions: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/api/integrations/{id}/permissions",
        tags: ["integrations"],
        protect: true,
        summary: "Read integration permissions",
        description:
          "Return the users and groups with explicit permissions on an integration, and the groups that inherit access through global integration permissions. Requires full access to the integration.",
      },
    })
    .input(byIdSchema)
    .output(integrationPermissionsSchema)
    .query(async ({ input, ctx }) => {
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
    .meta({
      openapi: {
        method: "PUT",
        path: "/api/integrations/{entityId}/permissions/users",
        tags: ["integrations"],
        protect: true,
        summary: "Replace user integration permissions",
        description:
          "Replace all explicit user permissions on an integration. Omitted users lose their explicit permission; each user can be listed once. Requires full access to the integration.",
      },
    })
    .input(integrationSavePermissionsSchema)
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      await throwIfActionForbiddenAsync(ctx, eq(integrations.id, input.entityId), "full");
      await throwIfIntegrationPermissionPrincipalsInvalidAsync(
        ctx.db,
        "user",
        input.permissions.map(({ principalId }) => principalId),
      );

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
    .meta({
      openapi: {
        method: "PUT",
        path: "/api/integrations/{entityId}/permissions/groups",
        tags: ["integrations"],
        protect: true,
        summary: "Replace group integration permissions",
        description:
          "Replace all explicit group permissions on an integration. Omitted groups lose their explicit permission; each group can be listed once. Requires full access to the integration.",
      },
    })
    .input(integrationSavePermissionsSchema)
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      await throwIfActionForbiddenAsync(ctx, eq(integrations.id, input.entityId), "full");
      await throwIfIntegrationPermissionPrincipalsInvalidAsync(
        ctx.db,
        "group",
        input.permissions.map(({ principalId }) => principalId),
      );

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
        effect: "additive",
        description:
          "Submit a media request to Overseerr/Jellyseerr/Seerr. REQUIRED: integrationId (Overseerr/Jellyseerr ID), mediaId (number), mediaType ('tv' or 'movie'). OPTIONAL: seasons (array of season numbers — for TV only, omit to request all). Workflow: searchMediaRequests → (getMediaRequestOptions for TV) → requestMedia",
      },
    })
    .concat(createOneIntegrationMiddleware("interact", "jellyseerr", "overseerr", "seerr"))
    .input(mediaRequestRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const integration = await createIntegrationAsync(ctx.integration);
      const result = await integration.requestMediaAsync(input.mediaType, input.mediaId, input.seasons);
      try {
        mediaRequestListRequestHandler.invalidateCache();
        await mediaRequestStatsRequestHandler.invalidateCacheAsync([ctx.integration.id]);
      } catch (error) {
        logger.warn("Failed to invalidate media request caches after a successful request", {
          integrationId: ctx.integration.id,
          error: String(error),
        });
      }
      return result;
    }),
});

const globalIntegrationPermissions = [
  "integration-use-all",
  "integration-interact-all",
  "integration-full-all",
] satisfies GroupPermissionKey[];

const hasGlobalIntegrationAccess = (session: Session | null) =>
  globalIntegrationPermissions.some((permission) => session?.user.permissions.includes(permission) ?? false);

const hasIntegrationQueryAccess = (
  session: Session | null,
  integration: {
    userPermissions: { permission: IntegrationPermission }[];
    groupPermissions: { permission: IntegrationPermission }[];
  },
) => hasGlobalIntegrationAccess(session) || constructIntegrationPermissions(integration, session).hasUseAccess;

const getIntegrationAccessRelationsAsync = (userId: string, groupIds: string[]) => ({
  userPermissions: {
    where: eq(integrationUserPermissions.userId, userId),
  },
  groupPermissions: {
    where: inArray(integrationGroupPermissions.groupId, groupIds),
  },
});

const getAccessibleIntegrationsAsync = async (ctx: { db: Database; session: Session }, where?: SQL) => {
  const groupsOfCurrentUser = await ctx.db.query.groupMembers.findMany({
    where: eq(groupMembers.userId, ctx.session.user.id),
  });

  const integrationsFromDb = await ctx.db.query.integrations.findMany({
    where,
    with: getIntegrationAccessRelationsAsync(
      ctx.session.user.id,
      groupsOfCurrentUser.map((group) => group.groupId),
    ),
  });

  return integrationsFromDb
    .filter((integration) => hasIntegrationQueryAccess(ctx.session, integration))
    .map((integration) => {
      const permissions = constructIntegrationPermissions(integration, ctx.session);

      return {
        id: integration.id,
        name: integration.name,
        kind: integration.kind,
        url: integration.url,
        permissions,
      };
    })
    .toSorted(
      (integrationA, integrationB) =>
        integrationKinds.indexOf(integrationA.kind) - integrationKinds.indexOf(integrationB.kind) ||
        integrationA.name.localeCompare(integrationB.name) ||
        integrationA.id.localeCompare(integrationB.id),
    );
};

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
          item: {
            columns: { boardId: true },
          },
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

const throwIfConnectionTestFailedAsync = async (
  ctx: { isOpenApiRequest?: boolean },
  ...parameters: Parameters<typeof testConnectionAsync>
) => {
  const result = await testConnectionAsync(...parameters).catch((error) => {
    if (!(error instanceof MissingSecretError)) throw error;

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error.message,
    });
  });

  if (result.success) return;

  logger.error(result.error);
  const mappedError = mapTestConnectionError(result.error);
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: mappedError.type,
    // The integration forms show the mapped error, REST callers only get the category as on test-connection
    cause: ctx.isOpenApiRequest ? undefined : new TestConnectionFailedError(mappedError),
  });
};

/**
 * Without a connection test nothing resolves the secrets,
 * so at least one secret kind option of the integration kind has to be complete
 */
const throwIfSecretsMissing = (kind: IntegrationKind, secretKinds: IntegrationSecretKind[]) => {
  const hasCompleteSecretKindOption = getAllSecretKindOptions(kind).some((secretKindOption) =>
    secretKindOption.every((secretKind) => secretKinds.includes(secretKind)),
  );
  if (hasCompleteSecretKindOption) return;

  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "No secret defined for this integration",
  });
};

const throwIfAppNotFoundAsync = async (db: Database, appId: string | null) => {
  if (appId === null) return;

  const app = await db.query.apps.findFirst({ columns: { id: true }, where: eq(apps.id, appId) });
  if (app) return;

  throw new TRPCError({
    code: "NOT_FOUND",
    message: "App not found",
  });
};

const throwIfIntegrationPermissionPrincipalsInvalidAsync = async (
  db: Database,
  principalKind: "user" | "group",
  principalIds: string[],
) => {
  if (new Set(principalIds).size !== principalIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Principal IDs must be unique",
    });
  }
  if (principalIds.length === 0) return;

  const existingPrincipals =
    principalKind === "user"
      ? await db.query.users.findMany({ columns: { id: true }, where: inArray(users.id, principalIds) })
      : await db.query.groups.findMany({ columns: { id: true }, where: inArray(groups.id, principalIds) });
  if (existingPrincipals.length === principalIds.length) return;

  throw new TRPCError({
    code: "NOT_FOUND",
    message: principalKind === "user" ? "User not found" : "Group not found",
  });
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
