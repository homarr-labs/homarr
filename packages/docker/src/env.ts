import { z } from "zod";

import { createEnv } from "@homarr/env";
import { createBooleanSchema } from "@homarr/env/schemas";

export const env = createEnv({
  server: {
    // Comma separated list of docker hostnames that can be used to connect to query the docker endpoints (localhost:2375,host.docker.internal:2375, ...)
    DOCKER_HOSTNAMES: z.string().optional(),
    DOCKER_PORTS: z.string().optional(),
    ENABLE_DOCKER: createBooleanSchema(true),
    ENABLE_KUBERNETES: createBooleanSchema(false),
  },
  experimental__runtimeEnv: process.env,
});
