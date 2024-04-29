import * as dotenv from "dotenv";
import type { Config } from "drizzle-kit";

dotenv.config({ path: "../../.env" });

export default {
  schema: "./schema",
  driver: "better-sqlite",
  dbCredentials: { url: process.env.DB_URL! },
  out: "./migrations/sqlite",
} satisfies Config;
