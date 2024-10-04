import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";
import { cookies } from "next/headers";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { db } from "@homarr/db";

import { adapter } from "./adapter";
import { createSessionCallback, createSignInCallback } from "./callbacks";
import { env } from "./env.mjs";
import { createCredentialsConfiguration } from "./providers/credentials/credentials-provider";
import { EmptyNextAuthProvider } from "./providers/empty/empty-provider";
import { filterProviders } from "./providers/filter-providers";
import { OidcProvider } from "./providers/oidc/oidc-provider";
import { createRedirectUri } from "./redirect";
import { sessionTokenCookieName } from "./session";

export const createConfiguration = (isCredentialsRequest: boolean, headers: ReadonlyHeaders | null) =>
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
    providers: filterProviders([
      Credentials(createCredentialsConfiguration(db)),
      EmptyNextAuthProvider(),
      OidcProvider(headers),
    ]),
    callbacks: {
      session: createSessionCallback(db),
      signIn: createSignInCallback(adapter, db, isCredentialsRequest),
    },
    redirectProxyUrl: createRedirectUri(headers, "/api/auth"),
    secret: "secret-is-not-defined-yet", // TODO: This should be added later
    session: {
      strategy: "database",
      maxAge: env.AUTH_SESSION_EXPIRY_TIME,
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
