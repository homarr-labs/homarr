import { createId } from "@paralleldrive/cuid2";

import { hashPasswordAsync } from "../../packages/auth/security";
import { getMaxGroupPositionAsync } from "../../packages/db/queries";
import * as sqliteSchema from "../../packages/db/schema/sqlite";
import { credentialsAdminGroup } from "../../packages/definitions/src/group";

import type { SqliteDatabase } from "./e2e-db";

export interface SeedAdminUserInput {
  username: string;
  password: string;
}

export const seedAdminUserAsync = async (db: SqliteDatabase, input: SeedAdminUserInput) => {
  const existingOnboarding = await db.query.onboarding.findFirst();
  if (existingOnboarding) {
    await db.update(sqliteSchema.onboarding).set({
      step: "finish",
      previousStep: "settings",
    });
  } else {
    await db.insert(sqliteSchema.onboarding).values({
      id: createId(),
      step: "finish",
      previousStep: "settings",
    });
  }

  const userId = createId();
  const groupId = createId();
  const maxPosition = await getMaxGroupPositionAsync(db);

  await db.insert(sqliteSchema.users).values({
    id: userId,
    name: input.username,
    provider: "credentials",
    password: await hashPasswordAsync(input.password),
  });

  await db.insert(sqliteSchema.groups).values({
    id: groupId,
    name: credentialsAdminGroup,
    ownerId: userId,
    position: maxPosition + 1,
  });

  await db.insert(sqliteSchema.groupPermissions).values({
    groupId,
    permission: "admin",
  });

  await db.insert(sqliteSchema.groupMembers).values({
    groupId,
    userId,
  });

  return { userId, groupId };
};
