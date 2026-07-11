import { z } from "zod/v4";

import { createBooleanSchema, createEnv } from "@homarr/core/infrastructure/env";

export const env = createEnv({
  server: {
    KUBERNETES_SERVICE_ACCOUNT_NAME: z.string().optional(),
    DEMO_MODE: createBooleanSchema(false),
    DEMO_READ_ONLY: createBooleanSchema(true),
  },
  runtimeEnv: {
    KUBERNETES_SERVICE_ACCOUNT_NAME: process.env.KUBERNETES_SERVICE_ACCOUNT_NAME,
    DEMO_MODE: process.env.DEMO_MODE,
    DEMO_READ_ONLY: process.env.DEMO_READ_ONLY,
  },
});
