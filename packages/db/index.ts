import { createDb } from "@homarr/core/infrastructure/db";

// TODO: implement lazy-loading for DB?

/*
const init = () => {
  // Skip initialization during build time (Next.js static generation)
  // Check if we're in a build environment where database might not be available
  if (process.env.NODE_ENV === "production" && process.env.SKIP_ENV_VALIDATION === "true" && !process.env.DB_URL) {
    // During build, database might not be available - skip initialization
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!connection) {
    try {
      switch (env.DB_DRIVER) {
        case "libsql":
          initLibsql();
          break;
        case "mysql2":
          initMySQL2();
          break;
        case "node-postgres":
          initNodePostgres();
          break;
        case "better-sqlite3":
          initBetterSqlite();
          break;
        default:
          initLibsql();
          break;
      }
    } catch (error) {
      // During build, database might not be available - log and continue
      if (process.env.NODE_ENV === "production" && process.env.SKIP_ENV_VALIDATION === "true") {
        logger.warn("Database initialization skipped during build:", error);
        return;
      }
      throw error;
    }
  }
};

=======================


// Lazy initialization - only initialize when database is actually accessed
// This prevents database connection attempts during Next.js build phase
let initialized = false;
const ensureInitialized = () => {
  if (!initialized && !connection) {
    init();
    initialized = true;
  }
};

// Initialize immediately only if not in build context
if (typeof process !== "undefined" && process.env.NODE_ENV !== "production" || process.env.DB_URL) {
  init();
  initialized = true;
}

 */

/*
TODO: should we implement this? auth DB?

// Separate better-sqlite3 connection for Auth.js compatibility
// Auth.js DrizzleAdapter doesn't support libsql yet, so we use better-sqlite3 for auth
export let authDatabase: BetterSQLite3Database<typeof sqliteSchema> | undefined;

// Export getter that ensures initialization
export const getDatabase = (): HomarrDatabase => {
  ensureInitialized();
  if (!database) {
    throw new Error("Database not initialized. Ensure DB_URL and DB_DRIVER are set.");
  }
  return database;
};

// Get auth database (better-sqlite3 for Auth.js compatibility)
// Lazy initialization - only create when actually needed
// This is called at runtime, not at module load, so directory should exist
export const getAuthDatabase = (): BetterSQLite3Database<typeof sqliteSchema> => {
  if (!authDatabase) {
    // Create a better-sqlite3 connection for auth, using the same database file
    let dbUrl = env.DB_URL || "/appdata/db/db.sqlite";

    // better-sqlite3 doesn't support "file:" prefix - it needs a plain file path
    // Strip "file:" prefix if present
    if (dbUrl.startsWith("file:")) {
      dbUrl = dbUrl.replace("file:", "");
    }

    // The run.sh script creates /appdata/db before processes start
    // If directory doesn't exist, better-sqlite3 will fail with a clear error
    const authConnection = new Database(dbUrl);
    authDatabase = drizzleSqlite(authConnection, {
      schema: sqliteSchema,
      logger: new WinstonDrizzleLogger(),
      casing: "snake_case",
    });
  }
  return authDatabase;
};
 */

import { schema } from "./schema";


export * from "drizzle-orm";
export type { HomarrDatabaseMysql, HomarrDatabasePostgresql } from "./driver";

export const db = createDb(schema);

export type Database = typeof db;

export { handleDiffrentDbDriverOperationsAsync as handleTransactionsAsync } from "./transactions";

/*
* REVIEW
*
* import { database, getDatabase, getAuthDatabase } from "./driver";

// Re-export getAuthDatabase for use in auth adapter
export { getAuthDatabase } from "./driver";

export * from "drizzle-orm";

// Lazy database access - ensures database is initialized when accessed
// This prevents connection attempts during Next.js build phase
export const db = new Proxy({} as any, {
  get(_target, prop) {
    const dbInstance = database || getDatabase();
    return dbInstance[prop as keyof typeof dbInstance];
  },
});

// Export auth database for Auth.js compatibility
// Uses better-sqlite3 because @auth/drizzle-adapter doesn't support libsql
// Lazy initialization - only create when actually accessed
// This prevents database connection attempts during module load (e.g., in bundled .cjs files)
let _authDbInstance: any = null;

export const authDb = new Proxy({} as any, {
  get(_target, prop) {
    if (!_authDbInstance) {
      _authDbInstance = getAuthDatabase();
    }
    const value = _authDbInstance[prop as keyof typeof _authDbInstance];
    // If it's a function, bind it to the instance
    if (typeof value === "function") {
      return value.bind(_authDbInstance);
    }
    return value;
  },
});

export type Database = typeof db;
* */
