import type { InferInsertModel } from "drizzle-orm";

import { objectEntries } from "@homarr/common";

import type { HomarrDatabase, HomarrDatabaseMysql, HomarrDatabasePostgresql } from "./driver";
import { env } from "./env";
import * as schema from "./schema";

type TableKey = {
  [K in keyof typeof schema]: (typeof schema)[K] extends { _: { brand: "Table" } } ? K : never;
}[keyof typeof schema];

export function isMysql(): boolean {
  return env.DB_DRIVER === "mysql2";
}

export function isPostgresql(): boolean {
  return env.DB_DRIVER === "node-postgres";
}

export const createDbInsertCollectionForTransaction = <TTableKey extends TableKey>(
  tablesInInsertOrder: TTableKey[],
) => {
  const context = tablesInInsertOrder.reduce(
    (acc, key) => {
      acc[key] = [];
      return acc;
    },
    {} as { [K in TTableKey]: InferInsertModel<(typeof schema)[K]>[] },
  );

  return {
    ...context,
    insertAll: (db: HomarrDatabase) => {
      db.transaction((transaction) => {
        for (const [key, values] of objectEntries(context)) {
          if (values.length >= 1) {
            transaction
              .insert(schema[key])
              .values(values as never)
              .run();
          }
        }
      });
    },
    // We allow any database that supports async passed here but then fallback to mysql to prevent typescript errors
    insertAllAsync: async (db: HomarrDatabaseMysql | HomarrDatabasePostgresql) => {
      const innerDb = db as HomarrDatabaseMysql;
      await innerDb.transaction(async (transaction) => {
        for (const [key, values] of objectEntries(context)) {
          if (values.length >= 1) {
            // Below is actually the mysqlSchema when the driver is mysql
            await transaction.insert(schema[key] as never).values(values as never);
          }
        }
      });
    },
  };
};

export const createDbInsertCollectionWithoutTransaction = <TTableKey extends TableKey>(
  tablesInInsertOrder: TTableKey[],
) => {
  const { insertAll, insertAllAsync, ...collection } = createDbInsertCollectionForTransaction(tablesInInsertOrder);

  return {
    ...collection,
    insertAllAsync: async (db: HomarrDatabase) => {
      switch (env.DB_DRIVER) {
        case "mysql2":
        case "node-postgres":
          // For mysql2 and node-postgres, we can use the async insertAllAsync method
          await insertAllAsync(db as unknown as HomarrDatabaseMysql | HomarrDatabasePostgresql);
          return;
        default:
          // For better-sqlite3, we need to use the synchronous insertAll method
          // default assumes better-sqlite3. It's original implementation.
          insertAll(db);
          break;
      }
    },
  };
};
