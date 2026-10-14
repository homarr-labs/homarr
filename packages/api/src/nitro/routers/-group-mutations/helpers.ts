import { ORPCError } from "@orpc/server";

import type { AuthenticatedBackendContext } from "../../context";
import type { GroupMutationsProcedureResources, GroupSavePermissionsInput, GroupSavePositionsInput } from "./resources";

export function createGroupMutationsHelpers(resources: GroupMutationsProcedureResources) {
  const savePositionsAsync = async (context: AuthenticatedBackendContext, input: GroupSavePositionsInput) => {
    const { groups } = resources.tables;
    const { eq } = resources.operators;
    const positions = input.positions.map((id, index) => ({ id, position: index + 1 }));

    await resources.handleTransactionsAsync(context.db, {
      handleAsync: async (db, schema) => {
        await db.transaction(async (trx) => {
          for (const { id, position } of positions) {
            await trx.update(schema.groups).set({ position }).where(eq(groups.id, id));
          }
        });
      },
      handleSync: (db) => {
        db.transaction((trx) => {
          for (const { id, position } of positions) {
            trx.update(groups).set({ position }).where(eq(groups.id, id)).run();
          }
        });
      },
    });
  };

  const savePermissionsAsync = async (context: AuthenticatedBackendContext, input: GroupSavePermissionsInput) => {
    const { groups, groupPermissions } = resources.tables;
    const { eq } = resources.operators;
    const group = await context.db.query.groups.findFirst({
      where: eq(groups.id, input.groupId),
    });

    if (!group) {
      throw new ORPCError("NOT_FOUND", {
        message: "Group not found",
      });
    }

    const permissions = [...new Set(input.permissions)];

    await resources.handleTransactionsAsync(context.db, {
      async handleAsync(db, schema) {
        await db.transaction(async (transaction) => {
          await transaction.delete(schema.groupPermissions).where(eq(schema.groupPermissions.groupId, input.groupId));
          if (permissions.length === 0) {
            return;
          }
          await transaction.insert(schema.groupPermissions).values(
            permissions.map((permission) => ({
              groupId: input.groupId,
              permission,
            })),
          );
        });
      },
      handleSync(db) {
        db.transaction((transaction) => {
          transaction.delete(groupPermissions).where(eq(groupPermissions.groupId, input.groupId)).run();
          if (permissions.length === 0) {
            return;
          }
          transaction
            .insert(groupPermissions)
            .values(
              permissions.map((permission) => ({
                groupId: input.groupId,
                permission,
              })),
            )
            .run();
        });
      },
    });
  };

  return { savePositionsAsync, savePermissionsAsync };
}
