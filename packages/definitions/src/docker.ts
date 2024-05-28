export const dockerContainerStatus = [
  "created",
  "running",
  "paused",
  "restarting",
  "exited",
  "removing",
  "dead",
] as const;

export type DockerContainerStatus = (typeof dockerContainerStatus)[number];
