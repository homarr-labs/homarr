import type { z } from "zod";

import { createLogger } from "@homarr/core/infrastructure/logs";

import { HandleIntegrationErrors } from "../base/errors/decorator";
import type { IntegrationHttpAuthentication } from "../http-auth";
import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { createSessionStore } from "../base/session-store";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ISystemHealthMonitoringIntegration } from "../interfaces/health-monitoring/health-monitoring-integration";
import type { SystemHealthMonitoring } from "../interfaces/health-monitoring/health-monitoring-types";
import { SynologyClient } from "./synology-client";
import { parseSynologyNumber } from "./synology-types";
import type { SynologyDiskRecord, SynologyVolumeRecord } from "./synology-types";
import type { synologySystemInfoDataSchema, synologyUtilizationDataSchema } from "./synology-types";

const logger = createLogger({ module: "synologyIntegration" });

type StoredSession = {
  cookieHeader: string;
};

@HandleIntegrationErrors([])
export class SynologyIntegration extends Integration implements ISystemHealthMonitoringIntegration {
  private readonly sessionStore = createSessionStore<StoredSession>(this.integration);
  private client?: SynologyClient;

  public override async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    return await this.getClient().getHttpAuthenticationAsync();
  }

  protected async testingAsync(_input: IntegrationTestingInput): Promise<TestingResult> {
    await this.getClient().testConnectionAsync();
    return { success: true };
  }

  public async getSystemInfoAsync(): Promise<SystemHealthMonitoring> {
    const client = this.getClient();

    const [systemInfo, utilization, volumes] = await Promise.all([
      client.getSystemInfoAsync(),
      client.getUtilizationAsync(),
      client.getStorageVolumesAsync(),
    ]);

    const [storageLoadInfoResult, smartInfoResult, systemStatusResult, upgradeStatusResult, upgradeCheckResult] =
      await Promise.allSettled([
        client.getStorageLoadInfoAsync(),
        client.getSmartInfoAsync(),
        client.getSystemStatusAsync(),
        client.getUpgradeStatusAsync(),
        client.getUpgradeCheckAsync(),
      ]);

    const storageLoadInfo = getSettledValue(storageLoadInfoResult);
    const smartInfo = getSettledValue(smartInfoResult);
    const systemStatus = getSettledValue(systemStatusResult);
    const upgradeStatus = getSettledValue(upgradeStatusResult);
    const upgradeCheck = getSettledValue(upgradeCheckResult);

    const diskRecords = mergeDiskRecords(
      storageLoadInfo ? client.mapDisksFromLoadInfo(storageLoadInfo) : [],
      smartInfo ? client.mapDisksFromSmartInfo(smartInfo) : [],
    );

    const memory = mapMemoryBytes(utilization);
    const network = mapNetworkTraffic(utilization);
    const loadAverage = mapLoadAverage(utilization);
    const smart = mapVolumeSmartEntries(volumes, diskRecords);
    const rebootRequired = systemStatus?.reboot_required ?? upgradeStatus?.reboot_required ?? null;
    let availablePkgUpdates = upgradeCheck?.update_count ?? null;
    if (availablePkgUpdates === null && upgradeCheck?.available !== undefined)
      availablePkgUpdates = Number(upgradeCheck.available);

    return {
      version: mapVersion(systemInfo),
      cpuModelName: systemInfo.model ?? "Unknown CPU",
      cpuUtilization: mapCpuUtilization(utilization),
      memUsedInBytes: memory.usedBytes,
      memAvailableInBytes: memory.availableBytes,
      uptime: mapUptimeSeconds(systemInfo),
      network,
      loadAverage,
      rebootRequired,
      availablePkgUpdates,
      cpuTemp: mapCpuTemperature(systemInfo),
      fileSystem: mapFileSystemEntries(volumes),
      smart,
      gpu: [],
    };
  }

  public async listStorageVolumesAsync(): Promise<{ value: string; label: string }[]> {
    const volumes = await this.getClient().getStorageVolumesAsync();
    const { id: integrationId, name: integrationName } = this.integration;
    return volumes.map((volume) => ({
      value: `${integrationId}:${volume.name}`,
      label: `${volume.displayName ?? volume.name} (${integrationName})`,
    }));
  }

  private getClient(): SynologyClient {
    return (this.client ??= new SynologyClient({
      integrationId: this.integration.id,
      baseUrl: this.integration.url,
      username: this.getSecretValue("username"),
      password: this.getSecretValue("password"),
      sessionStore: this.sessionStore,
    }));
  }
}

function getSettledValue<T>(result: PromiseSettledResult<T>): T | null {
  if (result.status === "rejected") {
    logger.debug("Optional Synology API call failed", { reason: result.reason });
    return null;
  }
  return result.value;
}

function mapVersion(systemInfo: z.infer<typeof synologySystemInfoDataSchema>): string {
  if (systemInfo.version_string) {
    return systemInfo.version_string;
  }
  if (systemInfo.firmware_ver) {
    return systemInfo.firmware_ver;
  }
  if (systemInfo.version !== undefined) {
    return String(systemInfo.version);
  }
  return "Unknown";
}

function mapCpuUtilization(utilization: z.infer<typeof synologyUtilizationDataSchema>) {
  const userLoad = parseSynologyNumber(utilization.cpu?.user_load);
  const systemLoad = parseSynologyNumber(utilization.cpu?.system_load);
  if (userLoad === null || systemLoad === null) return null;
  const totalLoad = userLoad + systemLoad;
  return Math.min(totalLoad, 100);
}

function mapMemoryBytes(utilization: z.infer<typeof synologyUtilizationDataSchema>) {
  const memory = utilization.memory;
  const totalRealKib = parseSynologyNumber(memory?.total_real);
  const realUsagePercent = parseSynologyNumber(memory?.real_usage);

  // DSM utilization API reports memory sizes in KiB, not bytes.
  if (totalRealKib !== null && realUsagePercent !== null) {
    const totalBytes = totalRealKib * 1024;
    const usedBytes = Math.round((totalBytes * realUsagePercent) / 100);
    return {
      usedBytes,
      availableBytes: Math.max(totalBytes - usedBytes, 0),
    };
  }

  const availableKib = parseSynologyNumber(memory?.avail_real);
  if (totalRealKib === null || availableKib === null) return { usedBytes: null, availableBytes: null };
  return {
    usedBytes: Math.max(totalRealKib - availableKib, 0) * 1024,
    availableBytes: availableKib * 1024,
  };
}

function mapNetworkTraffic(utilization: z.infer<typeof synologyUtilizationDataSchema>) {
  const totalNetwork = utilization.network?.find((entry) => entry.device === "total");
  if (!totalNetwork) {
    return null;
  }

  const received = parseSynologyNumber(totalNetwork.rx);
  const transmitted = parseSynologyNumber(totalNetwork.tx);
  if (received === null || transmitted === null) {
    return null;
  }

  return {
    up: transmitted,
    down: received,
  };
}

function mapLoadAverage(utilization: z.infer<typeof synologyUtilizationDataSchema>) {
  const oneMinute = parseSynologyNumber(utilization.cpu?.["1min_load"]);
  const fiveMinute = parseSynologyNumber(utilization.cpu?.["5min_load"]);
  const fifteenMinute = parseSynologyNumber(utilization.cpu?.["15min_load"]);

  if (oneMinute === null && fiveMinute === null && fifteenMinute === null) {
    return null;
  }

  return {
    "1min": oneMinute,
    "5min": fiveMinute,
    "15min": fifteenMinute,
  };
}

function mapUptimeSeconds(systemInfo: z.infer<typeof synologySystemInfoDataSchema>) {
  if (typeof systemInfo.uptime === "number") {
    return systemInfo.uptime;
  }

  if (!systemInfo.up_time) {
    return null;
  }

  const parts = systemInfo.up_time.split(":").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  const [hours = 0, minutes = 0, seconds = 0] = parts;
  return hours * 3600 + minutes * 60 + seconds;
}

function mapCpuTemperature(systemInfo: z.infer<typeof synologySystemInfoDataSchema>): number | undefined {
  const temperature = parseSynologyNumber(systemInfo.sys_temp ?? systemInfo.temperature);
  return temperature === null ? undefined : temperature;
}

function mapFileSystemEntries(volumes: SynologyVolumeRecord[]) {
  return volumes.map((volume) => {
    const availableBytes = Math.max(volume.totalBytes - volume.usedBytes, 0);
    return {
      deviceName: volume.name,
      used: `${volume.usedBytes}`,
      available: `${availableBytes}`,
      percentage: (volume.usedBytes / volume.totalBytes) * 100,
    };
  });
}

function mapVolumeSmartEntries(volumes: SynologyVolumeRecord[], diskRecords: SynologyDiskRecord[]) {
  return volumes.map((volume) => {
    const matchingDisks = diskRecords.filter((disk) => diskBelongsToVolume(disk, volume.name));
    const temperatures = matchingDisks
      .map((disk) => disk.temperature)
      .filter((temperature): temperature is number => temperature !== null);
    const overallStatus = volume.status ?? pickWorstDiskStatus(matchingDisks);

    return {
      deviceName: volume.name,
      healthy: isHealthyStatus(overallStatus),
      overallStatus: overallStatus ?? "unknown",
      temperature: temperatures.length > 0 ? Math.max(...temperatures) : null,
    };
  });
}

function mergeDiskRecords(
  loadInfoDisks: SynologyDiskRecord[],
  smartInfoDisks: SynologyDiskRecord[],
): SynologyDiskRecord[] {
  const diskMap = new Map<string, SynologyDiskRecord>();

  for (const disk of loadInfoDisks) {
    diskMap.set(disk.identifier, disk);
  }

  for (const disk of smartInfoDisks) {
    const existingDisk = diskMap.get(disk.identifier);
    diskMap.set(disk.identifier, {
      identifier: disk.identifier,
      name: existingDisk?.name ?? disk.name,
      status: disk.status ?? existingDisk?.status,
      temperature: disk.temperature ?? existingDisk?.temperature ?? null,
      volumeName: existingDisk?.volumeName ?? disk.volumeName,
    });
  }

  return [...diskMap.values()];
}

function diskBelongsToVolume(disk: SynologyDiskRecord, volumeName: string): boolean {
  if (!disk.volumeName) {
    return false;
  }

  return normalizeVolumeName(disk.volumeName) === normalizeVolumeName(volumeName);
}

// DSM can identify the same volume as volume_1 or /volume1.
function normalizeVolumeName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "")
    .replace(/^volume_(\d+)$/, "volume$1");
}

const UNHEALTHY_STATUS_TOKENS = [
  "critical",
  "error",
  "crash",
  "failed",
  "fail",
  "degraded",
  "warning",
  "attention",
] as const;

function getStatusSeverityIndex(status: string): number {
  const normalizedStatus = status.toLowerCase();
  const index = UNHEALTHY_STATUS_TOKENS.findIndex((token) => normalizedStatus.includes(token));
  return index === -1 ? UNHEALTHY_STATUS_TOKENS.length : index;
}

function pickWorstDiskStatus(disks: SynologyDiskRecord[]) {
  const statuses = disks
    .map((disk) => disk.status)
    .filter((status): status is string => status !== undefined && status.length > 0);

  if (statuses.length === 0) {
    return undefined;
  }

  return statuses.reduce((worstStatus, currentStatus) =>
    getStatusSeverityIndex(currentStatus) < getStatusSeverityIndex(worstStatus) ? currentStatus : worstStatus,
  );
}

function isHealthyStatus(status: string | undefined): boolean | null {
  if (!status) {
    return null;
  }
  const normalizedStatus = status.toLowerCase();
  if (["normal", "healthy", "good", "ok"].includes(normalizedStatus)) return true;
  if (UNHEALTHY_STATUS_TOKENS.some((token) => normalizedStatus.includes(token))) return false;
  return null;
}
