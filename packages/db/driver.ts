import Database from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import mysql from "mysql2";

import * as mysqlSchema from "./schema/mysql";
import * as sqliteSchema from "./schema/sqlite";

type HomarrDatabase = BetterSQLite3Database<typeof sqliteSchema>;

const init = () => {
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

const initBetterSqlite = () => {
  connection = new Database(process.env.DB_URL);
  database = drizzleSqlite(connection, { schema: sqliteSchema });
};

const initMySQL2 = () => {
  if (process.env.DB_URL) {
    connection = mysql.createConnection({ uri: process.env.DB_URL });
  } else {
    connection = mysql.createConnection({
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

init();
