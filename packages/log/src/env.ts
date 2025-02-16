import { z } from "zod";

import { createEnv } from "@homarr/env";

export const env = createEnv({
  server: {
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  },
  experimental__runtimeEnv: process.env,
});
