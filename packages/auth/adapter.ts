import type { Adapter } from "@auth/core/adapters";
import { DrizzleAdapter } from "@auth/drizzle-adapter";

import type { Database } from "@homarr/db";
import { and, eq } from "@homarr/db";
import { accounts, sessions, users } from "@homarr/db/schema";
import type { SupportedAuthProvider } from "@homarr/definitions";

export const createAdapter = (
  db: Database,
  provider: SupportedAuthProvider | "unknown",
  enableDangerousCredentialsLinking = false,
): Adapter => {
  const drizzleAdapter = DrizzleAdapter(db, { usersTable: users, sessionsTable: sessions, accountsTable: accounts });

  return {
    ...drizzleAdapter,
    // Keep users isolated by their primary provider. The explicit credentials-linking
    // opt-in is the only exception and keeps credentials as the primary provider.
    // eslint-disable-next-line no-restricted-syntax
    getUserByEmail: async (email) => {
      if (provider === "unknown") {
        throw new Error("Unable to get user by email for unknown provider");
      }

      let user = await db.query.users.findFirst({
        where: and(eq(users.email, email), eq(users.provider, provider)),
        columns: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          image: true,
        },
      });

      if (!user && provider === "oidc" && enableDangerousCredentialsLinking) {
        user = await db.query.users.findFirst({
          where: and(eq(users.email, email), eq(users.provider, "credentials")),
          columns: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            image: true,
          },
        });
      }

      if (!user) {
        return null;
      }

      return {
        ...user,
        // We allow null as email for credentials provider
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        email: user.email!,
      };
    },
  };
};
