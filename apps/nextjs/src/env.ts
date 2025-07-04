import { createEnv } from "@homarr/env";
import { createBooleanSchema } from "@homarr/env/schemas";

export const env = createEnv({
  server: {
    UNSAFE_ENABLE_MOCK_INTEGRATION: createBooleanSchema(false),
  },
  experimental__runtimeEnv: process.env,
});
