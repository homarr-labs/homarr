import { TRPCError } from "@trpc/server";
import type { Session } from "@homarr/auth";
import { env as dockerEnv } from "@homarr/docker/env";
import { dockerContainersRequestHandler } from "@homarr/request-handler/docker";
import { parseLinkedDockerContainer } from "@homarr/validation/app";
import { isDemoMode } from "../../trpc";

// Linking changes which container the App tile controls; ordinary app-edit permission is not Docker access.
export const validateAppDockerContainerAsync = async (value: string | null, user: Session["user"]) => {
  if (!user.permissions.includes("admin")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Docker container linking requires admin permission" });
  }
  if (value === null) return;
  if (!dockerEnv.ENABLE_DOCKER && !isDemoMode) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Docker route is not available" });
  }
  const link = parseLinkedDockerContainer(value);
  const { data } = await dockerContainersRequestHandler.handler({}).getDataAsync();
  const exists =
    link && data.containers.some(({ endpointId, name }) => endpointId === link.endpointId && name === link.name);
  if (!exists) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Docker container was not found on the selected endpoint" });
  }
};
