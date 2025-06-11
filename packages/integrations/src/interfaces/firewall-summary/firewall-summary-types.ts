export interface FirewallSummary {
  cpu: {
    idle: number;
  };
  memory: {
    used: number;
    total: number;
    percent: number;
  };
  interfaces: FirewallInterfaceSummary[];
  version: string;
}

export interface FirewallInterfaceSummary {
  name: string;
  recv: number;
  trans: number;
}
