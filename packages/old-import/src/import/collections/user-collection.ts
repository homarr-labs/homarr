import { createId } from "@homarr/db";
import { credentialsAdminGroup } from "@homarr/definitions";
import { logger } from "@homarr/log";

import { mapAndDecryptUsers } from "../../mappers/map-user";
import type { OldmarrImportUser } from "../../user-schema";
import { createDbInsertCollection } from "./common";

export const createUserInsertCollection = (
  importUsers: OldmarrImportUser[],
  encryptionToken: string | null | undefined,
) => {
  const insertCollection = createDbInsertCollection(["users", "groups", "groupMembers", "groupPermissions"]);

  if (importUsers.length === 0) {
    return insertCollection;
  }

  logger.info(`Preparing users for insert collection count=${importUsers.length}`);

  if (encryptionToken === null || encryptionToken === undefined) {
    logger.debug("Skipping user decryption due to missing token");
    return insertCollection;
  }

  const preparedUsers = mapAndDecryptUsers(importUsers, encryptionToken);
  preparedUsers.forEach((user) => insertCollection.users.push(user));
  logger.debug(`Added users to insert collection count=${insertCollection.users.length}`);

  if (!preparedUsers.some((user) => user.isAdmin)) {
    logger.warn("No admin users found, skipping admin group creation");
    return insertCollection;
  }

  const adminGroupId = createId();
  insertCollection.groups.push({
    id: adminGroupId,
    name: credentialsAdminGroup,
  });

  insertCollection.groupPermissions.push({
    groupId: adminGroupId,
    permission: "admin",
  });

  const admins = preparedUsers.filter((user) => user.isAdmin);

  admins.forEach((user) => {
    insertCollection.groupMembers.push({
      groupId: adminGroupId,
      userId: user.id,
    });
  });

  logger.info(
    `Added admin group and permissions to insert collection adminGroupId=${adminGroupId} adminUsersCount=${admins.length}`,
  );

  return insertCollection;
};
