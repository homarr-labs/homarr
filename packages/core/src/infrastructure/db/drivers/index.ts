import type { Logger } from "drizzle-orm";
import type { PoolConfig } from "pg";

import { DB_CASING } from "../constants";
import { createPostgresDb } from "./postgresql";
import type { SharedDrizzleConfig } from "./shared";
import { createSqliteDb } from "./sqlite";
import type { SqliteConnectionOptions } from "./sqlite";

export type Database<TSchema extends Record<string, unknown>> = ReturnType<typeof createSqliteDb<TSchema>>;
export type DatabaseConnectionOptions =
  | ({ engine: "sqlite" } & SqliteConnectionOptions)
  | { engine: "postgresql"; connection: PoolConfig };

export const createSharedConfig = <TSchema extends Record<string, unknown>>(
  schema: TSchema,
  logger: boolean | Logger = false,
): SharedDrizzleConfig<TSchema> => ({ logger, casing: DB_CASING, schema });

export const createDb = <TSchema extends Record<string, unknown>>(
  schema: TSchema,
  options: DatabaseConnectionOptions,
) => {
  const config = createSharedConfig(schema);
  return options.engine === "sqlite" ? createSqliteDb(config, options) : createPostgresDb(config, options.connection);
};
