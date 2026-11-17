import type { SystemHealthMonitoring } from "../..";
import type { ISystemHealthMonitoringIntegration } from "../../interfaces/health-monitoring/health-monitoring-integration";

export class SystemHealthMonitoringMockService implements ISystemHealthMonitoringIntegration {
  private tick = 0;

  public async getSystemInfoAsync(): Promise<SystemHealthMonitoring> {
    const gibibyte = 1024 ** 3;
    const wave = Math.sin(this.tick++ / 4);
    const cpuCores = [14, 18, 22, 30, 24, 20, 16, 12, 10, 14, 18, 18].map((utilization, id) => ({
      id,
      utilization: Math.round((utilization + wave * 4) * 10) / 10,
    }));
    const memUsedInBytes = 6.5 * gibibyte + Math.round(wave * 64 * 1024 ** 2);

    return await Promise.resolve({
      version: "7.0.8",
      cpuModelName: "Intel Core i5-12500",
      cpuUtilization: cpuCores.reduce((total, core) => total + core.utilization, 0) / cpuCores.length,
      cpuCores,
      memUsedInBytes,
      memAvailableInBytes: 16 * gibibyte - memUsedInBytes,
      availablePkgUpdates: 3,
      network: {
        up: Math.round((8 + wave) * 1024 ** 2),
        down: Math.round((24 + wave * 3) * 1024 ** 2),
      },
      rebootRequired: false,
      cpuTemp: Math.round(46 + wave * 2),
      uptime: 21 * 24 * 60 * 60 + this.tick * 5,
      fileSystem: [
        { deviceName: "/", used: "384 GiB", available: "640 GiB", size: 1024 * gibibyte, percentage: 37.5 },
        { deviceName: "/mnt/media", used: "3 TiB", available: "5 TiB", size: 8192 * gibibyte, percentage: 37.5 },
        { deviceName: "/mnt/backups", used: "512 GiB", available: "1536 GiB", size: 2048 * gibibyte, percentage: 25 },
      ],
      loadAverage: {
        "1min": 1.8,
        "5min": 1.6,
        "15min": 1.4,
      },
      smart: [
        {
          deviceName: "Samsung 980 1TB",
          temperature: 41,
          overallStatus: "PASSED",
          healthy: true,
          statusReason: { type: "noCriticalWarning" },
        },
        {
          deviceName: "WD Red Plus 8TB",
          temperature: 34,
          overallStatus: "PASSED",
          healthy: true,
          statusReason: { type: "attributesWithinThresholds" },
        },
      ],
      gpu: [
        {
          gpuId: "mock0",
          name: "Intel UHD Graphics 770",
          memoryUtilization: 12,
          processorUtilization: Math.round((16 + wave * 3) * 10) / 10,
          temperature: 44,
          fanSpeed: null,
        },
      ],
    });
  }
}
