import type Docker from "dockerode";
import type { DockerEndpointCapability } from "./endpoint-descriptor";

export type { DockerEndpointInitializationFailure, DockerInstance } from "./singleton";
export { DockerSingleton } from "./singleton";
export * from "./endpoint-descriptor";
export type { ContainerInfo, Container, Port } from "dockerode";
export type { Docker };

export const containerStates = ["created", "running", "paused", "restarting", "exited", "removing", "dead"] as const;

export type ContainerState = (typeof containerStates)[number];

export interface DockerContainerTarget {
  endpointId: string;
  id: string;
}

export interface DockerEndpointStatus {
  id: string;
  name: string;
  status: "available" | "degraded" | "unavailable";
  kind?: "docker" | "podman";
  transport?: "socket" | "tcp" | "tls";
  capabilities?: DockerEndpointCapability[];
  source?: "environment" | "legacy" | "default";
  scope?: "admin";
}

export * from "./labels";
export * from "./discovery";
