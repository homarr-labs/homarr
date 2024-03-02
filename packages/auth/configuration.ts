import { cookies } from "next/headers";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { db } from "@homarr/db";

import { createSignInCallback, sessionCallback } from "./callbacks";
import { createCredentialsConfiguration } from "./providers/credentials";
import { EmptyNextAuthProvider } from "./providers/empty";
import { sessionMaxAgeInSeconds, sessionTokenCookieName } from "./session";

const adapter = DrizzleAdapter(db);

export const createConfiguration = (isCredentialsRequest: boolean) =>
  NextAuth({
    logger: {
      error: (code, ...message) => {
        // Remove the big error message for failed login attempts
        // as it is not useful for the user.
        if (code.name === "CredentialsSignin") {
          console.warn("The login attempt of a user was not successful.");
          return;
        }

        console.error(code, ...message);
      },
    },
    trustHost: true,
    adapter,
    providers: [
      Credentials(createCredentialsConfiguration(db)),
      EmptyNextAuthProvider(),
    ],
    callbacks: {
      session: sessionCallback,
      signIn: createSignInCallback(adapter, isCredentialsRequest),
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
        const cookie = cookies().get(sessionTokenCookieName)?.value;
        return cookie ?? "";
      },

      decode() {
        return null;
      },
    },
  });
