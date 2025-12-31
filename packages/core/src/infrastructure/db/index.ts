import { createDbMapping } from "./mapping";

export { createDb } from "./drivers";
export const createSchema = createDbMapping;

export { createSharedConfig as createSharedDbConfig } from "./drivers";
export { createMysqlDb } from "./drivers/mysql";
export { createPostgresDb } from "./drivers/postgresql";
export { createSqliteDb } from "./drivers/sqlite";
