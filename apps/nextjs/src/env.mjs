import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const isUsingDbUrl = Boolean(process.env.DB_URL);
const isUsingDbHost = Boolean(process.env.DB_HOST);
const isUsingDbCredentials = process.env.DB_DRIVER === "mysql2";

export const env = createEnv({
  shared: {
    VERCEL_URL: z
      .string()
      .optional()
      .transform((v) => (v ? `https://${v}` : undefined)),
    PORT: z.coerce.number().default(3000),
  },
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app isn't
   * built with invalid env vars.
   */
  server: {
    DB_DRIVER: z.enum(["better-sqlite3", "mysql2"]).default("better-sqlite3"),
    // If the DB_HOST is set, the DB_URL is optional
    DB_URL: isUsingDbHost ? z.string().optional() : z.string(),
    DB_HOST: isUsingDbUrl ? z.string().optional() : z.string(),
    DB_PORT: isUsingDbUrl
      ? z.number().optional()
      : z.number().min(1).default(3306),
    DB_USER: isUsingDbCredentials ? z.string() : z.string().optional(),
    DB_PASSWORD: isUsingDbCredentials ? z.string() : z.string().optional(),
    DB_NAME: isUsingDbUrl ? z.string().optional() : z.string(),
  },
  /**
   * Specify your client-side environment variables schema here.
   * For them to be exposed to the client, prefix them with `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },
  /**
   * Destructure all variables from `process.env` to make sure they aren't tree-shaken away.
   */
  runtimeEnv: {
    VERCEL_URL: process.env.VERCEL_URL,
    PORT: process.env.PORT,
    DB_URL: process.env.DB_URL,
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME,
    DB_PORT: process.env.DB_PORT,
    DB_DRIVER: process.env.DB_DRIVER,
    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
  },
  skipValidation:
    Boolean(process.env.CI) ||
    Boolean(process.env.SKIP_ENV_VALIDATION) ||
    process.env.npm_lifecycle_event === "lint",
});
