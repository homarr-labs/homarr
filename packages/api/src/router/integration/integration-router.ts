import { TRPCError } from "@trpc/server";

import { decryptSecret, encryptSecret } from "@homarr/common/server";
import type { Database } from "@homarr/db";
import { and, createId, eq, inArray } from "@homarr/db";
import {
  groupPermissions,
  integrationGroupPermissions,
  integrations,
  integrationSecrets,
  integrationUserPermissions,
} from "@homarr/db/schema/sqlite";
import type { IntegrationSecretKind } from "@homarr/definitions";
import { getPermissionsWithParents, integrationKinds, integrationSecretKindObject } from "@homarr/definitions";
import { validation } from "@homarr/validation";

import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure } from "../../trpc";
import { throwIfActionForbiddenAsync } from "./integration-access";
import { testConnectionAsync } from "./integration-test-connection";

export const integrationRouter = createTRPCRouter({
  all: protectedProcedure.query(async ({ ctx }) => {
    const integrations = await ctx.db.query.integrations.findMany();
    return integrations
      .map((integration) => ({
        id: integration.id,
        name: integration.name,
        kind: integration.kind,
        url: integration.url,
      }))
      .sort(
        (integrationA, integrationB) =>
          integrationKinds.indexOf(integrationA.kind) - integrationKinds.indexOf(integrationB.kind),
      );
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

      await ctx.db.transaction(async (transaction) => {
        await transaction
          .delete(integrationUserPermissions)
          .where(eq(integrationUserPermissions.integrationId, input.entityId));
        if (input.permissions.length === 0) {
          return;
        }
        await transaction.insert(integrationUserPermissions).values(
          input.permissions.map((permission) => ({
            userId: permission.principalId,
            permission: permission.permission,
            integrationId: input.entityId,
          })),
        );
      });
    }),
  saveGroupIntegrationPermissions: protectedProcedure
    .input(validation.integration.savePermissions)
    .mutation(async ({ input, ctx }) => {
      await throwIfActionForbiddenAsync(ctx, eq(integrations.id, input.entityId), "full");

      await ctx.db.transaction(async (transaction) => {
        await transaction
          .delete(integrationGroupPermissions)
          .where(eq(integrationGroupPermissions.integrationId, input.entityId));
        if (input.permissions.length === 0) {
          return;
        }
        await transaction.insert(integrationGroupPermissions).values(
          input.permissions.map((permission) => ({
            groupId: permission.principalId,
            permission: permission.permission,
            integrationId: input.entityId,
          })),
        );
      });
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
const addSecretAsync = async (db: Database, input: AddSecretInput) => {
  await db.insert(integrationSecrets).values({
    kind: input.kind,
    value: encryptSecret(input.value),
    integrationId: input.integrationId,
  });
};
