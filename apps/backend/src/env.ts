import { z } from "zod/v4";

import { createEnv } from "@homarr/core/infrastructure/env";

export const env = createEnv({
  server: {
    BACKEND_PORT: z.coerce.number().int().min(1).max(65535).default(3002),
    BACKEND_HOST: z.string().default("0.0.0.0"),
    BACKEND_CORS_ORIGINS: z
      .string()
      .default("")
      .transform((value) =>
        value
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean)
          .map((origin) => z.url().parse(origin)),
      ),
  },
  runtimeEnv: {
    BACKEND_PORT: process.env.BACKEND_PORT,
    BACKEND_HOST: process.env.BACKEND_HOST,
    BACKEND_CORS_ORIGINS: process.env.BACKEND_CORS_ORIGINS,
  },
});
