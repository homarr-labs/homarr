import { randomUUID } from "crypto";
import type { Session } from "@auth/core/types";

import type { Database } from "@homarr/db";

import { getCurrentUserPermissionsAsync } from "./callbacks";

export const sessionMaxAgeInSeconds = 30 * 24 * 60 * 60; // 30 days
export const sessionTokenCookieName = "next-auth.session-token";

export const expireDateAfter = (seconds: number) => {
  return new Date(Date.now() + seconds * 1000);
};

export const generateSessionToken = () => {
  return randomUUID();
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
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  return {
    user: {
      ...session.user,
      permissions: await getCurrentUserPermissionsAsync(db, session.user.id),
    },
    expires: session.expires.toISOString(),
  };
};
