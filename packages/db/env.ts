import { z } from "zod/v4";

import { env as commonEnv } from "@homarr/common/env";
import { createEnv } from "@homarr/env";

const drivers = {
  betterSqlite3: "better-sqlite3",
  mysql2: "mysql2",
} as const;

const isDriver = (driver: (typeof drivers)[keyof typeof drivers]) => process.env.DB_DRIVER === driver;
const isUsingDbHost = Boolean(process.env.DB_HOST);
const onlyAllowUrl = isDriver(drivers.betterSqlite3);
const urlRequired = onlyAllowUrl || !isUsingDbHost;
const hostRequired = isUsingDbHost && !onlyAllowUrl;

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app isn't
   * built with invalid env vars.
   */
  server: {
    DB_DRIVER: z
      .union([z.literal(drivers.betterSqlite3), z.literal(drivers.mysql2)], {
        message: `Invalid database driver, supported are ${Object.keys(drivers).join(", ")}`,
      })
      .default(drivers.betterSqlite3),
    ...(urlRequired
      ? {
          DB_URL:
            // Fallback to the default sqlite file path in production
            commonEnv.NODE_ENV === "production" && isDriver("better-sqlite3")
              ? z.string().default("/appdata/db/db.sqlite")
              : z.string().nonempty(),
        }
      : {}),
    ...(hostRequired
      ? {
          DB_HOST: z.string(),
          DB_PORT: z
            .string()
            .regex(/\d+/)
            .transform(Number)
            .refine((number) => number >= 1)
            .default("3306"),
          DB_USER: z.string(),
          DB_PASSWORD: z.string(),
          DB_NAME: z.string(),
        }
      : {}),
  },
  experimental__runtimeEnv: process.env,
});
