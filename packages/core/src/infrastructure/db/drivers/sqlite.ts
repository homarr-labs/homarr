import { Database } from "bun:sqlite";
import type { Changes } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import type { BaseSQLiteDatabase, SQLiteTransactionConfig } from "drizzle-orm/sqlite-core";

import { createDatabaseScope } from "../scope";
import type { SharedDrizzleConfig } from "./shared";

export interface SqliteConnectionOptions {
  path: string;
  readonly?: boolean;
}

export const createSqliteDb = <TSchema extends Record<string, unknown>>(
  config: SharedDrizzleConfig<TSchema>,
  options: SqliteConnectionOptions,
) => {
  const connection = new Database(options.path, {
    readonly: options.readonly,
    readwrite: !options.readonly,
    create: false,
    strict: true,
  });
  try {
    connection.exec("PRAGMA foreign_keys = ON");
    const database = drizzle(connection, config) as unknown as BaseSQLiteDatabase<"sync", Changes, TSchema> & {
      $client: Database;
    };
    type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];
    return new Proxy(database, {
      get(target, property, receiver) {
        if (property !== "transaction") return Reflect.get(target, property, receiver);
        return <T>(operation: (transaction: Transaction) => T, transactionConfig?: SQLiteTransactionConfig): T => {
          if (operation.constructor.name === "AsyncFunction")
            throw new TypeError("SQLite transactions require a synchronous callback");
          return target.transaction((transaction) => {
            const scope = createDatabaseScope(transaction, { synchronousTransactions: true });
            try {
              const result = operation(scope.database);
              if (
                ((typeof result === "object" && result !== null) || typeof result === "function") &&
                "then" in result &&
                typeof result.then === "function"
              ) {
                void Promise.resolve(result).catch(() => undefined);
                throw new TypeError("SQLite transaction callbacks cannot return a promise");
              }
              return result;
            } finally {
              scope.revoke();
            }
          }, transactionConfig);
        };
      },
    });
  } catch (error) {
    try {
      connection.close(true);
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "SQLite construction and cleanup failures", { cause: error });
    }
    throw error;
  }
};
