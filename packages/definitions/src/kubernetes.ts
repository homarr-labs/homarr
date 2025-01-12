export const kubernetesNodeStates = ["Ready", "NotReady"] as const;
export const kubernetesResourceTypes = ["Reserved", "Used"] as const;
export const kubernetesCapacityTypes = ["Pods", "CPU", "Memory"] as const;

export type KubernetesNodeState = (typeof kubernetesNodeStates)[number];
export type KubernetesResourceType = (typeof kubernetesResourceTypes)[number];
export type KubernetesCapacityType = (typeof kubernetesCapacityTypes)[number];

export interface KubernetesNode {
  name: string;
  status: KubernetesNodeState;
  ramGB: number;
  cpuCores: number;
  agentVersion: string;
  kubernetesVersion: string;
  lastHeartbeatTime: string | Date;
}

export interface KubernetesCluster {
  name: string;
  providers: string;
  kubernetesVersion: string;
  architecture: string;
  nodeCount: number;
  capacity: KubernetesCapacity[];
}

export interface KubernetesCapacity {
  type: KubernetesCapacityType;
  resourcesStats: KubernetesResourceStat[];
}

export interface KubernetesResourceStat {
  percentageValue: number;
  type: KubernetesResourceType;
  capacityUnit?: string;
  usedValue: number;
  maxUsedValue: number;
}

export interface ClusterResourceCount {
  label: string;
  count: number;
}
