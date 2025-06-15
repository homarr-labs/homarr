import { z } from "zod/v4";

import { env as commonEnv } from "@homarr/common/env";
import { createEnv } from "@homarr/env";

export const env = createEnv({
  server: {
    // TODO: Generate a key in production (e.g. using `openssl rand -base64 32`)
    CRON_JOB_API_KEY: commonEnv.NODE_ENV === "development" ? z.string().default("test") : z.string(),
  },
  experimental__runtimeEnv: process.env,
});
