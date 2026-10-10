import { AsyncLocalStorage } from "node:async_hooks";
import { is } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";

import { createDatabaseScope } from "@homarr/core/infrastructure/db";

import type { HomarrDatabase } from "./driver";

export * from "drizzle-orm";
export type { HomarrDatabasePostgresql } from "./driver";
export { createPersistenceRuntime } from "./runtime";
export { createSqliteCopyEngine } from "./copied-sqlite";
export { createTrustedCertificateHostnameStore } from "./trusted-hostnames";
export type { CopiedSqliteDatabase, CopiedSqlRow, CopiedSqlValue } from "./copied-sqlite";
export type { PersistenceConfig, PersistenceRuntime, PersistencePhase, PersistenceDatabaseHandle } from "./runtime";
export { handleDiffrentDbDriverOperationsAsync as handleTransactionsAsync } from "./transactions";

export type Database = HomarrDatabase;

export interface DatabaseAdmission {
  runAsync<T>(operation: (database: Database) => T | Promise<T>): Promise<T>;
}

let databaseAdmission: DatabaseAdmission | undefined;
const admittedDatabase = new AsyncLocalStorage<Database>();

export const configureDatabaseReference = (admission: DatabaseAdmission) => {
  if (databaseAdmission) throw new Error("The database reference is already configured");
  databaseAdmission = admission;
  return () => {
    if (databaseAdmission === admission) databaseAdmission = undefined;
  };
};

export const withConfiguredDatabaseAsync = async <T>(operation: (database: Database) => T | Promise<T>): Promise<T> => {
  if (!databaseAdmission) throw new Error("The database reference has not been explicitly configured");
  return databaseAdmission.runAsync(async (database) => {
    const scope = createDatabaseScope(database, { synchronousTransactions: !is(database, PgDatabase) });
    try {
      return await admittedDatabase.run(scope.database, () => operation(db));
    } finally {
      scope.revoke();
      await scope.settleAsync();
    }
  });
};

const currentDatabase = () => {
  const database = admittedDatabase.getStore();
  if (!database) throw new Error("The database reference requires an active tracked admission");
  return database;
};

export const db = new Proxy({} as Database, {
  get(_target, property) {
    const database = currentDatabase();
    const value: unknown = Reflect.get(database, property, database);
    return typeof value === "function" ? value.bind(database) : value;
  },
  getPrototypeOf() {
    return Object.getPrototypeOf(currentDatabase());
  },
  has(_target, property) {
    return Reflect.has(currentDatabase(), property);
  },
  ownKeys() {
    return Reflect.ownKeys(currentDatabase());
  },
  getOwnPropertyDescriptor(_target, property) {
    return Reflect.getOwnPropertyDescriptor(currentDatabase(), property);
  },
  set() {
    throw new Error("Database reference handles cannot be mutated");
  },
  defineProperty() {
    throw new Error("Database reference handles cannot be mutated");
  },
  deleteProperty() {
    throw new Error("Database reference handles cannot be mutated");
  },
  setPrototypeOf() {
    throw new Error("Database reference handles cannot be mutated");
  },
  preventExtensions() {
    throw new Error("Database reference handles cannot be mutated");
  },
});
