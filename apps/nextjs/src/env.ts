import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

import { shouldSkipEnvValidation } from "@homarr/common/env-validation";

export const env = createEnv({
  shared: {
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    ENABLE_DOCKER: z.coerce.boolean().default(true),
    ENABLE_KUBERNETES: z.coerce.boolean().default(false),
  },
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app isn't
   * built with invalid env vars.
   */
  server: {},
  /**
   * Specify your client-side environment variables schema here.
   * For them to be exposed to the client, prefix them with `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },
  /**
   * Destructure all variables from `process.env` to make sure they aren't tree-shaken away.
   */
  runtimeEnv: {
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    ENABLE_DOCKER: process.env.NEXT_PUBLIC_ENABLE_DOCKER ? process.env.NEXT_PUBLIC_ENABLE_DOCKER === "true" : true,
    ENABLE_KUBERNETES: process.env.NEXT_PUBLIC_ENABLE_KUBERNETES
      ? process.env.NEXT_PUBLIC_ENABLE_KUBERNETES === "true"
      : false,
    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
  },
  skipValidation: shouldSkipEnvValidation(),
  emptyStringAsUndefined: true,
});
