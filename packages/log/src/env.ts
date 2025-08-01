import { z } from "zod";

import { createEnv } from "@homarr/core/infrastructure/env";

import { logLevels } from "./constants";

export const env = createEnv({
  server: {
    LOG_LEVEL: z.enum(logLevels).default("info"),
  },
  experimental__runtimeEnv: process.env,
});
