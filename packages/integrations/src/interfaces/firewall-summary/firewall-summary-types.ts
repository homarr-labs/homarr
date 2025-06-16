export interface FirewallInterfaceSummary {
  name: string;
  recv: number;
  trans: number;
}

export interface FirewallVersionSummary {
  version: string;
}

export interface FirewallCpuSummary {
  cpu:{
    idle: number;
    system: number;
    user: number;
  }
}

export interface FirewallMemorySummary {
  memory: {
    used: number;
    total: number;
    percent: number;
  }
}