import { cookies } from "next/headers";
import type { Adapter } from "@auth/core/adapters";
import type { NextAuthConfig } from "next-auth";

import type { Database } from "@homarr/db";
import { eq, inArray } from "@homarr/db";
import { groupMembers, groupPermissions } from "@homarr/db/schema/sqlite";
import { getPermissionsWithChildren } from "@homarr/definitions";

import { expireDateAfter, generateSessionToken, sessionMaxAgeInSeconds, sessionTokenCookieName } from "./session";

export const getCurrentUserPermissionsAsync = async (db: Database, userId: string) => {
  const dbGroupMembers = await db.query.groupMembers.findMany({
    where: eq(groupMembers.userId, userId),
  });
  const groupIds = dbGroupMembers.map((groupMember) => groupMember.groupId);
  const dbGroupPermissions = await db
    .selectDistinct({
      permission: groupPermissions.permission,
    })
    .from(groupPermissions)
    .where(groupIds.length > 0 ? inArray(groupPermissions.groupId, groupIds) : undefined);
  const permissionKeys = dbGroupPermissions.map(({ permission }) => permission);

  return getPermissionsWithChildren(permissionKeys);
};

export const createSessionCallback = (db: Database): NextAuthCallbackOf<"session"> => {
  return async ({ session, user }) => {
    return {
      ...session,
      user: {
        ...session.user,
        id: user.id,
        name: user.name,
        permissions: await getCurrentUserPermissionsAsync(db, user.id),
      },
    };
  };
};

export const createSignInCallback =
  (adapter: Adapter, isCredentialsRequest: boolean): NextAuthCallbackOf<"signIn"> =>
  async ({ user }) => {
    if (!isCredentialsRequest) return true;

    // https://github.com/nextauthjs/next-auth/issues/6106
    if (!adapter.createSession) {
      return false;
    }

    const sessionToken = generateSessionToken();
    const sessionExpiry = expireDateAfter(sessionMaxAgeInSeconds);

    await adapter.createSession({
      sessionToken,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      userId: user.id!,
      expires: sessionExpiry,
    });

    cookies().set(sessionTokenCookieName, sessionToken, {
      path: "/",
      expires: sessionExpiry,
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });

    return true;
  };

type NextAuthCallbackRecord = Exclude<NextAuthConfig["callbacks"], undefined>;
export type NextAuthCallbackOf<TKey extends keyof NextAuthCallbackRecord> = Exclude<
  NextAuthCallbackRecord[TKey],
  undefined
>;
