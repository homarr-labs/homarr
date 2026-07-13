import type { LxcResource, NodeResource, QemuResource, StorageResource } from "../../types";

export interface SystemHealthMonitoring {
  version: string;
  cpuModelName: string;
  /**
   * CPU usage as a share of the WHOLE machine, in percent (0-100).
   *
   * This is the homarr-wide convention for every CPU reading: a machine with
   * 3 of 4 cores fully busy reports 75, never 300. Integrations must convert
   * per-core readings (sums, or docker-stats style values that can exceed
   * 100) into the total-system share before returning them here.
   */
  cpuUtilization: number;
  memUsedInBytes: number;
  memAvailableInBytes: number;
  uptime: number;
  network: {
    up: number;
    down: number;
  } | null;
  loadAverage: {
    "1min": number;
    "5min": number;
    "15min": number;
  } | null;
  rebootRequired: boolean;
  availablePkgUpdates: number;
  cpuTemp: number | undefined;
  fileSystem: {
    deviceName: string;
    used: string;
    available: string;
    percentage: number;
  }[];
  smart: {
    deviceName: string;
    temperature: number | null;
    overallStatus: string;
    healthy: boolean;
  }[];
  gpu: {
    gpuId: string;
    name: string;
    memoryUtilization: number;
    processorUtilization: number;
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
