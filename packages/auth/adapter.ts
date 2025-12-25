import type { Adapter } from "@auth/core/adapters";
import { DrizzleAdapter } from "@auth/drizzle-adapter";

import type { Database } from "@homarr/db";
import { and, eq } from "@homarr/db";
import { accounts, sessions, users } from "@homarr/db/schema";
import type { SupportedAuthProvider } from "@homarr/definitions";

// Use better-sqlite3 for Auth.js DrizzleAdapter compatibility
// @auth/drizzle-adapter doesn't support libsql yet, so we use better-sqlite3 for the adapter
// But we still use the main db (libsql) for custom queries like getUserByEmail
export const createAdapter = (db: Database, provider: SupportedAuthProvider | "unknown"): Adapter => {
  // Get the actual database instance (not the proxy) for DrizzleAdapter
  // DrizzleAdapter needs to inspect the database type, so it needs the real instance
  // This is called at runtime when adapter is created, not at module load

  // Use actualAuthDb (better-sqlite3) for DrizzleAdapter - it doesn't support libsql
  const drizzleAdapter = DrizzleAdapter(db, { usersTable: users, sessionsTable: sessions, accountsTable: accounts });

  return {
    ...drizzleAdapter,
    // We override the default implementation as we want to have a provider
    // flag in the user instead of the account to not intermingle users from different providers
    // eslint-disable-next-line no-restricted-syntax
    getUserByEmail: async (email) => {
      if (provider === "unknown") {
        throw new Error("Unable to get user by email for unknown provider");
      }

      const user = await db.query.users.findFirst({
        where: and(eq(users.email, email), eq(users.provider, provider)),
        columns: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          image: true,
        },
      });

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
