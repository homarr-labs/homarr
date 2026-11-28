import type { LxcResource, NodeResource, QemuResource, StorageResource } from "../../types";

export interface SystemHealthMonitoring {
  version: string;
  cpuModelName: string;
  cpuUtilization: number | null;
  /** Usage per logical CPU, when the integration provides it. */
  cpuCores?: { id: number; utilization: number }[];
  memUsedInBytes: number | null;
  memAvailableInBytes: number | null;
  uptime: number | null;
  network: {
    up: number;
    down: number;
  } | null;
  loadAverage: {
    "1min": number | null;
    "5min": number | null;
    "15min": number | null;
  } | null;
  rebootRequired: boolean | null;
  availablePkgUpdates: number | null;
  cpuTemp: number | undefined;
  fileSystem: {
    deviceName: string;
    used: string;
    available: string;
    /** Total capacity in bytes, when the provider reports it separately. */
    size?: number;
    percentage: number;
  }[];
  smart: {
    deviceName: string;
    temperature: number | null;
    overallStatus: string;
    healthy: boolean | null;
    // What the health verdict is based on, shown in the widget's status tooltip.
    statusReason?:
      | { type: "attributesWithinThresholds" }
      | { type: "attributesFailed"; attributes: string[] }
      | { type: "noCriticalWarning" }
      | { type: "criticalWarning" };
  }[];
  gpu: {
    gpuId: string;
    name: string;
    memoryUtilization: number | null;
    processorUtilization: number | null;
    temperature: number | null;
    fanSpeed: number | null;
  }[];
}

// TODO: in the future decouple this from the Proxmox integration
export interface ClusterHealthMonitoring {
  nodes: NodeResource[];
  lxcs: LxcResource[];
  vms: QemuResource[];
  storages: StorageResource[];
}
