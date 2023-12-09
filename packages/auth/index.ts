import Credentials from "@auth/core/providers/credentials";
import type { DefaultSession } from "@auth/core/types";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";

import { db } from "@alparr/db";

import { credentialsConfiguration } from "./providers/credentials";
import EmptyNextAuthProvider from "./providers/empty";
import { expireDateAfter, generateSessionToken } from "./session";

export type { Session } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

const adapter = DrizzleAdapter(db);
const sessionMaxAgeInSeconds = 30 * 24 * 60 * 60; // 30 days

export const { handlers, auth } = NextAuth({
  adapter,
  providers: [Credentials(credentialsConfiguration), EmptyNextAuthProvider()],
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
        name: user.name,
      },
    }),
    signIn: async ({ user }) => {
      // TODO: should be added again
      // if (!isCredentialsRequest(req)) return true;

      if (!user) return true;

      const sessionToken = generateSessionToken();
      const sessionExpiry = expireDateAfter(sessionMaxAgeInSeconds);

      // https://github.com/nextauthjs/next-auth/issues/6106
      if (!adapter?.createSession) {
        return false;
      }

      await adapter.createSession({
        sessionToken: sessionToken,
        userId: user.id,
        expires: sessionExpiry,
      });

      // res.headers.set('set-cookie', `next-auth.session-token=${sessionToken}; path=/; expires=${sessionExpiry.toUTCString()}; httponly; samesite=lax; secure`)

      return true;
    },
  },
  session: {
    strategy: "database",
    maxAge: sessionMaxAgeInSeconds,
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  /*jwt: {
    encode(params) {
      if (!isCredentialsRequest(req)) {
        return encode(params);
      }

      const cookie = req.cookies.get('next-auth.session-token')?.value;
      return cookie ?? '';
    },

    async decode(params) {
      if (!isCredentialsRequest(req)) {
        return decode(params);
      }

      return null;
    },
  },*/
});

/*const isCredentialsRequest = (req: NextRequest): boolean => {
  return req.method === 'POST';
  /*const nextAuthQueryParams = req.query.nextauth as ['callback', 'credentials'];
  return (
    nextAuthQueryParams.includes('callback') &&
    nextAuthQueryParams.includes('credentials') &&
    req.method === 'POST'
  );*/
//};*/
