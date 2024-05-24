import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    AUTH_SECRET: process.env.NODE_ENV === "production" ? z.string().min(1) : z.string().min(1).optional(),
  },
  client: {},
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
  },
  skipValidation: Boolean(process.env.CI) || Boolean(process.env.SKIP_ENV_VALIDATION),
});
