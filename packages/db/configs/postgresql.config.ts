import type { Config } from "drizzle-kit";

import { env } from "../env";

export default {
  dialect: "postgresql",
  schema: "./schema",
  casing: "snake_case",
  dbCredentials: {
        host: env.DB_HOST,
        port: Number(env.DB_PORT) || 5432, // Default PostgreSQL port
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
        ssl: false, // or 'no-verify' if you want to skip certificate verification
      },
  out: "./migrations/postgresql",
} satisfies Config;
