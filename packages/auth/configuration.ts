import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";
import { cookies } from "next/headers";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { db } from "@homarr/db";
import type { SupportedAuthProvider } from "@homarr/definitions";

import { createAdapter } from "./adapter";
import { createSessionCallback } from "./callbacks";
import { env } from "./env.mjs";
import { createSignInEventHandler } from "./events";
import { createCredentialsConfiguration, createLdapConfiguration } from "./providers/credentials/credentials-provider";
import { EmptyNextAuthProvider } from "./providers/empty/empty-provider";
import { filterProviders } from "./providers/filter-providers";
import { OidcProvider } from "./providers/oidc/oidc-provider";
import { createRedirectUri } from "./redirect";
import { expireDateAfter, generateSessionToken, sessionTokenCookieName } from "./session";

// See why it's unknown in the [...nextauth]/route.ts file
export const createConfiguration = (
  provider: SupportedAuthProvider | "unknown",
  headers: ReadonlyHeaders | null,
  useSecureCookies: boolean,
) => {
  const adapter = createAdapter(db, provider);
  return NextAuth({
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
    cookies: {
      sessionToken: {
        name: sessionTokenCookieName,
      },
    },
    adapter,
    providers: filterProviders([
      Credentials(createCredentialsConfiguration(db)),
      Credentials(createLdapConfiguration(db)),
      EmptyNextAuthProvider(),
      OidcProvider(headers),
    ]),
    callbacks: {
      session: createSessionCallback(db),
      // eslint-disable-next-line no-restricted-syntax
      signIn: async ({ user }) => {
        /**
         * For credentials provider only jwt is supported by default
         * so we have to create the session and set the cookie manually.
         */
        if (provider !== "credentials" && provider !== "ldap") {
          return true;
        }

        if (!adapter.createSession || !user.id) {
          return false;
        }

        const expires = expireDateAfter(env.AUTH_SESSION_EXPIRY_TIME);
        const sessionToken = generateSessionToken();
        await adapter.createSession({
          sessionToken,
          expires,
          userId: user.id,
        });

        cookies().set(sessionTokenCookieName, sessionToken, {
          path: "/",
          expires: expires,
          httpOnly: true,
          sameSite: "lax",
          secure: useSecureCookies,
        });

        return true;
      },
    },
    events: {
      signIn: createSignInEventHandler(db),
    },
    redirectProxyUrl: createRedirectUri(headers, "/api/auth"),
    secret: "secret-is-not-defined-yet", // TODO: This should be added later
    session: {
      strategy: "database",
      maxAge: env.AUTH_SESSION_EXPIRY_TIME,
      generateSessionToken,
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
};
