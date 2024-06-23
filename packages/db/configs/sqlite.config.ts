import * as dotenv from "dotenv";
import type { Config } from "drizzle-kit";

dotenv.config({ path: "../../.env" });

export default {
  dialect: "sqlite",
  schema: "./schema",
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  dbCredentials: { url: process.env.DB_URL! },
  out: "./migrations/sqlite",
} satisfies Config;
