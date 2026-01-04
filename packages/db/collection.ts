import type { InferInsertModel } from "drizzle-orm";

import { objectEntries } from "@homarr/common";

import type { HomarrDatabase, HomarrTransaction } from "./driver";
import * as schema from "./schema";

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
    insertAllAsync: async (db: HomarrDatabase | HomarrTransaction) => {
      await db.transaction(async (transaction) => {
        for (const [key, values] of objectEntries(context)) {
          if (values.length >= 1) {
            await transaction.insert(schema[key] as never).values(values as never);
          }
        }
      });
    },
  };
};
