import type { NodeResource, Resource } from "@homarr/integrations/types";

type Metric = "cpu" | "memory" | "storage";
type Capacity = { used: number; total: number };

export function resourceCapacity(resource: Resource, metric: Metric): Capacity | null {
  if (!resource.isRunning) return null;
  let used: number | null;
  let total: number | null;
  if (metric === "cpu") {
    if (resource.type === "storage" || resource.cpu.cores === null || resource.cpu.utilization === null) return null;
    total = resource.cpu.cores;
    used = total * resource.cpu.utilization;
  } else if (metric === "memory") {
    if (resource.type === "storage") return null;
    ({ used, total } = resource.memory);
  } else if (resource.type === "storage") {
    ({ used, total } = resource);
  } else {
    ({ used, total } = resource.storage);
  }
  if (used === null || total === null || !Number.isFinite(used) || !Number.isFinite(total) || used < 0 || total <= 0)
    return null;
  return { used, total };
}

export function resourcePercentage(resource: Resource, metric: Metric): number | null {
  if (metric === "cpu") {
    if (!resource.isRunning || resource.type === "storage") return null;
    const { utilization } = resource.cpu;
    if (utilization === null || !Number.isFinite(utilization) || utilization < 0) return null;
    return utilization * 100;
  }
  const capacity = resourceCapacity(resource, metric);
  if (!capacity) return null;
  return (capacity.used / capacity.total) * 100;
}

/** Avoid presenting a partial sum as utilization of the whole cluster. */
export function clusterCapacity(nodes: NodeResource[], metric: "cpu" | "memory"): Capacity | null {
  let used = 0;
  let total = 0;
  for (const node of nodes) {
    if (!node.isRunning) continue;
    const reading = resourceCapacity(node, metric);
    if (!reading) return null;
    used += reading.used;
    total += reading.total;
  }
  if (total === 0) return null;
  return { used, total };
}
