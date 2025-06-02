import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

import { shouldSkipEnvValidation } from "@homarr/common/env-validation";

export const env = createEnv({
  server: {
    KUBERNETES_SERVICE_ACCOUNT_NAME: z.string().optional(),
  },
  runtimeEnv: {
    KUBERNETES_SERVICE_ACCOUNT_NAME: process.env.KUBERNETES_SERVICE_ACCOUNT_NAME,
  },
  skipValidation: shouldSkipEnvValidation(),
  emptyStringAsUndefined: true,
});
