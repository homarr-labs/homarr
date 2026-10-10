import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { PoolConfig } from "pg";

import type { SharedDrizzleConfig } from "./shared";

export const createPostgresDb = <TSchema extends Record<string, unknown>>(
  config: SharedDrizzleConfig<TSchema>,
  options: PoolConfig,
) => {
  if (!options.connectionString && !(options.host && options.database && options.user)) {
    throw new TypeError("PostgreSQL requires an explicit URL or host/database/user configuration");
  }
  const connection = new Pool({ idleTimeoutMillis: 60000, allowExitOnIdle: false, ...options });
  return drizzle({ ...config, client: connection });
};
