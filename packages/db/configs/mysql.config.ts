/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as dotenv from "dotenv";
import type { Config } from "drizzle-kit";

dotenv.config({ path: "../../.env" });

console.log(
  Object.entries(process.env)
    .filter(([key]) => key.startsWith("DB"))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n"),
);

export default {
  dialect: "mysql",
  schema: "./schema",
  casing: "snake_case",
  dbCredentials: {
    host: process.env.DB_HOST!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    port: parseInt(process.env.DB_PORT!),
  },
  out: "./migrations/mysql",
} satisfies Config;
