import type { ClusterHealthMonitoring, SystemHealthMonitoring } from "@homarr/integrations/types";

import type { HealthPreviewData, HealthSystemFixture, HealthSystemKind } from "./types";

export const HEALTH_FIXTURE_UPDATED_AT = 1762506000000;

const GIB = 1024 ** 3;
const TIB = 1024 ** 4;

export const fixtureKindLabels: Record<HealthSystemKind | "proxmox", string> = {
  openmediavault: "OpenMediaVault",
  dashDot: "Dash.",
  truenas: "TrueNAS",
  unraid: "Unraid",
  glances: "Glances",
  synology: "Synology",
  proxmox: "Proxmox",
  mock: "Mock",
};

export const healthPreviewScenarios = [
  { value: "normal", label: "All integrations" },
  { value: "healthy", label: "All systems healthy" },
  { value: "partial", label: "One unavailable" },
  { value: "crowded", label: "Crowded" },
  { value: "empty", label: "Empty" },
  { value: "loading", label: "Loading" },
  { value: "unavailable", label: "Unavailable" },
  { value: "smart-only", label: "SMART without a filesystem" },
  { value: "formatted-sizes", label: "Provider-formatted storage sizes" },
  { value: "missing", label: "Optional metrics absent" },
  { value: "invalid-sensors", label: "Invalid optional sensor" },
  { value: "stale", label: "Stale snapshot" },
  ...Object.entries(fixtureKindLabels).map(([value, label]) => ({ value, label })),
];

function health(overrides: Partial<SystemHealthMonitoring>): SystemHealthMonitoring {
  return {
    version: "Debian 13",
    cpuModelName: "Intel Core i5-12500",
    cpuUtilization: 24,
    memUsedInBytes: 6 * GIB,
    memAvailableInBytes: 10 * GIB,
    uptime: 26 * 86400 + 8 * 3600,
    network: null,
    loadAverage: null,
    rebootRequired: false,
    availablePkgUpdates: 0,
    cpuTemp: undefined,
    fileSystem: [],
    smart: [],
    gpu: [],
    ...overrides,
  };
}

function volume(deviceName: string, used: number, total: number): SystemHealthMonitoring["fileSystem"][number] {
  return { deviceName, used: String(used), available: String(total - used), percentage: (used / total) * 100 };
}

function fixture(kind: HealthSystemKind, name: string, data: SystemHealthMonitoring): HealthSystemFixture {
  return {
    id: `health-preview-${kind}`,
    kind,
    name,
    health: data,
    updatedAt: HEALTH_FIXTURE_UPDATED_AT,
  };
}

export function createHealthSystemFixtures(): HealthSystemFixture[] {
  return [
    fixture(
      "openmediavault",
      "Archive NAS",
      health({
        version: "OpenMediaVault 7.7.0",
        cpuUtilization: 38,
        cpuTemp: 49,
        loadAverage: { "1min": 0.68, "5min": 0.54, "15min": 0.42 },
        availablePkgUpdates: 12,
        rebootRequired: true,
        fileSystem: [volume("/dev/sda1", 28 * GIB, 120 * GIB), volume("/dev/sdb1", 7.36 * TIB, 8 * TIB)],
        smart: [
          { deviceName: "sda", temperature: 34, overallStatus: "GOOD", healthy: true },
          { deviceName: "sdb", temperature: 43, overallStatus: "GOOD", healthy: true },
        ],
      }),
    ),
    fixture(
      "dashDot",
      "Application host",
      health({
        version: "Ubuntu 24.04.3 LTS (6.8.0-71)",
        cpuModelName: "AMD Ryzen 7 5700G",
        cpuUtilization: 62,
        cpuTemp: 67,
        memUsedInBytes: 18 * GIB,
        memAvailableInBytes: 14 * GIB,
        network: { up: 512 * 1024, down: 6 * 1024 ** 2 },
        // Dash. computes CPU percentages over its private sample history.
        loadAverage: { "1min": 54, "5min": 47, "15min": 39 },
        fileSystem: [volume("Storage 1: (nvme0n1)", 340 * GIB, 1024 * GIB)],
        gpu: [
          {
            gpuId: "gpu-0",
            name: "AMD Radeon Graphics",
            memoryUtilization: 24,
            processorUtilization: 36,
            temperature: null,
            fanSpeed: null,
          },
        ],
      }),
    ),
    fixture(
      "truenas",
      "Storage cluster",
      health({
        version: "TrueNAS-SCALE-25.04.2.1",
        cpuModelName: "Intel Xeon E-2336",
        cpuUtilization: 18,
        cpuTemp: 52,
        memUsedInBytes: 22 * GIB,
        memAvailableInBytes: 42 * GIB,
        uptime: 103 * 86400 + 11 * 3600,
        network: { up: 28 * 1024 ** 2, down: 2 * 1024 ** 2 },
        fileSystem: [volume("tank", 9.6 * TIB, 20 * TIB), volume("backup", 6.4 * TIB, 8 * TIB)],
        // TrueNAS smart[] carries pool health and has no physical-disk temperature.
        smart: [
          { deviceName: "tank", temperature: null, overallStatus: "ONLINE", healthy: true },
          { deviceName: "backup", temperature: null, overallStatus: "DEGRADED", healthy: false },
        ],
      }),
    ),
    fixture(
      "unraid",
      "Media server",
      health({
        version: "Unraid 7.1.4",
        cpuModelName: "Intel Core i3-12100",
        cpuUtilization: 11,
        memUsedInBytes: 8 * GIB,
        memAvailableInBytes: 24 * GIB,
        fileSystem: [
          volume("disk1", 4.96 * TIB, 8 * TIB),
          volume("disk2", 6 * TIB, 8 * TIB),
          volume("cache", 800 * GIB, 1000 * GIB),
        ],
        smart: [
          { deviceName: "disk1", temperature: 36, overallStatus: "DISK_OK", healthy: true },
          { deviceName: "disk2", temperature: 38, overallStatus: "DISK_OK", healthy: true },
          { deviceName: "cache", temperature: 44, overallStatus: "DISK_OK", healthy: true },
          { deviceName: "parity", temperature: 37, overallStatus: "DISK_OK", healthy: true },
        ],
      }),
    ),
    fixture(
      "glances",
      "Inference workstation",
      health({
        version: "Glances 4.3.0",
        cpuModelName: "AMD Ryzen 9 7950X",
        cpuUtilization: 82,
        cpuTemp: 88,
        memUsedInBytes: 30 * GIB,
        memAvailableInBytes: 2 * GIB,
        network: { up: 1.2 * 1024 ** 2, down: 18 * 1024 ** 2 },
        fileSystem: [
          volume("/dev/nvme0n1p2", 1.7 * TIB, 2 * TIB),
          volume("/dev/nvme0n2p1", 200 * GIB, 1024 * GIB),
          volume("/dev/sda1", 1.6 * TIB, 4 * TIB),
        ],
        smart: [
          {
            deviceName: "/dev/nvme0",
            temperature: 64,
            overallStatus: "FAILED",
            healthy: false,
            statusReason: { type: "criticalWarning" },
          },
          {
            deviceName: "/dev/sda",
            temperature: 39,
            overallStatus: "PASSED",
            healthy: true,
            statusReason: { type: "attributesWithinThresholds" },
          },
        ],
        gpu: [
          {
            gpuId: "0",
            name: "NVIDIA GeForce RTX 4090",
            memoryUtilization: 89,
            processorUtilization: 96,
            temperature: 78,
            fanSpeed: 1650,
          },
          {
            gpuId: "1",
            name: "NVIDIA GeForce RTX 3090",
            memoryUtilization: 52,
            processorUtilization: 0,
            temperature: null,
            fanSpeed: 0,
          },
        ],
      }),
    ),
    fixture(
      "synology",
      "Backup DiskStation",
      health({
        version: "DSM 7.2.2-72806",
        cpuModelName: "DS923+",
        cpuUtilization: 14,
        cpuTemp: 42,
        memUsedInBytes: 3 * GIB,
        memAvailableInBytes: 5 * GIB,
        network: { up: 0, down: 256 * 1024 },
        loadAverage: { "1min": 0.6, "5min": 0.4, "15min": 0.3 },
        availablePkgUpdates: 1,
        fileSystem: [volume("volume_1", 3.6 * TIB, 12 * TIB), volume("volume_2", 0, 2 * TIB)],
        smart: [
          { deviceName: "volume_1", temperature: 35, overallStatus: "normal", healthy: true },
          { deviceName: "volume_2", temperature: null, overallStatus: "normal", healthy: true },
        ],
      }),
    ),
    fixture(
      "mock",
      "Development server",
      health({
        version: "Fixture 1.0.0",
        cpuModelName: "Mock CPU",
        cpuUtilization: 0,
        memUsedInBytes: 0,
        memAvailableInBytes: 8 * GIB,
        network: { up: 0, down: 0 },
        cpuTemp: 32,
        loadAverage: { "1min": 0, "5min": 0, "15min": 0 },
        fileSystem: [{ deviceName: "Legacy formatted sizes", used: "1 GB", available: "500 MB", percentage: 66.7 }],
      }),
    ),
  ];
}

export function createHealthClusterFixture(): ClusterHealthMonitoring {
  const compute = (index: number, isRunning: boolean) => {
    let utilization = 0;
    let usedMemory = 0;
    let uptime = 0;
    if (isRunning) {
      utilization = 0.21 + index * 0.07;
      usedMemory = (12 + index * 3) * GIB;
      uptime = (32 + index) * 86400;
    }
    return {
      cpu: { utilization, cores: 16 }, // Proxmox CPU uses a 0..1 ratio.
      memory: { used: usedMemory, total: 64 * GIB },
      storage: { used: 180 * GIB, total: 1024 * GIB, read: null, write: null },
      network: { in: null, out: null },
      uptime,
      haState: null,
    };
  };

  return {
    nodes: [
      {
        id: "node/pve-01",
        name: "pve-01",
        node: "pve-01",
        type: "node",
        isRunning: true,
        status: "online",
        ...compute(0, true),
      },
      {
        id: "node/pve-02",
        name: "pve-02",
        node: "pve-02",
        type: "node",
        isRunning: true,
        status: "online",
        ...compute(1, true),
      },
      {
        id: "node/pve-03",
        name: "pve-03",
        node: "pve-03",
        type: "node",
        isRunning: false,
        status: "offline",
        ...compute(2, false),
      },
    ],
    vms: [
      {
        id: "qemu/100",
        vmId: 100,
        name: "home-assistant",
        node: "pve-01",
        type: "qemu",
        isRunning: true,
        status: "running",
        ...compute(0, true),
        haState: "started",
      },
      {
        id: "qemu/101",
        vmId: 101,
        name: "windows-workstation",
        node: "pve-02",
        type: "qemu",
        isRunning: false,
        status: "stopped",
        ...compute(1, false),
      },
      {
        id: "qemu/102",
        vmId: 102,
        name: "development-with-a-long-resource-name",
        node: "pve-02",
        type: "qemu",
        isRunning: true,
        status: "running",
        ...compute(2, true),
      },
    ],
    lxcs: [
      {
        id: "lxc/200",
        vmId: 200,
        name: "reverse-proxy",
        node: "pve-01",
        type: "lxc",
        isRunning: true,
        status: "running",
        ...compute(0, true),
      },
      {
        id: "lxc/201",
        vmId: 201,
        name: "monitoring",
        node: "pve-02",
        type: "lxc",
        isRunning: true,
        status: "running",
        ...compute(1, true),
      },
    ],
    storages: [
      {
        id: "storage/pve-01/local-lvm",
        name: "local-lvm",
        node: "pve-01",
        type: "storage",
        isRunning: true,
        status: "available",
        storagePlugin: "lvmthin",
        isShared: false,
        used: 720 * GIB,
        total: 1024 * GIB,
      },
      {
        id: "storage/pve-02/backup-nfs",
        name: "backup-nfs",
        node: "pve-02",
        type: "storage",
        isRunning: true,
        status: "available",
        storagePlugin: "nfs",
        isShared: true,
        used: 7.5 * TIB,
        total: 8 * TIB,
      },
      {
        id: "storage/pve-03/local-lvm",
        name: "local-lvm",
        node: "pve-03",
        type: "storage",
        isRunning: false,
        status: "offline",
        storagePlugin: "lvmthin",
        isShared: false,
        used: 0,
        total: 0,
      },
    ],
  };
}

export function getHealthPreviewData(scenario: string): HealthPreviewData {
  const systems = createHealthSystemFixtures();
  const cluster = createHealthClusterFixture();

  if (scenario === "empty") return { systems: [], cluster: null };
  if (scenario === "loading") return { systems: [], cluster: null, loading: true };
  if (scenario === "proxmox") return { systems: [], cluster };

  if (scenario === "healthy") {
    return {
      systems: systems.map((system) => {
        if (!system.health) return system;
        const totalMemory = system.health.memUsedInBytes + system.health.memAvailableInBytes;
        return {
          ...system,
          health: {
            ...system.health,
            cpuUtilization: 18,
            memUsedInBytes: totalMemory * 0.3,
            memAvailableInBytes: totalMemory * 0.7,
            rebootRequired: false,
            availablePkgUpdates: 0,
            smart: system.health.smart.map((device) => ({
              ...device,
              healthy: true,
              overallStatus: "OK",
              statusReason: undefined,
            })),
          },
        };
      }),
      cluster,
    };
  }
  if (scenario === "unavailable") {
    return { systems: systems.map(unavailable), cluster: null };
  }
  if (scenario === "partial") {
    return {
      systems: systems.map((system) => {
        if (system.kind === "dashDot") return unavailable(system);
        return system;
      }),
      cluster,
    };
  }
  if (scenario === "stale") {
    const staleOffset = 30 * 60_000;
    return {
      systems: systems.map((system) => ({
        ...system,
        updatedAt: HEALTH_FIXTURE_UPDATED_AT - staleOffset,
      })),
      cluster,
    };
  }
  if (scenario === "crowded") {
    const crowdedSystems = Array.from({ length: 3 }, (_, group) =>
      systems.map((system) => ({
        ...system,
        id: `${system.id}-${group}`,
        name: `${system.name} · Rack ${group + 1}`,
      })),
    ).flat();
    const crowdedCluster = {
      ...cluster,
      vms: Array.from({ length: 8 }, (_, group) =>
        cluster.vms.map((vm) => ({
          ...vm,
          id: `${vm.id}-${group}`,
          vmId: vm.vmId + group * 10,
          name: `${vm.name}-${group + 1}`,
        })),
      ).flat(),
    };
    return { systems: crowdedSystems, cluster: crowdedCluster };
  }
  if (scenario === "formatted-sizes") {
    const system = systems.find((entry) => entry.kind === "openmediavault");
    if (system?.health) {
      system.health.fileSystem = system.health.fileSystem
        .slice(0, 1)
        .map((fileSystem) => ({ ...fileSystem, used: "28 GiB", available: "92 GiB" }));
      return { systems: [system], cluster: null };
    }
  }
  if (scenario === "smart-only") {
    const unraid = systems.find((system) => system.kind === "unraid");
    if (unraid?.health) {
      unraid.health.fileSystem = [];
      unraid.health.smart.push({ deviceName: "disk3", temperature: 51, overallStatus: "DISK_DSBL", healthy: false });
      return { systems: [unraid], cluster: null };
    }
  }
  if (scenario === "missing") {
    const glances = fixture(
      "glances",
      "Minimal Glances host",
      health({
        version: "Glances 4.3.0",
        cpuModelName: "Unknown",
        cpuUtilization: 0,
        memUsedInBytes: 0,
        memAvailableInBytes: 0,
        uptime: 0,
      }),
    );
    return { systems: [glances], cluster: null };
  }
  if (scenario === "invalid-sensors") {
    const truenas = systems.find((system) => system.kind === "truenas");
    if (truenas?.health) {
      // Empty TrueNAS temperature reporting currently maps through Math.max(...[]).
      // Optional invalid telemetry must not make the healthy metrics disappear.
      truenas.health.cpuTemp = Number.NEGATIVE_INFINITY;
      return { systems: [truenas], cluster: null };
    }
  }

  const selected = systems.find((system) => system.kind === scenario);
  if (selected) return { systems: [selected], cluster: null };

  return { systems, cluster };
}

function unavailable(system: HealthSystemFixture): HealthSystemFixture {
  return {
    ...system,
    health: null,
    error: "This integration could not be reached. Check its connection and permissions.",
    updatedAt: HEALTH_FIXTURE_UPDATED_AT - 120_000,
  };
}
