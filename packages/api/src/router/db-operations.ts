import type { Database, SQL } from "@homarr/db";
import { handleTransactionsAsync } from "@homarr/db";
import * as dbSchema from "@homarr/db/schema";

type TableName = {
  [TKey in keyof typeof dbSchema]: (typeof dbSchema)[TKey] extends { _: { brand: "Table" } } ? TKey : never;
}[keyof typeof dbSchema];

/**
 * A single statement of an import.
 *
 * Imports mix inserts, updates and deletes across many tables and all of them have to happen
 * together, so they are collected first and then replayed inside one transaction. Collecting
 * them also means every validation runs before the first row is touched.
 */
export type DbOperation =
  | { type: "insert"; table: TableName; values: object[] }
  | { type: "update"; table: TableName; set: object; where: SQL }
  | { type: "delete"; table: TableName; where: SQL };

/**
 * Runs the given operations in order inside a single transaction.
 * The two branches exist because better-sqlite3 transactions have to be synchronous.
 */
export const runDbOperationsAsync = async (db: Database, operations: DbOperation[]) => {
  if (operations.length === 0) return;

  await handleTransactionsAsync(db, {
    async handleAsync(asyncDb, schema) {
      await asyncDb.transaction(async (transaction) => {
        for (const operation of operations) {
          const table = schema[operation.table] as never;

          if (operation.type === "insert") {
            await transaction.insert(table).values(operation.values as never);
          } else if (operation.type === "update") {
            await transaction
              .update(table)
              .set(operation.set as never)
              .where(operation.where);
          } else {
            await transaction.delete(table).where(operation.where);
          }
        }
      });
    },
    handleSync(syncDb) {
      syncDb.transaction((transaction) => {
        for (const operation of operations) {
          // oxlint-disable-next-line import/namespace -- TableName is limited to exported schema tables
          const table = dbSchema[operation.table] as never;

          if (operation.type === "insert") {
            transaction
              .insert(table)
              .values(operation.values as never)
              .run();
          } else if (operation.type === "update") {
            transaction
              .update(table)
              .set(operation.set as never)
              .where(operation.where)
              .run();
          } else {
            transaction.delete(table).where(operation.where).run();
          }
        }
      });
    },
  });
};
