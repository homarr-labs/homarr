import type { IntegrationKind } from "@homarr/definitions";
import type { SystemHealthMonitoring } from "@homarr/integrations/types";

import { filterStorageVolumes, isSameStorageDevice, storageDeviceNamesMatch } from "../filter-storage-volumes";

export interface HealthSample {
  time: number;
  cpu: number | null;
  /** Used memory in bytes, independent of the installed memory capacity. */
  memory: number | null;
  networkUp: number | null;
  networkDown: number | null;
  temperature: number | null;
  gpu: Record<string, { usage: number | null; memory: number | null; temperature: number | null }>;
}

export interface HealthSystem {
  id: string;
  name: string;
  kind: IntegrationKind;
  health: SystemHealthMonitoring | null;
  updatedAt?: number;
  error?: string;
  history: HealthSample[];
}

export interface SystemCapabilities {
  loadUnit: "load" | "percent" | "none";
  healthScope: "disk" | "pool" | "volume" | "none";
  updates: boolean;
  reboot: boolean;
}

export type HealthVerdict = "healthy" | "attention" | "unknown";

export interface HealthVolume {
  id: string;
  name: string;
  percent: number | null;
  used: number | null;
  free: number | null;
  total: number | null;
  health: HealthVerdict;
  temperature: number | null;
  fileSystem?: SystemHealthMonitoring["fileSystem"][number];
  smart?: SystemHealthMonitoring["smart"][number];
}

export interface HealthAlert {
  type: "reboot" | "updates" | "storage" | "cpu" | "memory";
  count: number;
}

export interface HealthSystemSnapshot {
  system: HealthSystem;
  capabilities: SystemCapabilities;
  available: boolean;
  cpuPercent: number | null;
  memory: { used: number; total: number; available: number; percent: number } | null;
  temperature: number | null;
  network: { up: number | null; down: number | null } | null;
  volumes: HealthVolume[];
  fullestVolume: HealthVolume | null;
  storageHealth: HealthVerdict;
  alerts: HealthAlert[];
}

const capabilities: Partial<Record<IntegrationKind, SystemCapabilities>> = {
  openmediavault: { loadUnit: "load", healthScope: "disk", updates: true, reboot: true },
  dashDot: { loadUnit: "percent", healthScope: "none", updates: false, reboot: false },
  truenas: { loadUnit: "none", healthScope: "pool", updates: false, reboot: false },
  unraid: { loadUnit: "none", healthScope: "disk", updates: false, reboot: false },
  glances: { loadUnit: "none", healthScope: "disk", updates: false, reboot: false },
  synology: { loadUnit: "load", healthScope: "volume", updates: true, reboot: true },
  mock: { loadUnit: "load", healthScope: "disk", updates: true, reboot: true },
};
const unknownCapabilities: SystemCapabilities = {
  loadUnit: "none",
  healthScope: "none",
  updates: false,
  reboot: false,
};

export function getSystemCapabilities(kind: IntegrationKind): SystemCapabilities {
  return capabilities[kind] ?? unknownCapabilities;
}

export function finiteReading(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function nonNegativeReading(value: number | null | undefined): number | null {
  const reading = finiteReading(value);
  if (reading === null || reading < 0) return null;
  return reading;
}

function percentageReading(value: number | null | undefined): number | null {
  const reading = nonNegativeReading(value);
  if (reading === null || reading > 100) return null;
  return reading;
}

function byteReading(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  return nonNegativeReading(Number(value));
}

function memoryReading(health: SystemHealthMonitoring | null): HealthSystemSnapshot["memory"] {
  const used = nonNegativeReading(health?.memUsedInBytes);
  const available = nonNegativeReading(health?.memAvailableInBytes);
  if (used === null || available === null) return null;
  const total = used + available;
  if (!Number.isFinite(total) || total <= 0) return null;
  return { used, available, total, percent: (used / total) * 100 };
}

function healthVerdict(smart: HealthVolume["smart"]): HealthVerdict {
  if (smart?.healthy === true) return "healthy";
  if (smart?.healthy === false) return "attention";
  return "unknown";
}

function projectVolume(id: string, fileSystem: HealthVolume["fileSystem"], smart: HealthVolume["smart"]): HealthVolume {
  let name = smart?.deviceName ?? "";
  if (fileSystem) {
    name = fileSystem.deviceName;
    if (smart && isSameStorageDevice(smart.deviceName, fileSystem.deviceName)) name = smart.deviceName;
  }
  const used = byteReading(fileSystem?.used);
  const free = byteReading(fileSystem?.available);
  let total = null;
  if (used !== null && free !== null && Number.isFinite(used + free) && used + free > 0) total = used + free;
  return {
    id,
    name,
    percent: percentageReading(fileSystem?.percentage),
    used,
    free,
    total,
    health: healthVerdict(smart),
    temperature: finiteReading(smart?.temperature),
    fileSystem,
    smart,
  };
}

/** A view of one observation; missing metrics and unsupported verdicts remain unknown. */
export function projectHealthSystem(system: HealthSystem, visibleStorageVolumes?: string[]): HealthSystemSnapshot {
  const health = system.health;
  const providerCapabilities = getSystemCapabilities(system.kind);
  const fileSystems = filterStorageVolumes(health?.fileSystem ?? [], visibleStorageVolumes, system.id);
  const smartDevices = filterStorageVolumes(health?.smart ?? [], visibleStorageVolumes, system.id);
  const matchedSmart = new Set<NonNullable<HealthVolume["smart"]>>();
  const volumes = fileSystems.map((fileSystem, index) => {
    const smart = smartDevices.find((device) => storageDeviceNamesMatch(device.deviceName, fileSystem.deviceName));
    if (smart) matchedSmart.add(smart);
    return projectVolume(`filesystem:${fileSystem.deviceName}:${index}`, fileSystem, smart);
  });
  for (const [index, smart] of smartDevices.entries()) {
    if (matchedSmart.has(smart)) continue;
    volumes.push(projectVolume(`smart:${smart.deviceName}:${index}`, undefined, smart));
  }
  let fullestVolume: HealthVolume | null = null;
  for (const volume of volumes) {
    if (volume.percent === null) continue;
    if (fullestVolume === null || volume.percent > (fullestVolume.percent ?? 0)) fullestVolume = volume;
  }
  const unhealthyDevices = smartDevices.filter((device) => device.healthy === false).length;
  let storageHealth: HealthVerdict = "unknown";
  if (unhealthyDevices > 0) storageHealth = "attention";
  else if (volumes.length > 0 && volumes.every((volume) => volume.health === "healthy")) storageHealth = "healthy";
  const cpuPercent = percentageReading(health?.cpuUtilization);
  const memory = memoryReading(health);
  let network: HealthSystemSnapshot["network"] = null;
  const up = nonNegativeReading(health?.network?.up);
  const down = nonNegativeReading(health?.network?.down);
  if (up !== null || down !== null) network = { up, down };
  const alerts: HealthAlert[] = [];
  if (providerCapabilities.reboot && health?.rebootRequired) alerts.push({ type: "reboot", count: 1 });
  const updates = nonNegativeReading(health?.availablePkgUpdates);
  if (providerCapabilities.updates && updates !== null && updates > 0) alerts.push({ type: "updates", count: updates });
  // Count reported devices, not namespace rows which may share one SMART controller.
  if (unhealthyDevices > 0) alerts.push({ type: "storage", count: unhealthyDevices });
  if (cpuPercent !== null && cpuPercent >= 90) alerts.push({ type: "cpu", count: 1 });
  if (memory && memory.percent >= 90) alerts.push({ type: "memory", count: 1 });
  return {
    system,
    capabilities: providerCapabilities,
    available: health !== null,
    cpuPercent,
    memory,
    temperature: finiteReading(health?.cpuTemp),
    network,
    volumes,
    fullestVolume,
    storageHealth,
    alerts,
  };
}

export function createHealthSample(time: number, health: SystemHealthMonitoring | null): HealthSample {
  const gpu: HealthSample["gpu"] = {};
  for (const device of health?.gpu ?? []) {
    gpu[device.gpuId] = {
      usage: finiteReading(device.processorUtilization),
      memory: finiteReading(device.memoryUtilization),
      temperature: finiteReading(device.temperature),
    };
  }
  const memory = memoryReading(health);
  return {
    time,
    cpu: percentageReading(health?.cpuUtilization),
    memory: memory?.used ?? null,
    networkUp: nonNegativeReading(health?.network?.up),
    networkDown: nonNegativeReading(health?.network?.down),
    temperature: finiteReading(health?.cpuTemp),
    gpu,
  };
}

/** Keep real observations only; cached responses do not create extra chart points. */
export function appendHealthSample(history: HealthSample[], sample: HealthSample): HealthSample[] {
  const previous = history.at(-1);
  if (previous && previous.time >= sample.time) return history;
  const cutoff = sample.time - 15 * 60_000;
  const retained = history.filter((point) => point.time >= cutoff).slice(-179);
  // Long gaps remain visible instead of being drawn as a continuous line.
  if (previous && sample.time - previous.time > 30_000) retained.push(createHealthSample(sample.time - 1, null));
  retained.push(sample);
  return retained;
}
