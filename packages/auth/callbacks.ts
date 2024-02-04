import { cookies } from "next/headers";
import type { Adapter } from "@auth/core/adapters";
import type { NextAuthConfig } from "next-auth";

import {
  expireDateAfter,
  generateSessionToken,
  sessionMaxAgeInSeconds,
  sessionTokenCookieName,
} from "./session";

export const sessionCallback: NextAuthCallbackOf<"session"> = ({
  session,
  user,
}) => ({
  ...session,
  user: {
    ...session.user,
    id: user.id,
    name: user.name,
  },
});

export const createSignInCallback =
  (
    adapter: Adapter,
    isCredentialsRequest: boolean,
  ): NextAuthCallbackOf<"signIn"> =>
  async ({ user }) => {
    if (!isCredentialsRequest) return true;

    if (!user) return true;

    // https://github.com/nextauthjs/next-auth/issues/6106
    if (!adapter?.createSession) {
      return false;
    }

    const sessionToken = generateSessionToken();
    const sessionExpiry = expireDateAfter(sessionMaxAgeInSeconds);

    await adapter.createSession({
      sessionToken: sessionToken,
      userId: user.id,
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
export type NextAuthCallbackOf<TKey extends keyof NextAuthCallbackRecord> =
  Exclude<NextAuthCallbackRecord[TKey], undefined>;
