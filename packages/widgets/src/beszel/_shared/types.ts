export type BeszelSystemStatus = "up" | "down" | "paused" | "pending";

export interface BeszelSystemRow {
  id: string;
  name: string;
  status: BeszelSystemStatus;
  cpu: number;
  memory: number;
  disk: number;
  gpu: number;
  loadAvg: [number, number, number] | null;
  netBytes: number;
  temp: number | null;
  battery: [number, number] | null;
  services: number;
  uptime: number;
  agentVersion: string;
  hostname: string;
  cpuModel: string;
  cores: number;
  memoryTotal: number;
  osName: string;
}
