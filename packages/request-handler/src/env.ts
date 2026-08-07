import { z } from "zod/v4";

import { createEnv } from "@homarr/core/infrastructure/env";

export const env = createEnv({
  server: {
    LIVE_TENNIS_API_KEY: z.string().optional(),
  },
  runtimeEnv: {
    LIVE_TENNIS_API_KEY: process.env.LIVE_TENNIS_API_KEY,
  },
});
