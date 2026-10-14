import type { DockerSingleton } from "@homarr/docker";
import type {
  dockerContainersRequestHandler,
  findDockerContainerAsync,
  getContainerLogsAsync,
  getDockerEndpointsAsync,
  hasDockerEndpointCapability,
  streamContainerLogsAsync,
} from "@homarr/request-handler/docker";

export interface DockerProcedureResources {
  readonly enableDocker: boolean;
  readonly singleton: Pick<typeof DockerSingleton, "reset">;
  readonly dockerContainersRequestHandler: Pick<typeof dockerContainersRequestHandler, "handler" | "invalidateCache">;
  readonly findDockerContainerAsync: typeof findDockerContainerAsync;
  readonly getContainerLogsAsync: typeof getContainerLogsAsync;
  readonly getDockerEndpointsAsync: typeof getDockerEndpointsAsync;
  readonly hasDockerEndpointCapability: typeof hasDockerEndpointCapability;
  readonly streamContainerLogsAsync: typeof streamContainerLogsAsync;
}
