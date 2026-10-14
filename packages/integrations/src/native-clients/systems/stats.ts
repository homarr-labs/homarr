import type { SystemHealthMonitoring } from "../../interfaces/health-monitoring/health-monitoring-types";
import type { ProxmoxClusterInfo } from "../../proxmox/proxmox-types";
import type { BeszelSystem } from "../../beszel/beszel-types";
import type { StatsMetric } from "../../stats/types";

export const systemHealthStatsMetrics: StatsMetric[] = [
  { key: "cpu", label: "CPU", unit: "percent" },
  { key: "memoryUsed", label: "Memory used", unit: "bytes" },
  { key: "memoryAvailable", label: "Memory available", unit: "bytes" },
  { key: "uptime", label: "Uptime", unit: "seconds" },
];
export const proxmoxStatsMetrics: StatsMetric[] = [
  { key: "nodes", label: "Nodes", unit: "count" },
  { key: "vms", label: "Virtual machines", unit: "count" },
  { key: "lxcs", label: "Containers", unit: "count" },
];
export const beszelStatsMetrics: StatsMetric[] = [{ key: "systems", label: "Systems", unit: "count" }];

export const pickSystemHealthStats = (data: SystemHealthMonitoring) => ({
  cpu: data.cpuUtilization,
  memoryUsed: data.memUsedInBytes,
  memoryAvailable: data.memAvailableInBytes,
  uptime: data.uptime,
});
export const pickProxmoxStats = (data: ProxmoxClusterInfo) => ({
  nodes: data.nodes.length,
  vms: data.vms.length,
  lxcs: data.lxcs.length,
});
export const pickBeszelStats = (data: BeszelSystem[]) => ({ systems: data.length });
