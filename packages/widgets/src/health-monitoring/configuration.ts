export const healthMetrics = ["cpu", "memory", "storage", "temperature", "network", "gpu"] as const;
export type HealthMetric = (typeof healthMetrics)[number];

export const healthMetricLabels = {
  cpu: "cpu",
  memory: "memory",
  storage: "storage",
  temperature: "cpuTemperature",
  network: "network",
  gpu: "graphics",
} as const satisfies Record<HealthMetric, string>;

export function isHealthMetric(value: unknown): value is HealthMetric {
  return healthMetrics.some((metric) => metric === value);
}

interface MetricOptions {
  metricOrder?: unknown;
  cpu?: unknown;
  memory?: unknown;
  fileSystem?: unknown;
  gpu?: unknown;
}

/** An empty override preserves the metric choices on dashboards saved before ordering was available. */
export function getHealthMetricOrder(options: MetricOptions): HealthMetric[] {
  if (Array.isArray(options.metricOrder)) {
    const explicit = [...new Set(options.metricOrder.filter(isHealthMetric))];
    if (explicit.length > 0) return explicit;
  }
  const metrics: HealthMetric[] = [];
  if (options.cpu !== false) metrics.push("cpu");
  if (options.memory !== false) metrics.push("memory");
  if (options.fileSystem !== false) metrics.push("storage");
  if (options.cpu !== false) metrics.push("temperature");
  if (options.cpu !== false || options.memory !== false) metrics.push("network");
  if (options.gpu !== false) metrics.push("gpu");
  return metrics;
}
