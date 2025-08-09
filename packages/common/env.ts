import { randomBytes } from "crypto";
import { z } from "zod";

import { createEnv } from "@homarr/core/infrastructure/env";

const errorSuffix = `, please generate a 64 character secret in hex format or use the following: "${randomBytes(32).toString("hex")}"`;

export const env = createEnv({
  shared: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  server: {
    SECRET_ENCRYPTION_KEY: z
      .string({
        required_error: `SECRET_ENCRYPTION_KEY is required${errorSuffix}`,
      })
      .min(64, {
        message: `SECRET_ENCRYPTION_KEY has to be 64 characters${errorSuffix}`,
      })
      .max(64, {
        message: `SECRET_ENCRYPTION_KEY has to be 64 characters${errorSuffix}`,
      })
      .regex(/^[0-9a-fA-F]{64}$/, {
        message: `SECRET_ENCRYPTION_KEY must only contain hex characters${errorSuffix}`,
      }),
    UNSAFE_WEB_PORT: z
      .number({
        message: "UNSAFE_WEB_PORT must be a number",
      })
      .int({
        message: "UNSAFE_WEB_PORT must be an integer",
      })
      .positive({
        message: "UNSAFE_WEB_PORT must be a positive integer",
      })
      .default(3000),
    UNSAFE_WEBSOCKET_PORT: z
      .number({
        message: "UNSAFE_WEBSOCKET_PORT must be a number",
      })
      .int({
        message: "UNSAFE_WEBSOCKET_PORT must be an integer",
      })
      .positive({
        message: "UNSAFE_WEBSOCKET_PORT must be a positive integer",
      })
      .default(3001),
    UNSAFE_CRON_JOB_PORT: z
      .number({
        message: "UNSAFE_WEBSOCKET_PORT must be a number",
      })
      .int({
        message: "UNSAFE_WEBSOCKET_PORT must be an integer",
      })
      .positive({
        message: "UNSAFE_WEBSOCKET_PORT must be a positive integer",
      })
      .default(3002),
  },
  runtimeEnv: {
    SECRET_ENCRYPTION_KEY: process.env.SECRET_ENCRYPTION_KEY,
    NODE_ENV: process.env.NODE_ENV,
    UNSAFE_WEB_PORT: parseInt(process.env.UNSAFE_WEB_PORT ?? "3000", 10),
    UNSAFE_WEBSOCKET_PORT: parseInt(process.env.UNSAFE_WEBSOCKET_PORT ?? "3001", 10),
    UNSAFE_CRON_JOB_PORT: parseInt(process.env.UNSAFE_CRON_JOB_PORT ?? "3002", 10),
  },
});
