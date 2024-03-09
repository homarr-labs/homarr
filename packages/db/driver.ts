import "server-only";

import Database from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import * as mysqlSchema from "./schema/mysql";
import * as sqliteSchema from "./schema/sqlite";

type HomarrDatabase = BetterSQLite3Database<typeof sqliteSchema>;

const init = async () => {
  if (!connection) {
    switch (process.env.DB_DRIVER) {
      case "mysql2":
        await initMySQL2();
        break;
      case "better-sqlite3":
        initBetterSqlite();
        break;
      default:
        throw new Error("Invalid driver");
    }
  }
};

export let connection: Database.Database | mysql.Connection;
export let database: HomarrDatabase;

const initBetterSqlite = () => {
  connection = new Database(process.env.DB_URL);
  database = drizzleSqlite(connection, { schema: sqliteSchema });
};

const initMySQL2 = async () => {
  if (process.env.DB_URL) {
    connection = await mysql.createConnection({ uri: process.env.DB_URL });
  } else {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST!,
      database: process.env.DB_NAME!,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
  }

  database = drizzleMysql(connection, {
    schema: mysqlSchema,
    mode: "default",
  }) as unknown as HomarrDatabase;
};

await init();
