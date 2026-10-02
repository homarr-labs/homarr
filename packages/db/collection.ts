/* eslint-disable import/namespace -- Schema tables are intentionally selected by typed runtime keys. */
import type { InferInsertModel } from "drizzle-orm";

import { objectEntries } from "@homarr/common";
import { dbEnv } from "@homarr/core/infrastructure/db/env";

import type { HomarrDatabase, HomarrDatabasePostgresql } from "./driver";
import * as schema from "./schema";

type TableKey = {
  [K in keyof typeof schema]: (typeof schema)[K] extends { _: { brand: "Table" } } ? K : never;
}[keyof typeof schema];

export function isPostgresql(): boolean {
  return dbEnv.DRIVER === "node-postgres";
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
            // oxlint-disable-next-line import/namespace -- TableKey limits key to exported schema tables.
            const table = schema[key];
            transaction
              .insert(table)
              .values(values as never)
              .run();
          }
        }
      });
    },
    insertAllAsync: async (db: HomarrDatabasePostgresql) => {
      await db.transaction(async (transaction) => {
        for (const [key, values] of objectEntries(context)) {
          if (values.length >= 1) {
            // oxlint-disable-next-line import/namespace -- TableKey limits key to exported schema tables.
            const table = schema[key] as never;
            await transaction.insert(table).values(values as never);
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
      switch (dbEnv.DRIVER) {
        case "node-postgres":
          await insertAllAsync(db as unknown as HomarrDatabasePostgresql);
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
