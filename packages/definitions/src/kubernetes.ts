export const kubernetesNodeStates = ["Ready", "NotReady"] as const;

export type KubernetesNodeState = (typeof kubernetesNodeStates)[number];

export interface KubernetesNode {
  name: string;
  status: KubernetesNodeState;
  ramGB: number;
  cpuCores: number;
  agentVersion: string;
  kubernetesVersion: string;
  lastHeartbeatTime: string | Date;
}
