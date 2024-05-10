import * as dotenv from "dotenv";
import type { Config } from "drizzle-kit";

dotenv.config({ path: "../../.env" });

export default {
  dialect: "sqlite",
  schema: "./schema",
  dbCredentials: { url: process.env.DB_URL! },
  out: "./migrations/sqlite",
} satisfies Config;
