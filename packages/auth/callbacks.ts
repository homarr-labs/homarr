import dayjs from "dayjs";
import type { NextAuthConfig } from "next-auth";

import type { Session } from "@homarr/auth";
import type { Database } from "@homarr/db";
import { eq } from "@homarr/db";
import { groupMembers, groupPermissions, groups, users } from "@homarr/db/schema";
import { getPermissionsWithChildren } from "@homarr/definitions";

export const getCurrentUserPermissionsAsync = async (db: Database, userId: string) => {
  const dbGroupPermissions = await db
    .selectDistinct({
      permission: groupPermissions.permission,
    })
    .from(groupPermissions)
    .innerJoin(groupMembers, eq(groupPermissions.groupId, groupMembers.groupId))
    .where(eq(groupMembers.userId, userId));
  const permissionKeys = dbGroupPermissions.map(({ permission }) => permission);

  return getPermissionsWithChildren(permissionKeys);
};

export const getCurrentUserGroupsAsync = async (db: Database, userId: string) => {
  const dbUserGroups = await db
    .select({ name: groups.name })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, userId));

  return dbUserGroups.map(({ name }) => name);
};

export const createSessionAsync = async (
  db: Database,
  user: { id: string; email: string | null },
): Promise<Session> => {
  const [permissions, groupNames] = await Promise.all([
    getCurrentUserPermissionsAsync(db, user.id),
    getCurrentUserGroupsAsync(db, user.id),
  ]);
  return {
    expires: dayjs().add(1, "day").toISOString(),
    user: {
      ...user,
      email: user.email ?? "",
      permissions,
      groups: groupNames,
      colorScheme: "auto",
    },
  } as Session;
};

export const createSessionCallback = (db: Database): NextAuthCallbackOf<"session"> => {
  return async ({ session, user }) => {
    const [additionalProperties, permissions, groupNames] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, user.id),
        columns: {
          colorScheme: true,
        },
      }),
      getCurrentUserPermissionsAsync(db, user.id),
      getCurrentUserGroupsAsync(db, user.id),
    ]);

    return {
      ...session,
      user: {
        ...session.user,
        ...additionalProperties,
        id: user.id,
        name: user.name,
        permissions,
        groups: groupNames,
      },
    };
  };
};

type NextAuthCallbackRecord = Exclude<NextAuthConfig["callbacks"], undefined>;
export type NextAuthCallbackOf<TKey extends keyof NextAuthCallbackRecord> = Exclude<
  NextAuthCallbackRecord[TKey],
  undefined
>;
