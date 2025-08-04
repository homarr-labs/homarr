import type { LxcResource, NodeResource, QemuResource, StorageResource } from "../../types";

export interface SystemHealthMonitoring {
  version: string;
  cpuModelName: string;
  cpuUtilization: number;
  memUsed: string;
  memAvailable: string;
  uptime: number;
  loadAverage: {
    "1min": number;
    "5min": number;
    "15min": number;
  };
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
  }[];
}

// TODO: in the future decouple this from the Proxmox integration
export interface ClusterHealthMonitoring {
  nodes: NodeResource[];
  lxcs: LxcResource[];
  vms: QemuResource[];
  storages: StorageResource[];
}
