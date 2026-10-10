/* eslint-disable import/namespace -- Schema tables are intentionally selected by typed runtime keys. */
import { is } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";

import { objectEntries } from "@homarr/common";

import type { HomarrDatabase, HomarrDatabasePostgresql } from "./driver";
import { db as configuredDatabase } from "./index";
import type * as schema from "./schema";
import { getSchemaForDatabase } from "./schema";

type TableKey = {
  [K in keyof typeof schema]: (typeof schema)[K] extends { _: { brand: "Table" } } ? K : never;
}[keyof typeof schema];

export function isPostgresql(database: object = configuredDatabase): boolean {
  return is(database, PgDatabase);
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
      const schema = getSchemaForDatabase(db);
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
      const schema = getSchemaForDatabase(db);
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
      if (isPostgresql(db)) await insertAllAsync(db as unknown as HomarrDatabasePostgresql);
      else insertAll(db);
    },
  };
};
