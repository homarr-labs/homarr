import { z } from "zod/v4";

import { createEnv } from "~/infrastructure/env";
import { runtimeEnvWithPrefix } from "~/infrastructure/env/prefix";
import { createBooleanSchema } from "~/infrastructure/env/schemas";

export const redisEnv = createEnv({
  server: {
    IS_EXTERNAL: createBooleanSchema(false),
    HOST: z.string().optional(),
    PORT: z.coerce.number().default(6379).optional(),
    TLS_CA: z.string().optional(),
    USERNAME: z.string().optional(),
    PASSWORD: z.string().optional(),
  },
  runtimeEnv: runtimeEnvWithPrefix("REDIS_"),
});
