import { randomBytes } from "crypto";
import { z } from "zod";

import { createEnv } from "@homarr/env";

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
  },
  runtimeEnv: {
    SECRET_ENCRYPTION_KEY: process.env.SECRET_ENCRYPTION_KEY,
    NODE_ENV: process.env.NODE_ENV,
  },
});
