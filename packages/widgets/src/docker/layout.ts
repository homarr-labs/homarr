export type DockerColumn = "name" | "state" | "host" | "cpuUsage" | "memoryUsage" | "actions";

export const getDockerColumnVisibility = (
  configuredColumns: readonly DockerColumn[],
  _width: number,
  isAdvanced: boolean,
): Record<DockerColumn, boolean> => {
  const configured = new Set(configuredColumns);
  const isVisible = (column: DockerColumn) => isAdvanced || configured.has(column);

  return {
    name: isVisible("name"),
    state: isVisible("state"),
    host: isVisible("host"),
    cpuUsage: isVisible("cpuUsage"),
    memoryUsage: isVisible("memoryUsage"),
    actions: isVisible("actions"),
  };
};

export const getDockerFooterVisibility = (width: number, isAdvanced: boolean) => ({
  footer: isAdvanced || width > 256,
  cpu: isAdvanced || width > 256,
  memory: isAdvanced || width > 256,
});
