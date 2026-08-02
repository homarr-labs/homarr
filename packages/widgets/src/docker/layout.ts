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
    state: isVisible("state") && (isAdvanced || width >= 340 || !configured.has("name")),
    host: isVisible("host") && (isAdvanced || width >= 640),
    cpuUsage: isVisible("cpuUsage") && (isAdvanced || width >= 420),
    memoryUsage: isVisible("memoryUsage") && (isAdvanced || width >= 520),
    actions: isVisible("actions"),
  };
};

export const getDockerFooterVisibility = (width: number, isAdvanced: boolean) => ({
  footer: isAdvanced || width > 256,
  cpu: isAdvanced || width >= 360,
  memory: isAdvanced || width >= 480,
});
