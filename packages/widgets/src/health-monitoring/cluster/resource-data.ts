import type { Resource } from "@homarr/integrations/types";

type Metric = "cpu" | "memory" | "storage";

export function resourcePercentage(resource: Resource, metric: Metric): number | null {
  if (!resource.isRunning) return null;
  let value: number | null = null;
  if (metric === "cpu" && resource.type !== "storage") value = resource.cpu.utilization * 100;
  if (
    metric === "memory" &&
    resource.type !== "storage" &&
    Number.isFinite(resource.memory.total) &&
    resource.memory.total > 0
  )
    value = (resource.memory.used / resource.memory.total) * 100;
  if (metric === "storage") {
    if (resource.type === "storage" && Number.isFinite(resource.total) && resource.total > 0)
      value = (resource.used / resource.total) * 100;
    if (resource.type !== "storage" && Number.isFinite(resource.storage.total) && resource.storage.total > 0)
      value = (resource.storage.used / resource.storage.total) * 100;
  }
  if (value === null || !Number.isFinite(value) || value < 0) return null;
  return value;
}
