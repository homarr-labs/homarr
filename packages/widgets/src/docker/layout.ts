export type DockerColumn = "name" | "state" | "host" | "cpuUsage" | "memoryUsage" | "actions";

export const getDockerColumnVisibility = (
  configuredColumns: readonly DockerColumn[],
  width: number,
  isAdvanced: boolean,
): Record<DockerColumn, boolean> => {
  const configured = new Set(configuredColumns);
  const priority: DockerColumn[] = ["name", "state", "cpuUsage", "memoryUsage", "host", "actions"];
  let budget = priority.length;
  if (!isAdvanced) {
    if (width < 280) budget = 2;
    else if (width < 420) budget = 3;
    else if (width < 640) budget = 4;
  }
  const visible = new Set(priority.filter((column) => configured.has(column)).slice(0, budget));
  const isVisible = (column: DockerColumn) => isAdvanced || visible.has(column);

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
  cpu: isAdvanced || width >= 420,
  memory: isAdvanced || width >= 560,
});
