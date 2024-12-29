import { randomBytes } from "crypto";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const errorSuffix = `, please generate a 64 character secret in hex format or use the following: "${randomBytes(32).toString("hex")}"`;

export const env = createEnv({
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
  },
  runtimeEnv: {
    SECRET_ENCRYPTION_KEY: process.env.SECRET_ENCRYPTION_KEY,
  },
  skipValidation:
    Boolean(process.env.CI) || Boolean(process.env.SKIP_ENV_VALIDATION) || process.env.npm_lifecycle_event === "lint",
});
