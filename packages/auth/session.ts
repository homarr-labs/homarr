import type { Session } from "next-auth";

import { generateSecureRandomToken } from "@homarr/common/server";
import type { Database } from "@homarr/db";

import { getCurrentUserGroupsAsync, getCurrentUserPermissionsAsync } from "./callbacks";
import { env } from "./env";

// Prefixed (AUTH_COOKIE_PREFIX, default "homarr") to avoid cookie collisions
// with other Auth.js apps on the same host. See https://github.com/homarr-labs/homarr/issues/5773
export const sessionTokenCookieName = `${env.AUTH_COOKIE_PREFIX}.session-token`;

export const expireDateAfter = (seconds: number) => {
  return new Date(Date.now() + seconds * 1000);
};

export const generateSessionToken = () => {
  return generateSecureRandomToken(48);
};

export const getSessionFromTokenAsync = async (db: Database, token: string | undefined): Promise<Session | null> => {
  if (!token) {
    return null;
  }

  const session = await db.query.sessions.findFirst({
    where: ({ sessionToken }, { eq }) => eq(sessionToken, token),
    columns: {
      expires: true,
    },
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
          colorScheme: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  const [permissions, groupNames] = await Promise.all([
    getCurrentUserPermissionsAsync(db, session.user.id),
    getCurrentUserGroupsAsync(db, session.user.id),
  ]);

  return {
    user: {
      ...session.user,
      permissions,
      groups: groupNames,
    },
    expires: session.expires.toISOString(),
  };
};
