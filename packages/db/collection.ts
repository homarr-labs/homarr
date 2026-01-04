import type { InferInsertModel } from "drizzle-orm";

import { objectEntries } from "@homarr/common";

import type { HomarrDatabase, HomarrTransaction } from "./driver";
import * as schema from "./schema";

type TableKey = {
  [K in keyof typeof schema]: (typeof schema)[K] extends { _: { brand: "Table" } } ? K : never;
}[keyof typeof schema];

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
    insertAllAsync: async (db: HomarrDatabase | HomarrTransaction) => {
      await db.transaction(async (transaction) => {
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
  const { insertAllAsync, ...collection } = createDbInsertCollectionForTransaction(tablesInInsertOrder);

  return {
    ...collection,
    insertAllAsync: async (db: HomarrDatabase) => {
      await insertAllAsync(db);
    },
  };
};
