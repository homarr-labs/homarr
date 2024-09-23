import { cookies } from "next/headers";
import type { Adapter } from "@auth/core/adapters";
import dayjs from "dayjs";
import type { NextAuthConfig } from "next-auth";

import type { Database } from "@homarr/db";
import { db, eq, inArray } from "@homarr/db";
import { groupMembers, groupPermissions, users } from "@homarr/db/schema/sqlite";
import { getPermissionsWithChildren } from "@homarr/definitions";

import { env } from "./env.mjs";
import { expireDateAfter, generateSessionToken, sessionTokenCookieName } from "./session";

export const getCurrentUserPermissionsAsync = async (db: Database, userId: string) => {
  const dbGroupMembers = await db.query.groupMembers.findMany({
    where: eq(groupMembers.userId, userId),
  });
  const groupIds = dbGroupMembers.map((groupMember) => groupMember.groupId);

  if (groupIds.length === 0) return [];

  const dbGroupPermissions = await db
    .selectDistinct({
      permission: groupPermissions.permission,
    })
    .from(groupPermissions)
    .where(inArray(groupPermissions.groupId, groupIds));
  const permissionKeys = dbGroupPermissions.map(({ permission }) => permission);

  return getPermissionsWithChildren(permissionKeys);
};

export const createSessionCallback = (db: Database): NextAuthCallbackOf<"session"> => {
  return async ({ session, user }) => {
    const additionalProperties = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        colorScheme: true,
      },
    });

    return {
      ...session,
      user: {
        ...session.user,
        ...additionalProperties,
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
    if (!adapter.createSession || !user.id) {
      return false;
    }

    const sessionToken = generateSessionToken();
    const sessionExpires = expireDateAfter(env.AUTH_SESSION_EXPIRY_TIME);

    await adapter.createSession({
      sessionToken,
      userId: user.id,
      expires: sessionExpires,
    });

    cookies().set(sessionTokenCookieName, sessionToken, {
      path: "/",
      expires: sessionExpires,
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        colorScheme: true,
      },
    });

    if (!dbUser) return false;

    // We use a cookie as localStorage is not shared with server (otherwise flickering would occur)
    cookies().set("homarr-color-scheme", dbUser.colorScheme, {
      path: "/",
      expires: dayjs().add(1, "year").toDate(),
    });

    return true;
  };

type NextAuthCallbackRecord = Exclude<NextAuthConfig["callbacks"], undefined>;
export type NextAuthCallbackOf<TKey extends keyof NextAuthCallbackRecord> = Exclude<
  NextAuthCallbackRecord[TKey],
  undefined
>;
