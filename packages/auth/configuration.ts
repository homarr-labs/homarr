import { cookies } from "next/headers";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { db } from "@homarr/db";

import { credentialsConfiguration } from "./providers/credentials";
import { EmptyNextAuthProvider } from "./providers/empty";
import { expireDateAfter, generateSessionToken } from "./session";

const adapter = DrizzleAdapter(db);
const sessionMaxAgeInSeconds = 30 * 24 * 60 * 60; // 30 days

export const createConfiguration = (isCredentialsRequest: boolean) =>
  NextAuth({
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
        if (!isCredentialsRequest) return true;

        if (!user) return true;

        const sessionToken = generateSessionToken();
        const sessionExpiry = expireDateAfter(sessionMaxAgeInSeconds);

        // https://github.com/nextauthjs/next-auth/issues/6106
        if (!adapter?.createSession) {
          return false;
        }

        await adapter.createSession({
          sessionToken: sessionToken,
          userId: user.id!,
          expires: sessionExpiry,
        });

        cookies().set("next-auth.session-token", sessionToken, {
          path: "/",
          expires: sessionExpiry,
          httpOnly: true,
          sameSite: "lax",
          secure: true,
        });

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
    jwt: {
      encode() {
        const cookie = cookies().get("next-auth.session-token")?.value;
        return cookie ?? "";
      },

      decode() {
        return null;
      },
    },
  });
