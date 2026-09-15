import { z } from "zod/v4";

import { createEnv, runtimeEnvWithPrefix } from "@homarr/core/infrastructure/env";

if (
  ["mysql", "mariadb"].includes(process.env.DB_DIALECT ?? "") ||
  ["mysql2", "mysql", "mariadb"].includes(process.env.DB_DRIVER ?? "") ||
  /^(mysql|mariadb):/i.test(process.env.DB_URL ?? "")
) {
  throw new Error(
    "MySQL and MariaDB are no longer supported. Migrate your database to SQLite or PostgreSQL before starting Homarr.",
  );
}

const drivers = {
  betterSqlite3: "better-sqlite3",
  nodePostgres: "node-postgres",
} as const;

const isDriver = (driver: (typeof drivers)[keyof typeof drivers]) => process.env.DB_DRIVER === driver;
const isUsingDbHost = Boolean(process.env.DB_HOST);
const onlyAllowUrl = isDriver(drivers.betterSqlite3);
const urlRequired = onlyAllowUrl || !isUsingDbHost;
const hostRequired = isUsingDbHost && !onlyAllowUrl;

export const dbEnv = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app isn't
   * built with invalid env vars.
   */
  server: {
    DRIVER: z
      .union([z.literal(drivers.betterSqlite3), z.literal(drivers.nodePostgres)], {
        message: `Invalid database driver, supported are ${Object.values(drivers).join(", ")}`,
      })
      .default(drivers.betterSqlite3),
    ...(urlRequired
      ? {
          URL:
            // Fallback to the default sqlite file path in production
            process.env.NODE_ENV === "production" && isDriver("better-sqlite3")
              ? z.string().default("/appdata/db/db.sqlite")
              : z.string().nonempty(),
        }
      : {}),
    ...(hostRequired
      ? {
          HOST: z.string(),
          PORT: z
            .string()
            .regex(/\d+/)
            .transform(Number)
            .refine((number) => number >= 1)
            .default(5432),
          USER: z.string(),
          PASSWORD: z.string(),
          NAME: z.string(),
        }
      : {}),
  },
  runtimeEnv: runtimeEnvWithPrefix("DB_"),
});
