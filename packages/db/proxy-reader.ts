import { parse as parseSuperJson } from "superjson";

import { eq } from "drizzle-orm";
import type { SQLWrapper } from "drizzle-orm";
import { defaultServerSettings } from "@homarr/server-settings";
import { dbEnv } from "@homarr/core/infrastructure/db/env";

type ProxyRow = Record<string, unknown>;
type ProxySchema = {
  onboarding: { step: SQLWrapper };
  serverSettings: { settingKey: SQLWrapper; value: SQLWrapper };
};
type ProxyQuery = {
  where(condition: unknown): ProxyQuery;
  limit(count: number): Promise<ProxyRow[]>;
};
type ProxyDatabase = {
  select(selection: Record<string, unknown>): { from(table: unknown): ProxyQuery };
};

type ProxyReader = {
  closeAsync: () => Promise<void>;
  getOnboardingStepAsync: () => Promise<string>;
  getDefaultLocaleAsync: () => Promise<string>;
};

// The proxy is long-lived and only performs two single-row reads. Keep its
// independent pool deliberately smaller than the application pool.
const proxyPoolConnectionLimit = 1;

const createProxyReader = (database: unknown, schema: ProxySchema, closeAsync: () => Promise<void>): ProxyReader => {
  const queryDatabase = database as ProxyDatabase;

  return {
    closeAsync,
    async getOnboardingStepAsync() {
      const rows = await queryDatabase.select({ step: schema.onboarding.step }).from(schema.onboarding).limit(1);
      const step = rows[0]?.step;
      return typeof step === "string" ? step : "start";
    },
    async getDefaultLocaleAsync() {
      const rows = await queryDatabase
        .select({ value: schema.serverSettings.value })
        .from(schema.serverSettings)
        .where(eq(schema.serverSettings.settingKey, "culture"))
        .limit(1);
      const value = rows[0]?.value;
      if (typeof value !== "string") return defaultServerSettings.culture.defaultLocale;

      try {
        const culture: unknown = parseSuperJson(value);
        if (
          typeof culture === "object" &&
          culture !== null &&
          "defaultLocale" in culture &&
          typeof culture.defaultLocale === "string"
        ) {
          return culture.defaultLocale;
        }
      } catch {
        // Fall through to the default when a legacy or malformed value cannot be decoded.
      }

      return defaultServerSettings.culture.defaultLocale;
    },
  };
};

const createProxyReaderAsync = async (): Promise<ProxyReader> => {
  switch (dbEnv.DRIVER) {
    case "better-sqlite3": {
      const [{ default: Database }, { drizzle }, { proxySchema }] = await Promise.all([
        import("better-sqlite3"),
        import("drizzle-orm/better-sqlite3"),
        import("./proxy/sqlite"),
      ]);
      const connection = new Database(dbEnv.URL);
      const database = drizzle(connection, { schema: proxySchema });
      return createProxyReader(database, proxySchema, async () => {
        connection.close();
      });
    }
    case "mysql2": {
      const [{ default: mysql }, { drizzle }, { proxySchema }] = await Promise.all([
        import("mysql2"),
        import("drizzle-orm/mysql2"),
        import("./proxy/mysql"),
      ]);
      const connection = dbEnv.HOST
        ? mysql.createPool({
            host: dbEnv.HOST,
            port: dbEnv.PORT,
            database: dbEnv.NAME,
            user: dbEnv.USER,
            password: dbEnv.PASSWORD,
            connectionLimit: proxyPoolConnectionLimit,
            maxIdle: 1,
            idleTimeout: 60_000,
            enableKeepAlive: true,
          })
        : mysql.createPool({
            uri: dbEnv.URL,
            connectionLimit: proxyPoolConnectionLimit,
            maxIdle: 1,
            idleTimeout: 60_000,
            enableKeepAlive: true,
          });
      const database = drizzle(connection, { schema: proxySchema, mode: "default" });
      return createProxyReader(
        database,
        proxySchema,
        async () =>
          await new Promise<void>((resolve, reject) => {
            connection.end((error) => {
              if (error) reject(error);
              else resolve();
            });
          }),
      );
    }
    case "node-postgres": {
      const [{ Pool }, { drizzle }, { proxySchema }] = await Promise.all([
        import("pg"),
        import("drizzle-orm/node-postgres"),
        import("./proxy/postgresql"),
      ]);
      const connection = dbEnv.HOST
        ? new Pool({
            host: dbEnv.HOST,
            port: dbEnv.PORT,
            database: dbEnv.NAME,
            user: dbEnv.USER,
            password: dbEnv.PASSWORD,
            max: proxyPoolConnectionLimit,
            idleTimeoutMillis: 60_000,
            allowExitOnIdle: false,
          })
        : new Pool({
            connectionString: dbEnv.URL,
            max: proxyPoolConnectionLimit,
            idleTimeoutMillis: 60_000,
            allowExitOnIdle: false,
          });
      const database = drizzle({ client: connection, schema: proxySchema });
      return createProxyReader(database, proxySchema, async () => {
        await connection.end();
      });
    }
  }
};

let proxyReaderPromise: Promise<ProxyReader> | null = null;

const getProxyReaderAsync = () => {
  if (!proxyReaderPromise) {
    proxyReaderPromise = createProxyReaderAsync().catch((error: unknown) => {
      proxyReaderPromise = null;
      throw error;
    });
  }
  return proxyReaderPromise;
};

export const getOnboardingStepForProxyAsync = async () => (await getProxyReaderAsync()).getOnboardingStepAsync();

export const getDefaultLocaleForProxyAsync = async () => (await getProxyReaderAsync()).getDefaultLocaleAsync();

export const closeProxySettingsReaderAsync = async () => {
  if (!proxyReaderPromise) return;
  const reader = await proxyReaderPromise;
  proxyReaderPromise = null;
  await reader.closeAsync();
};
