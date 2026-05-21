import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import mysql from "mysql2";
import type { Pool as MysqlPool } from "mysql2";
import { Pool as PostgresPool } from "pg";

import { DB_CASING } from "@homarr/core/infrastructure/db/constants";
import { dbEnv } from "@homarr/core/infrastructure/db/env";
import { schema } from "@homarr/db/schema";

const CONNECT_TIMEOUT_MS = 10_000;

const dbConfig = {
  schema,
  casing: DB_CASING,
};

export type CliDatabase = ReturnType<typeof drizzleSqlite<typeof schema>>;

type CliConnection =
  | { driver: "better-sqlite3"; raw: Database.Database; db: CliDatabase }
  | { driver: "mysql2"; raw: MysqlPool; db: CliDatabase }
  | { driver: "node-postgres"; raw: PostgresPool; db: CliDatabase };

let connection: CliConnection | null = null;

const createMysqlPool = () => {
  const poolOptions = {
    maxIdle: 0,
    idleTimeout: 60000,
    enableKeepAlive: true,
    connectTimeout: CONNECT_TIMEOUT_MS,
  };

  if (!dbEnv.HOST) {
    return mysql.createPool({ ...poolOptions, uri: dbEnv.URL });
  }

  return mysql.createPool({
    ...poolOptions,
    host: dbEnv.HOST,
    port: dbEnv.PORT,
    database: dbEnv.NAME,
    user: dbEnv.USER,
    password: dbEnv.PASSWORD,
  });
};

const createPostgresPool = () => {
  const poolOptions = {
    max: 1,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    allowExitOnIdle: true,
  };

  if (!dbEnv.HOST) {
    return new PostgresPool({
      ...poolOptions,
      connectionString: dbEnv.URL,
    });
  }

  return new PostgresPool({
    ...poolOptions,
    host: dbEnv.HOST,
    port: dbEnv.PORT,
    database: dbEnv.NAME,
    user: dbEnv.USER,
    password: dbEnv.PASSWORD,
  });
};

const connectionFactories = {
  "better-sqlite3": (): CliConnection => {
    const raw = new Database(dbEnv.URL);
    const db = drizzleSqlite(raw, dbConfig);
    return { driver: "better-sqlite3", raw, db };
  },
  mysql2: (): CliConnection => {
    const raw = createMysqlPool();
    const db = drizzleMysql(raw, { ...dbConfig, mode: "default" }) as unknown as CliDatabase;
    return { driver: "mysql2", raw, db };
  },
  "node-postgres": (): CliConnection => {
    const raw = createPostgresPool();
    const db = drizzlePostgres({ ...dbConfig, client: raw }) as unknown as CliDatabase;
    return { driver: "node-postgres", raw, db };
  },
};

const closeHandlers: Record<CliConnection["driver"], (entry: CliConnection) => Promise<void>> = {
  "better-sqlite3": async (entry) => {
    (entry as Extract<CliConnection, { driver: "better-sqlite3" }>).raw.close();
  },
  mysql2: (entry) => {
    const pool = (entry as Extract<CliConnection, { driver: "mysql2" }>).raw;
    return new Promise<void>((resolve, reject) => {
      pool.end((err) => (err ? reject(err) : resolve()));
    });
  },
  "node-postgres": async (entry) => {
    await (entry as Extract<CliConnection, { driver: "node-postgres" }>).raw.end();
  },
};

export const getCliDb = (): CliDatabase => {
  if (connection) {
    return connection.db;
  }

  const driver = dbEnv.DRIVER ?? "better-sqlite3";
  connection = connectionFactories[driver]();
  return connection.db;
};

export const closeCliDbAsync = async (): Promise<void> => {
  if (!connection) {
    return;
  }

  const current = connection;
  connection = null;
  await closeHandlers[current.driver](current);
};
