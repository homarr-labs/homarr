import { createBooleanSchema, createEnv } from "@homarr/core/infrastructure/env";
import { z } from "zod/v4";

export const env = createEnv({
  server: {
    BASE_URL: z.string().url().optional(),
    UNSAFE_ENABLE_MOCK_INTEGRATION: createBooleanSchema(false),
    DEMO_MODE: createBooleanSchema(false),
    DEMO_READ_ONLY: createBooleanSchema(true),
  },
  experimental__runtimeEnv: process.env,
});
