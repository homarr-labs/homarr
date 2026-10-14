import type { InferRouterInputs, InferRouterOutputs, RouterClient } from "@orpc/server";

import type { createDockerProcedures } from "@homarr/api/nitro/routers/docker";

export const dockerFeaturePaths = [
  "docker.reconcileServices",
  "docker.getServiceHealth",
  "docker.refreshInventory",
  "docker.getContainers",
  "docker.getEndpoints",
  "docker.startAll",
  "docker.stopAll",
  "docker.restartAll",
  "docker.removeAll",
  "docker.logs",
  "docker.subscribeLogs",
] as const;

type SourceRouter = ReturnType<typeof createDockerProcedures>;
type SourceInputs = InferRouterInputs<SourceRouter>;
type SourceOutputs = InferRouterOutputs<SourceRouter>;

export type DockerLogIterator = SourceOutputs["subscribeLogs"];

export interface DockerFeatureClient {
  docker: RouterClient<SourceRouter>;
}

export type DockerInventory = SourceOutputs["getContainers"];
export type DockerContainer = DockerInventory["containers"][number];
export type DockerEndpoint = DockerInventory["endpoints"][number];
export type DockerReconciliation = SourceOutputs["reconcileServices"];
export type DockerCandidate = DockerReconciliation["candidates"][number];
export type DockerHealth = SourceOutputs["getServiceHealth"];
export type DockerServiceHealth = DockerHealth["services"][number];
export type DockerActionResults = SourceOutputs["startAll"];
export type DockerLogInput = SourceInputs["subscribeLogs"];
export type DockerAction = "start" | "stop" | "restart" | "remove";

export function endpointHasCapability(
  endpoint: DockerEndpoint | undefined,
  capability: "logs" | "lifecycle" | "remove",
) {
  if (!endpoint) return false;
  return endpoint.capabilities === undefined || endpoint.capabilities.includes(capability);
}

export function getContainerTarget({ endpointId, id }: DockerContainer) {
  return { endpointId, id };
}
