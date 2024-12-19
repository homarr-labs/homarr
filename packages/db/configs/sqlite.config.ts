import type { Config } from "drizzle-kit";

import { env } from "../env.mjs";

export default {
  dialect: "sqlite",
  schema: "./schema",
  casing: "snake_case",
  dbCredentials: { url: env.DB_URL },
  out: "./migrations/sqlite",
} satisfies Config;
