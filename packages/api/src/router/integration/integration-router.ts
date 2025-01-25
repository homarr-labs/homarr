import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { objectEntries } from "@homarr/common";
import { decryptSecret, encryptSecret } from "@homarr/common/server";
import type { Database } from "@homarr/db";
import { and, asc, createId, eq, handleTransactionsAsync, inArray, like } from "@homarr/db";
import {
  groupMembers,
  groupPermissions,
  integrationGroupPermissions,
  integrations,
  integrationSecrets,
  integrationUserPermissions,
  searchEngines,
} from "@homarr/db/schema";
import type { IntegrationSecretKind } from "@homarr/definitions";
import {
  getIconUrl,
  getIntegrationKindsByCategory,
  getPermissionsWithParents,
  integrationDefs,
  integrationKinds,
  integrationSecretKindObject,
} from "@homarr/definitions";
import { integrationCreator } from "@homarr/integrations";
import { validation } from "@homarr/validation";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure, publicProcedure } from "../../trpc";
import { throwIfActionForbiddenAsync } from "./integration-access";
import { testConnectionAsync } from "./integration-test-connection";

export const integrationRouter = createTRPCRouter({
  all: publicProcedure.query(async ({ ctx }) => {
    const groupsOfCurrentUser = await ctx.db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, ctx.session?.user.id ?? ""),
    });

    const integrations = await ctx.db.query.integrations.findMany({
      with: {
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
      .sort(
        (integrationA, integrationB) =>
          integrationKinds.indexOf(integrationA.kind) - integrationKinds.indexOf(integrationB.kind),
      );
  }),
  allThatSupportSearch: publicProcedure.query(async ({ ctx }) => {
    const groupsOfCurrentUser = await ctx.db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, ctx.session?.user.id ?? ""),
    });

    const integrationsFromDb = await ctx.db.query.integrations.findMany({
      with: {
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
      .sort(
        (integrationA, integrationB) =>
          integrationKinds.indexOf(integrationA.kind) - integrationKinds.indexOf(integrationB.kind),
      );
  }),
  search: protectedProcedure
    .input(z.object({ query: z.string(), limit: z.number().min(1).max(100).default(10) }))
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
  byId: protectedProcedure.input(validation.integration.byId).query(async ({ ctx, input }) => {
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
    };
  }),
  create: permissionRequiredProcedure
    .requiresPermission("integration-create")
    .input(validation.integration.create)
    .mutation(async ({ ctx, input }) => {
      await testConnectionAsync({
        id: "new",
        name: input.name,
        url: input.url,
        kind: input.kind,
        secrets: input.secrets,
      });

      const integrationId = createId();
      await ctx.db.insert(integrations).values({
        id: integrationId,
        name: input.name,
        url: input.url,
        kind: input.kind,
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

      if (input.attemptSearchEngineCreation) {
        const icon = getIconUrl(input.kind);
        await ctx.db.insert(searchEngines).values({
          id: createId(),
          name: input.name,
          integrationId,
          type: "fromIntegration",
          iconUrl: icon,
          short: await getNextValidShortNameForSearchEngineAsync(ctx.db, input.name),
        });
      }
    }),
  update: protectedProcedure.input(validation.integration.update).mutation(async ({ ctx, input }) => {
    await throwIfActionForbiddenAsync(ctx, eq(integrations.id, input.id), "full");

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

    await testConnectionAsync(
      {
        id: input.id,
        name: input.name,
        url: input.url,
        kind: integration.kind,
        secrets: input.secrets,
      },
      integration.secrets,
    );

    await ctx.db
      .update(integrations)
      .set({
        name: input.name,
        url: input.url,
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
  }),
  delete: protectedProcedure.input(validation.integration.delete).mutation(async ({ ctx, input }) => {
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
  }),
  getIntegrationPermissions: protectedProcedure.input(validation.board.permissions).query(async ({ input, ctx }) => {
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
      inherited: dbGroupPermissions.sort((permissionA, permissionB) => {
        return permissionA.group.name.localeCompare(permissionB.group.name);
      }),
      users: userPermissions
        .map(({ user, permission }) => ({
          user,
          permission,
        }))
        .sort((permissionA, permissionB) => {
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
        .sort((permissionA, permissionB) => {
          return permissionA.group.name.localeCompare(permissionB.group.name);
        }),
    };
  }),
  saveUserIntegrationPermissions: protectedProcedure
    .input(validation.integration.savePermissions)
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
    .input(validation.integration.savePermissions)
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
    .unstable_concat(createOneIntegrationMiddleware("query", ...getIntegrationKindsByCategory("search")))
    .input(z.object({ integrationId: z.string(), query: z.string() }))
    .query(async ({ ctx, input }) => {
      const integrationInstance = integrationCreator(ctx.integration);
      return await integrationInstance.searchAsync(encodeURI(input.query));
    }),
});

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

const getNextValidShortNameForSearchEngineAsync = async (db: Database, integrationName: string) => {
  const searchEngines = await db.query.searchEngines.findMany({
    columns: {
      short: true,
    },
  });

  const usedShortNames = searchEngines.flatMap((searchEngine) => searchEngine.short.toLowerCase());
  const nameByIntegrationName = integrationName.slice(0, 1).toLowerCase();

  if (!usedShortNames.includes(nameByIntegrationName)) {
    return nameByIntegrationName;
  }

  // 8 is max length constraint
  for (let i = 2; i < 9999999; i++) {
    const generatedName = `${nameByIntegrationName}${i}`;
    if (usedShortNames.includes(generatedName)) {
      continue;
    }

    return generatedName;
  }

  throw new Error(
    "Unable to automatically generate a short name. All possible variations were exhausted. Please disable the automatic creation and choose one later yourself.",
  );
};

const addSecretAsync = async (db: Database, input: AddSecretInput) => {
  await db.insert(integrationSecrets).values({
    kind: input.kind,
    value: encryptSecret(input.value),
    integrationId: input.integrationId,
  });
};
