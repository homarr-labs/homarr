import { createRequire } from "node:module";

import { DB_CASING } from "../constants";
import { dbEnv } from "../env";
import type { SharedDrizzleConfig } from "./shared";
import { WinstonDrizzleLogger } from "./shared";

const require = createRequire(import.meta.url);

export type Database<TSchema extends Record<string, unknown>> = ReturnType<
  typeof import("./sqlite").createSqliteDb<TSchema>
>;

export const createSharedConfig = <TSchema extends Record<string, unknown>>(
  schema: TSchema,
): SharedDrizzleConfig<TSchema> => ({
  logger: new WinstonDrizzleLogger(),
  casing: DB_CASING,
  schema,
});

export const createDb = <TSchema extends Record<string, unknown>>(schema: TSchema) => {
  const config = createSharedConfig(schema);
  // ponytail: conditional require — only the configured driver is loaded.
  // Ceiling: all 3 stay on disk for runtime driver switching; only loaded graph shrinks.
  const driver = dbEnv.DRIVER ?? "better-sqlite3";
  switch (driver) {
    case "mysql2":
      return (require("./mysql") as typeof import("./mysql")).createMysqlDb(config);
    case "node-postgres":
      return (require("./postgresql") as typeof import("./postgresql")).createPostgresDb(config);
    default:
      return (require("./sqlite") as typeof import("./sqlite")).createSqliteDb(config);
  }
};
