import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

import { shouldSkipEnvValidation } from "@homarr/common/env-validation";

export const env = createEnv({
  server: {
    // Comma separated list of docker hostnames that can be used to connect to query the docker endpoints (localhost:2375,host.docker.internal:2375, ...)
    DOCKER_HOSTNAMES: z.string().optional(),
    DOCKER_PORTS: z.string().optional(),
  },
  runtimeEnv: {
    DOCKER_HOSTNAMES: process.env.DOCKER_HOSTNAMES,
    DOCKER_PORTS: process.env.DOCKER_PORTS,
  },
  skipValidation: shouldSkipEnvValidation(),
  emptyStringAsUndefined: true,
});
