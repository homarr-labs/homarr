export type SystemLoadStatus = "good" | "warning" | "critical" | "unknown";
export type SystemStatus = "up" | "down" | "paused" | "pending";
export type AgentConnectionType = "ssh" | "webSocket";

export interface System {
  id: string;
  name: string;
  status: SystemStatus;
  usage: SystemUsage;
  agent: {
    connectionType: AgentConnectionType | null;
    version: string;
  };
}

export interface SystemUsage {
  cpuPercentage: number;
  memoryPercentage: number;
  diskPercentage: number;
  gpuPercentage: number | null;
  load: {
    status: SystemLoadStatus;
    averages: {
      one: number;
      five: number;
      fifteen: number;
    };
  };
  networkBytes: number;
  temperature: number | null;
}
