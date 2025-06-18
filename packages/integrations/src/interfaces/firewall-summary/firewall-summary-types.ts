export interface FirewallInterfacesSummary {
  name: string;
  recv: number;
  trans: number;
}

export interface FirewallVersionSummary {
  version: string;
}

export interface FirewallCpuSummary {
  total: number;
  idle: number;
  system: number;
  user: number;
}

export interface FirewallMemorySummary {
  total: number;
  user: number;
  nice: number;
  system: number;
  intr: number;
  idle: number;
}
