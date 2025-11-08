import type Docker from "dockerode";

export type { DockerInstance } from "./singleton";
export { DockerSingleton } from "./singleton";
export type { ContainerInfo, Container, Port } from "dockerode";
export type { Docker };

export const containerStates = ["created", "running", "paused", "restarting", "exited", "removing", "dead", "orphaned"] as const;

export type ContainerState = (typeof containerStates)[number];
