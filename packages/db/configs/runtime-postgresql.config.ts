import type { Config } from "drizzle-kit";

export default {
  dialect: "postgresql",
  schema: ["./schema/postgresql.ts", "./schema/runtime/postgresql.ts"],
  casing: "snake_case",
  out: "./migrations/postgresql",
} satisfies Config;
