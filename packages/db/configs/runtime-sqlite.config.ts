import type { Config } from "drizzle-kit";

export default {
  dialect: "sqlite",
  schema: ["./schema/sqlite.ts", "./schema/runtime/sqlite.ts"],
  casing: "snake_case",
  out: "./migrations/sqlite",
} satisfies Config;
