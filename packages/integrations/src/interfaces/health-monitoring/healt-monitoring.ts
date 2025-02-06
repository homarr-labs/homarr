export interface HealthMonitoring {
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
    temperature: number;
    overallStatus: string;
  }[];
}
