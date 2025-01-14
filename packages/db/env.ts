import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

import { shouldSkipEnvValidation } from "@homarr/common/env-validation";

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
          DB_URL: z.string(),
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
  /**
   * Destructure all variables from `process.env` to make sure they aren't tree-shaken away.
   */
  runtimeEnv: {
    DB_DRIVER: process.env.DB_DRIVER,
    DB_URL: process.env.DB_URL,
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME,
    DB_PORT: process.env.DB_PORT,
  },
  skipValidation: shouldSkipEnvValidation(),
});
