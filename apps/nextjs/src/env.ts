import { createBooleanSchema, createEnv } from "@homarr/core/infrastructure/env";

export const env = createEnv({
  server: {
    UNSAFE_ENABLE_MOCK_INTEGRATION: createBooleanSchema(false),
    DEMO_MODE: createBooleanSchema(false),
    DEMO_READ_ONLY: createBooleanSchema(true),
  },
  experimental__runtimeEnv: process.env,
});
