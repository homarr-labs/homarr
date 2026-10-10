import { createDbMapping } from "./mapping";

export { createDb } from "./drivers";
export { createDatabaseScope } from "./scope";
export type { DatabaseScope } from "./scope";
export type { DatabaseConnectionOptions } from "./drivers";
export const createSchema = createDbMapping;

export { createSqliteDb } from "./drivers/sqlite";
export type { SqliteConnectionOptions } from "./drivers/sqlite";
export { createPostgresDb } from "./drivers/postgresql";
export { createSharedConfig as createSharedDbConfig } from "./drivers";
