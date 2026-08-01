export type DockerColumn = "name" | "state" | "host" | "cpuUsage" | "memoryUsage" | "actions";

export const getDockerColumnVisibility = (
  configuredColumns: readonly DockerColumn[],
  width: number,
  isAdvanced: boolean,
): Record<DockerColumn, boolean> => {
  const configured = new Set(configuredColumns);
  const isVisible = (column: DockerColumn) => isAdvanced || configured.has(column);

  return {
    name: isVisible("name"),
    state: isVisible("state"),
    host: isVisible("host") && (isAdvanced || width >= 440),
    cpuUsage: isVisible("cpuUsage") && (isAdvanced || width >= 280),
    memoryUsage: isVisible("memoryUsage") && (isAdvanced || width >= 360),
    actions: isVisible("actions"),
  };
};
