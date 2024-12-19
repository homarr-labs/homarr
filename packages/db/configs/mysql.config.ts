import type { Config } from "drizzle-kit";

import { env } from "../env";

export default {
  dialect: "mysql",
  schema: "./schema",
  casing: "snake_case",
  dbCredentials: env.DB_URL
    ? { url: env.DB_URL }
    : {
        host: env.DB_HOST,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
        port: env.DB_PORT,
      },
  out: "./migrations/mysql",
} satisfies Config;
