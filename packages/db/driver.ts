import Database from "better-sqlite3";
import type { Logger } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import mysql from "mysql2";

import { logger } from "@homarr/log";

import * as mysqlSchema from "./schema/mysql";
import * as sqliteSchema from "./schema/sqlite";

type HomarrDatabase = BetterSQLite3Database<typeof sqliteSchema>;

const init = () => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!connection) {
    switch (process.env.DB_DRIVER) {
      case "mysql2":
        initMySQL2();
        break;
      default:
        initBetterSqlite();
        break;
    }
  }
};

export let connection: Database.Database | mysql.Connection;
export let database: HomarrDatabase;

class WinstonDrizzleLogger implements Logger {
  logQuery(query: string, _: unknown[]): void {
    logger.debug(`Executed SQL query: ${query}`);
  }
}

const initBetterSqlite = () => {
  connection = new Database(process.env.DB_URL);
  database = drizzleSqlite(connection, {
    schema: sqliteSchema,
    logger: new WinstonDrizzleLogger(),
    casing: "snake_case",
  }) as unknown as never;
};

const initMySQL2 = () => {
  if (!process.env.DB_HOST) {
    connection = mysql.createConnection({ uri: process.env.DB_URL });
  } else {
    connection = mysql.createConnection({
      host: process.env.DB_HOST,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      database: process.env.DB_NAME!,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
  }

  database = drizzleMysql(connection, {
    schema: mysqlSchema,
    mode: "default",
    logger: new WinstonDrizzleLogger(),
    casing: "snake_case",
  }) as unknown as HomarrDatabase;
};

init();
