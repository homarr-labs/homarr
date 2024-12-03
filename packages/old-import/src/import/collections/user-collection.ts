import { createId } from "@homarr/db";
import { credentialsAdminGroup } from "@homarr/definitions";
import { mapAndDecryptUsers } from "../../mappers/map-user";
import type { OldmarrImportUser } from "../../user-schema";
import { createDbInsertCollection } from "./common";

export const createUserInsertCollection = (importUsers: OldmarrImportUser[], encryptionToken: string | null) => {
    const insertCollection = createDbInsertCollection();
  
    if (encryptionToken === "temp" || encryptionToken === null) {
      return insertCollection;
    }
  
    const preparedUsers = mapAndDecryptUsers(importUsers, encryptionToken);
    preparedUsers.forEach((user) => insertCollection.users.push(user));
  
    if (!preparedUsers.some((user) => user.isAdmin)) {
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
  
    preparedUsers
        .filter((user) => user.isAdmin)
        .forEach((user) => {
          insertCollection.groupMembers.push({
            groupId: adminGroupId,
            userId: user.id,
          });
        });
  
    return insertCollection;
  };