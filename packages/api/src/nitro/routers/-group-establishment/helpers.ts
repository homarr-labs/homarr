import { ORPCError } from "@orpc/server";

import type { BackendContext } from "../../context";
import type { GroupEstablishmentProcedureResources } from "./resources";

export function createGroupEstablishmentHelpers(resources: GroupEstablishmentProcedureResources) {
  const {
    tables: { groups, groupPermissions, onboarding },
    operators: { and, eq, like, max, not },
  } = resources;

  const checkSimilarNameAndThrowAsync = async (db: BackendContext["db"], name: string, ignoreId?: string) => {
    const similar = await db.query.groups.findFirst({
      where: and(like(groups.name, `${name}`), not(eq(groups.id, ignoreId ?? ""))),
    });

    if (similar) {
      throw new ORPCError("CONFLICT", {
        message: "Found group with similar name",
      });
    }
  };

  const getMaxGroupPositionAsync = async (db: BackendContext["db"]) =>
    await db
      .select({ value: max(groups.position) })
      .from(groups)
      .then((result) => result[0]?.value ?? 1);

  const createInitialExternalGroupAsync = async (context: BackendContext, input: { name: string }) => {
    await checkSimilarNameAndThrowAsync(context.db, input.name);

    const maxPosition = await getMaxGroupPositionAsync(context.db);

    const groupId = resources.createId();
    const groupRow = {
      id: groupId,
      name: input.name,
      position: maxPosition + 1,
    };

    await resources.handleTransactionsAsync(context.db, {
      async handleAsync(db, schema) {
        await db.transaction(async (transaction) => {
          const transitionResult = await transaction
            .update(schema.onboarding)
            .set({ previousStep: "group", step: "setup" })
            .where(eq(schema.onboarding.step, "group"));
          const transitionedRows = transitionResult.rowCount ?? 0;
          if (transitionedRows !== 1) {
            throw new ORPCError("CONFLICT", { message: "The initial external group was already created." });
          }
          await transaction.insert(schema.groups).values(groupRow);
          await transaction.insert(schema.groupPermissions).values({ groupId, permission: "admin" });
        });
      },
      handleSync(db) {
        db.transaction((transaction) => {
          const transitionResult = transaction
            .update(onboarding)
            .set({ previousStep: "group", step: "setup" })
            .where(eq(onboarding.step, "group"))
            .run();
          if (transitionResult.changes !== 1) {
            throw new ORPCError("CONFLICT", { message: "The initial external group was already created." });
          }
          transaction.insert(groups).values(groupRow).run();
          transaction.insert(groupPermissions).values({ groupId, permission: "admin" }).run();
        });
      },
    });
  };

  return { createInitialExternalGroupAsync };
}
