import { z } from "zod/v4";

import { createBooleanSchema, createEnv } from "@homarr/core/infrastructure/env";

export const env = createEnv({
  server: {
    // Comma separated list of docker hostnames that can be used to connect to query the docker endpoints (localhost,host.docker.internal, ...)
    DOCKER_HOSTNAMES: z.string().optional(),
    DOCKER_PORTS: z.string().optional(),
    // Comma separated paths to Docker-compatible Unix sockets (e.g., /var/run/docker.sock,/run/user/1000/podman/podman.sock)
    DOCKER_SOCKET_PATHS: z.string().optional(),
    ENABLE_DOCKER: createBooleanSchema(true),
    ENABLE_KUBERNETES: createBooleanSchema(false),
  },
  experimental__runtimeEnv: process.env,
});
