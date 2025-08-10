import type { Config } from "drizzle-kit";

import { env } from "../env";

export default {
  dialect: "postgresql",
  schema: "./schema",
  casing: "snake_case",

  dbCredentials: env.DB_URL
    ? { url: env.DB_URL }
    : {
        host: env.DB_HOST,
        port: env.DB_PORT,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
        // TODO: check with enabled (maybe we also need to add a new property for this)
        ssl: false, // or 'no-verify' if you want to skip certificate verification
      },
  out: "./migrations/postgresql",
} satisfies Config;
