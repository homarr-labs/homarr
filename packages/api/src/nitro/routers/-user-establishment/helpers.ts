import { ORPCError } from "@orpc/server";
import type { z } from "zod/v4";

import { hashPasswordAsync } from "@homarr/auth/security";
import type { Database } from "@homarr/db";
import type { SupportedAuthProvider } from "@homarr/definitions";
import type { userBaseCreateSchema } from "@homarr/validation/user";

import type { PreparedEstablishmentUser, PreparedUserInitialization, UserEstablishmentResources } from "./resources";

export function createUserEstablishmentHelpers(resources: UserEstablishmentResources) {
  const {
    operators: { and, eq, max },
  } = resources;

  async function checkUsernameAlreadyTakenAndThrowAsync(
    db: Database,
    provider: SupportedAuthProvider,
    username: string,
    ignoreId?: string,
  ) {
    const { users } = resources.getSchemaForDatabase(db);
    const user = await db.query.users.findFirst({ where: and(eq(users.name, username), eq(users.provider, provider)) });
    if (!user) return;
    if (ignoreId && user.id === ignoreId) return;
    throw new ORPCError("CONFLICT", { message: "Username already taken" });
  }

  async function getMaxGroupPositionAsync(db: Database) {
    const { groups } = resources.getSchemaForDatabase(db);
    return await db
      .select({ value: max(groups.position) })
      .from(groups)
      .then((result) => result[0]?.value ?? 1);
  }

  async function createUserAsync(db: Database, input: Omit<z.infer<typeof userBaseCreateSchema>, "groupIds">) {
    const hashedPassword = await hashPasswordAsync(input.password);
    const userId = resources.createId();
    const { users } = resources.getSchemaForDatabase(db);
    await db.insert(users).values({ id: userId, name: input.username, email: input.email, password: hashedPassword });
    return userId;
  }

  async function initializeUserAsync(db: Database, prepared: PreparedUserInitialization) {
    const { userRow, groupRow, nextStep } = prepared;
    const groupId = groupRow.id;
    const userId = userRow.id;
    const binding = resources.nativeDatabase(db);
    if (binding.kind === "postgresql") {
      const { schema } = binding;
      await binding.db.transaction(async (transaction) => {
        await transaction.insert(schema.users).values(userRow);
        await transaction.insert(schema.groups).values(groupRow);
        await transaction.insert(schema.groupPermissions).values({ groupId, permission: "admin" });
        await transaction.insert(schema.groupMembers).values({ groupId, userId });
        await transaction.update(schema.onboarding).set({ previousStep: "user", step: nextStep });
      });
      return;
    }
    const { users, groups, groupPermissions, groupMembers, onboarding } = binding.schema;
    binding.db.transaction((transaction) => {
      transaction.insert(users).values(userRow).run();
      transaction.insert(groups).values(groupRow).run();
      transaction.insert(groupPermissions).values({ groupId, permission: "admin" }).run();
      transaction.insert(groupMembers).values({ groupId, userId }).run();
      transaction.update(onboarding).set({ previousStep: "user", step: nextStep }).run();
    });
  }

  async function registerUserAsync(
    db: Database,
    user: PreparedEstablishmentUser,
    inviteWhere: ReturnType<UserEstablishmentResources["operators"]["and"]>,
  ) {
    const binding = resources.nativeDatabase(db);
    if (binding.kind === "postgresql") {
      const { schema } = binding;
      await binding.db.transaction(async (trx) => {
        await trx.insert(schema.users).values(user);
        const queryResult = await trx.delete(schema.invites).where(inviteWhere);
        const count = queryResult.rowCount ?? 0;
        if (count === 0) {
          throw new ORPCError("FORBIDDEN", { message: "Invalid invite" });
        }
      });
      return;
    }
    const { users, invites } = binding.schema;
    binding.db.transaction((trx) => {
      trx.insert(users).values(user).run();
      const result = trx.delete(invites).where(inviteWhere).run();
      if (result.changes === 0) {
        throw new ORPCError("FORBIDDEN", { message: "Invalid invite" });
      }
    });
  }

  return {
    checkUsernameAlreadyTakenAndThrowAsync,
    getMaxGroupPositionAsync,
    createUserAsync,
    initializeUserAsync,
    registerUserAsync,
  };
}
