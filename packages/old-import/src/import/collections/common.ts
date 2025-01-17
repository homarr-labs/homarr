import { objectEntries } from "@homarr/common";
import type { Database, HomarrDatabaseMysql, InferInsertModel } from "@homarr/db";
import * as schema from "@homarr/db/schema";

type TableKey = {
  [K in keyof typeof schema]: (typeof schema)[K] extends { _: { brand: "Table" } } ? K : never;
}[keyof typeof schema];

export const createDbInsertCollection = <TTableKey extends TableKey>(tablesInInsertOrder: TTableKey[]) => {
  const context = tablesInInsertOrder.reduce(
    (acc, key) => {
      acc[key] = [];
      return acc;
    },
    {} as { [K in TTableKey]: InferInsertModel<(typeof schema)[K]>[] },
  );

  return {
    ...context,
    insertAll: (db: Database) => {
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
    insertAllAsync: async (db: HomarrDatabaseMysql) => {
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
