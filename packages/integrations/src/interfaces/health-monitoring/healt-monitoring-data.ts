import type { AtLeastOneOf } from "@homarr/common/types";

// Array in this interface are for multiple of the component, while following internal arrays are for historical data
export interface HealthMonitoring {
  system: SystemInfos; //General system information
  cpu: (CpuExtraStats & StatsBase)[]; //Per core or Per node model
  memory: StatsBase[]; //Per system/node model
  network: StatsBase[]; //Per network interface, to be revisited if needed
  storage: StorageStats[]; //Per disk, not influenced by cluster
  history: AtLeastOneOf<HistoricalData>;
}

interface StatsBase {
  id: string;
  name: string;
  maxValue: number;
}

interface HistoricalData {
  timestamp: number;
  cpu: HistoryElement[];
  memory: HistoryElement[];
  networkUp: HistoryElement[];
  networkDown: HistoryElement[];
}

interface HistoryElement {
  id: string;
  value: number;
}

interface SystemInfos {
  name: string;
  type: "single" | "cluster";
  version: string;
  uptime: number;
  rebootRequired?: boolean;
  updateAvailable?: boolean;
}

interface CpuExtraStats {
  status?: unknown;
  temp?: number;
}

interface StorageStats {
  name: string;
  used: number;
  size: number;
  temp?: number;
  smartStatus?: string;
}
