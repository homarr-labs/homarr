import { mkdir } from "fs/promises";
import path from "path";
import { createClient } from "@libsql/client/node";
import { createId } from "@paralleldrive/cuid2";
import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

import { DB_CASING } from "../../packages/core/src/infrastructure/db/constants";
import * as sqliteSchema from "../../packages/db/schema/sqlite";

export const createSqliteDbFileAsync = async () => {
  const localMountPath = path.join(__dirname, "tmp", createId());
  await mkdir(path.join(localMountPath, "db"), { recursive: true });

  const localDbUrl = path.join(localMountPath, "db", "db.sqlite");

  const connection = createClient({
    url: `file:${localDbUrl}`,
  });

  const db = drizzle(connection, {
    schema: sqliteSchema,
    casing: DB_CASING,
  });

  await migrate(db, {
    migrationsFolder: path.join(__dirname, "..", "..", "packages", "db", "migrations", "sqlite"),
  });

  return {
    db,
    localMountPath,
  };
};

export type SqliteDatabase = LibSQLDatabase<typeof sqliteSchema>;
