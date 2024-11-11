import { createId } from "@paralleldrive/cuid2";

import type { GroupPermissionKey } from "@homarr/definitions";
import { credentialsAdminGroup } from "@homarr/definitions";

import { eq } from "..";
import type { Database } from "..";
import { groupPermissions, groups } from "../schema/sqlite";

export const createGroupAsync = async (db: Database, name: string) => {
  const id = createId();

  await db.insert(groups).values({
    id,
    name,
  });

  return id;
};

export const getGroupByNameAsync = async (db: Database, name: string) => {
  return db.query.groups.findFirst({
    where: eq(groups.name, name),
  });
};

export const createDefaultAdminGroupIfNotExistsAsync = async (db: Database) => {
  const existing = await getGroupByNameAsync(db, credentialsAdminGroup);
  if (existing) {
    return existing.id;
  }

  const createdId = await createGroupAsync(db, credentialsAdminGroup);
  await addPermissionsForGroupAsync(db, createdId, ["admin"]);
  return createdId;
};

const addPermissionsForGroupAsync = async (db: Database, groupId: string, permissions: GroupPermissionKey[]) => {
  if (permissions.length === 0) {
    return;
  }

  await db.insert(groupPermissions).values(
    permissions.map((permission) => ({
      groupId,
      permission,
    })),
  );
};
