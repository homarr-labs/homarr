import { TRPCError } from "@trpc/server";

import { canManageGroupMembersLocally, isGroupMembershipManagedLocally } from "@homarr/auth/server";
import type { Database } from "@homarr/db";
import { inArray } from "@homarr/db";
import { users } from "@homarr/db/schema";
import type { SupportedAuthProvider } from "@homarr/definitions";

export const throwIfGroupMembersCannotBeManagedLocally = () => {
  if (!canManageGroupMembersLocally()) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Group members cannot be managed locally",
    });
  }
};

export const getUsersOrThrowAsync = async (db: Database, userIds: string[]) => {
  if (userIds.length === 0) return [];

  const dbUsers = await db.query.users.findMany({
    columns: {
      id: true,
      provider: true,
    },
    where: inArray(users.id, userIds),
  });

  if (dbUsers.length !== userIds.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }

  return dbUsers;
};

export const throwIfUserMembershipsNotManagedLocally = (dbUsers: { provider: SupportedAuthProvider }[]) => {
  if (dbUsers.some((user) => !isGroupMembershipManagedLocally(user.provider))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "User's provider is not managed locally",
    });
  }
};
