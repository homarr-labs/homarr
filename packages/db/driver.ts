import type { Database as BetterSqlite3Connection } from "better-sqlite3";
import Database from "better-sqlite3";
import type { Logger } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { Pool as MysqlConnectionPool } from "mysql2";
import mysql from "mysql2";

import { logger } from "@homarr/log";

import { env } from "./env";
import * as mysqlSchema from "./schema/mysql";
import * as pgSchema from "./schema/postgresql";
import * as sqliteSchema from "./schema/sqlite";

export type HomarrDatabase = BetterSQLite3Database<typeof sqliteSchema>;
export type HomarrDatabaseMysql = MySql2Database<typeof mysqlSchema>;
export type HomarrDatabasePostgresql = NodePgDatabase<typeof pgSchema>;
export type typeOfHomarrDatabase = HomarrDatabase | HomarrDatabaseMysql | HomarrDatabasePostgresql;

export let connection: BetterSqlite3Connection | MysqlConnectionPool;
export let database: HomarrDatabase;

const init = () => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (database === undefined) {
    switch (env.DB_DRIVER) {
      case "mysql2":
        initMySQL2();
        break;
      case "postgresql":
        initPostgreSQL();
        break;
      default:
        initBetterSqlite();
        break;
    }
  }
};

class WinstonDrizzleLogger implements Logger {
  logQuery(query: string, _: unknown[]): void {
    logger.debug(`Executed SQL query: ${query}`);
  }
}

const initBetterSqlite = () => {
  connection = new Database(env.DB_URL);
  database = drizzleSqlite(connection, {
    schema: sqliteSchema,
    logger: new WinstonDrizzleLogger(),
    casing: "snake_case",
  }) as unknown as never;
};

const initMySQL2 = () => {
  if (!env.DB_HOST) {
    connection = mysql.createPool({ uri: env.DB_URL, maxIdle: 0, idleTimeout: 60000, enableKeepAlive: true });
  } else {
    connection = mysql.createPool({
      host: env.DB_HOST,
      database: env.DB_NAME,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      maxIdle: 0,
      idleTimeout: 60000,
      enableKeepAlive: true,
    });
  }

  database = drizzleMysql(connection, {
    schema: mysqlSchema,
    mode: "default",
    logger: new WinstonDrizzleLogger(),
    casing: "snake_case",
  }) as unknown as HomarrDatabase;
};

const initPostgreSQL = () => {
  if (env.DB_URL) {
    throw new Error(
      "PostgreSQL does not support DB_URL. Please use DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, and DB_PORT instead.",
    );
  } else if (!env.DB_HOST || !env.DB_NAME || !env.DB_USER || !env.DB_PASSWORD || !env.DB_PORT) {
    throw new Error(
      "PostgreSQL requires DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, and DB_PORT to be set in the environment variables.",
    );
  } else if (env.DB_HOST === "localhost" && env.DB_PORT === 5432) {
    logger.warn(
      "Using default PostgreSQL port 5432 on localhost. This is not recommended for production environments.",
    );
  }

  database = drizzlePg({
    logger: new WinstonDrizzleLogger(),
    schema: pgSchema,
    casing: "snake_case",
    connection: {
      /* (SuperClass) Client Config */
      user: env.DB_USER,
      database: env.DB_NAME,
      password: env.DB_PASSWORD,
      port: env.DB_PORT,
      host: env.DB_HOST,
      keepAlive: true,
      max: 0,
      idleTimeoutMillis: 60000,
      allowExitOnIdle: false,
    },
  }) as unknown as HomarrDatabase;
};

init();
