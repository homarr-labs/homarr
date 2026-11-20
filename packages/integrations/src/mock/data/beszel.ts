import type {
  BeszelAlert,
  BeszelAlertHistory,
  BeszelContainerStats,
  BeszelContainerStatsRecord,
  BeszelSystem,
  BeszelSystemDetails,
  BeszelSystemStats,
  BeszelSystemStatsRecord,
  LiveStatsEvent,
} from "../../beszel/beszel-types";

const KIBIBYTE = 1024;
const MEBIBYTE = 1024 * KIBIBYTE;
const GIBIBYTE = 1024 * MEBIBYTE;
const DAY_MS = 24 * 60 * 60 * 1000;
const TORRENT_RECEIVE_BYTES = 48_100_000;
const USENET_RECEIVE_BYTES = 73_000_000;
const DOWNLOAD_SEND_BYTES = 9_340_000;
// Only playing sessions contribute: 8 + 24 + 4 + 0.95 Mbit/s.
const MEDIA_SEND_BYTES = 36_950_000 / 8;
const DOWNLOAD_RECEIVE_BYTES = TORRENT_RECEIVE_BYTES + USENET_RECEIVE_BYTES;

interface MockFilesystem {
  path: string;
  capacityGiB: number;
  usage: number;
}

interface MockSystemDef {
  name: string;
  host: string;
  os: string;
  cpu: string;
  cores: number;
  threads: number;
  mem: number;
  arch: string;
  baseCpu: number;
  baseMem: number;
  baseDisk: number;
  diskGiB: number;
  networkMiB: [number, number];
  diskIoMiB: [number, number];
  networkVariation?: number;
  diskIoVariation?: number;
  filesystems: MockFilesystem[];
  containers: number[];
  phase: number;
  uptimeDays: number;
  gpu?: string;
}

const mockSystems: MockSystemDef[] = [
  {
    name: "services",
    host: "192.168.1.10",
    os: "Ubuntu 24.04",
    cpu: "AMD Ryzen 5 5600G",
    cores: 6,
    threads: 12,
    mem: 32 * GIBIBYTE,
    arch: "amd64",
    baseCpu: 21,
    baseMem: 41,
    baseDisk: 42,
    diskGiB: 512,
    networkMiB: [0.9, 1.2],
    diskIoMiB: [2.4, 1.1],
    filesystems: [{ path: "/mnt/appdata", capacityGiB: 1024, usage: 34 }],
    containers: [0, 1, 2, 3, 5, 7],
    phase: 1,
    uptimeDays: 21,
  },
  {
    name: "nas-01",
    host: "192.168.1.20",
    os: "Debian 12",
    cpu: "Intel Xeon E-2388G",
    cores: 8,
    threads: 16,
    mem: 32 * GIBIBYTE,
    arch: "amd64",
    baseCpu: 12,
    baseMem: 58,
    baseDisk: 38,
    diskGiB: 256,
    networkMiB: [12, 3],
    diskIoMiB: [24, 8],
    filesystems: [
      { path: "/mnt/media", capacityGiB: 8192, usage: 68 },
      { path: "/mnt/backups", capacityGiB: 4096, usage: 61 },
    ],
    containers: [6, 11, 12],
    phase: 2,
    uptimeDays: 34,
  },
  {
    name: "test-node",
    host: "192.168.1.30",
    os: "Raspberry Pi OS",
    cpu: "ARM Cortex-A76",
    cores: 4,
    threads: 4,
    mem: 8 * GIBIBYTE,
    arch: "aarch64",
    baseCpu: 5,
    baseMem: 24,
    baseDisk: 35,
    diskGiB: 128,
    networkMiB: [0.04, 0.06],
    diskIoMiB: [0.2, 0.1],
    filesystems: [],
    containers: [0, 2],
    phase: 3,
    uptimeDays: 5,
  },
  {
    name: "media-server",
    host: "192.168.1.40",
    os: "Debian 12",
    cpu: "Intel Core i5-12500",
    cores: 6,
    threads: 12,
    mem: 32 * GIBIBYTE,
    arch: "amd64",
    baseCpu: 26,
    baseMem: 44,
    baseDisk: 34,
    diskGiB: 512,
    networkMiB: [
      ((DOWNLOAD_SEND_BYTES + MEDIA_SEND_BYTES) * 1.04) / MEBIBYTE,
      (DOWNLOAD_RECEIVE_BYTES * 1.025) / MEBIBYTE,
    ],
    diskIoMiB: [18, (DOWNLOAD_RECEIVE_BYTES * 1.08) / MEBIBYTE],
    networkVariation: 0.01,
    diskIoVariation: 0.02,
    filesystems: [
      { path: "/mnt/media", capacityGiB: 8192, usage: 68 },
      { path: "/mnt/downloads", capacityGiB: 1024, usage: 27 },
    ],
    containers: [4, 8, 9, 10, 5, 13],
    phase: 4,
    uptimeDays: 14,
    gpu: "Intel UHD Graphics 770",
  },
  {
    name: "backup-node",
    host: "192.168.1.50",
    os: "TrueNAS SCALE",
    cpu: "Intel Xeon E5-2680",
    cores: 8,
    threads: 16,
    mem: 48 * GIBIBYTE,
    arch: "amd64",
    baseCpu: 8,
    baseMem: 30,
    baseDisk: 28,
    diskGiB: 256,
    networkMiB: [0.2, 2],
    diskIoMiB: [1, 8],
    filesystems: [{ path: "/mnt/archive", capacityGiB: 8192, usage: 61 }],
    containers: [6],
    phase: 5,
    uptimeDays: 7,
  },
];

interface MockContainerProfile {
  name: string;
  cpuBase: number;
  memMiB: number;
  sendMiB: number;
  recvMiB: number;
  networkVariation?: number;
}

const containerProfiles: MockContainerProfile[] = [
  { name: "homarr", cpuBase: 2, memMiB: 240, sendMiB: 0.12, recvMiB: 0.04 },
  { name: "postgres", cpuBase: 4, memMiB: 512, sendMiB: 0.08, recvMiB: 0.06 },
  { name: "redis", cpuBase: 1, memMiB: 128, sendMiB: 0.04, recvMiB: 0.03 },
  { name: "home-assistant", cpuBase: 6, memMiB: 640, sendMiB: 0.03, recvMiB: 0.02 },
  {
    name: "jellyfin",
    cpuBase: 10,
    memMiB: 1024,
    sendMiB: MEDIA_SEND_BYTES / MEBIBYTE,
    recvMiB: 0.2,
    networkVariation: 0.01,
  },
  { name: "traefik", cpuBase: 1.5, memMiB: 96, sendMiB: 0.4, recvMiB: 0.3 },
  { name: "restic", cpuBase: 0.4, memMiB: 96, sendMiB: 0.1, recvMiB: 0.3 },
  { name: "mosquitto", cpuBase: 0.5, memMiB: 32, sendMiB: 0.01, recvMiB: 0.01 },
  {
    name: "qbittorrent",
    cpuBase: 4,
    memMiB: 384,
    sendMiB: DOWNLOAD_SEND_BYTES / MEBIBYTE,
    recvMiB: TORRENT_RECEIVE_BYTES / MEBIBYTE,
    networkVariation: 0.01,
  },
  { name: "sonarr", cpuBase: 1.2, memMiB: 256, sendMiB: 0.01, recvMiB: 0.02 },
  { name: "radarr", cpuBase: 1.2, memMiB: 256, sendMiB: 0.01, recvMiB: 0.02 },
  { name: "minio", cpuBase: 2, memMiB: 512, sendMiB: 0.8, recvMiB: 0.6 },
  { name: "syncthing", cpuBase: 2, memMiB: 256, sendMiB: 1.2, recvMiB: 0.7 },
  {
    name: "sabnzbd",
    cpuBase: 2,
    memMiB: 320,
    sendMiB: 0.02,
    recvMiB: USENET_RECEIVE_BYTES / MEBIBYTE,
    networkVariation: 0.01,
  },
];

const typeToMinutes: Record<string, number> = { "1m": 1, "10m": 10, "20m": 20, "120m": 120, "480m": 480 };
const statusByIndex: Record<number, "up" | "paused" | "down"> = { 2: "paused", 4: "down" };
const sampleTime = () => Math.floor(Date.now() / 1000) * 1000;
const rounded = (value: number) => Math.round(value * 100) / 100;

// Sampling by timestamp keeps overlapping histories, summaries and live streams consistent.
const wave = (time: number, periodMinutes: number, phase: number) =>
  Math.sin(time / (periodMinutes * 60_000) + phase) * 0.75 +
  Math.sin(time / (periodMinutes * 18_600) + phase * 1.7) * 0.25;

function resolveSystem(systemId: string): MockSystemDef {
  const index = Number(systemId.replace("mock-sys-", "")) - 1;
  const fallback = mockSystems[0];
  if (!fallback) throw new Error("Mock systems are not configured");
  return mockSystems[index] ?? fallback;
}

function systemSample(sys: MockSystemDef, time: number): BeszelSystemStats {
  const load = sys.baseCpu + wave(time, 13, sys.phase) * 7;
  const offsets = Array.from({ length: sys.threads }, (_, index) => Math.sin(index * 1.4 + sys.phase) * 5);
  const meanOffset = offsets.reduce((total, value) => total + value, 0) / offsets.length;
  const cpub = offsets.map((offset) => rounded(Math.max(0, load + offset - meanOffset)));
  const cpu = rounded(cpub.reduce((total, value) => total + value, 0) / cpub.length);
  const memoryGiB = sys.mem / GIBIBYTE;
  const mp = rounded(sys.baseMem + wave(time, 47, sys.phase + 1) * 2);
  const networkVariation = sys.networkVariation ?? 0.18;
  const diskIoVariation = sys.diskIoVariation ?? 0.22;
  const publicSend = rounded(sys.networkMiB[0] * (1 + wave(time, 7, sys.phase) * networkVariation));
  const publicRecv = rounded(sys.networkMiB[1] * (1 + wave(time, 9, sys.phase + 1) * networkVariation));
  const diskRead = rounded(sys.diskIoMiB[0] * (1 + wave(time, 5, sys.phase) * diskIoVariation));
  const diskWrite = rounded(sys.diskIoMiB[1] * (1 + wave(time, 8, sys.phase + 2) * diskIoVariation));
  const temperature = rounded(36 + cpu * 0.38);
  const stats: BeszelSystemStats = {
    cpu,
    cpum: rounded(cpu + 6),
    cpub,
    cpus: cpub.map((busy) => Math.round(1600 + busy * 45)),
    la: [
      rounded((cpu * sys.cores) / 100),
      rounded((sys.baseCpu * sys.cores) / 100),
      rounded((sys.baseCpu * sys.cores * 0.9) / 100),
    ],
    m: memoryGiB,
    mu: (memoryGiB * mp) / 100,
    mp,
    mb: memoryGiB * 0.12,
    s: 4,
    su: 0.04,
    d: sys.diskGiB,
    du: (sys.diskGiB * sys.baseDisk) / 100,
    dp: sys.baseDisk,
    dr: diskRead,
    dw: diskWrite,
    dio: [diskRead * MEBIBYTE, diskWrite * MEBIBYTE],
    ns: rounded(publicSend + 0.08),
    nr: rounded(publicRecv + 0.12),
    b: [publicSend * MEBIBYTE, publicRecv * MEBIBYTE],
    ni: {
      eth0: [
        publicRecv * MEBIBYTE,
        publicSend * MEBIBYTE,
        sys.networkMiB[1] * 1.2 * MEBIBYTE,
        sys.networkMiB[0] * 1.2 * MEBIBYTE,
      ],
    },
    t: { cpu: temperature, nvme: rounded(32 + cpu * 0.15) },
    efs: Object.fromEntries(
      sys.filesystems.map((filesystem) => [
        filesystem.path,
        {
          d: filesystem.capacityGiB,
          du: (filesystem.capacityGiB * filesystem.usage) / 100,
          r: diskRead,
          w: diskWrite,
          rb: diskRead * MEBIBYTE,
          wb: diskWrite * MEBIBYTE,
        },
      ]),
    ),
  };
  if (sys.gpu) {
    stats.g = {
      "intel-0": {
        n: sys.gpu,
        mu: 384,
        mt: 2048,
        u: rounded(18 + wave(time, 11, sys.phase) * 4),
        p: 9,
        pp: 15,
        e: { video: rounded(26 + wave(time, 11, sys.phase) * 5) },
      },
    };
  }
  return stats;
}

function containerSample(sys: MockSystemDef, time: number): BeszelContainerStats[] {
  return sys.containers.flatMap((profileIndex) => {
    const profile = containerProfiles[profileIndex];
    if (!profile) return [];
    const activity = 1 + wave(time, 9, sys.phase + profileIndex) * 0.15;
    const traffic = 1 + wave(time, 9, sys.phase + profileIndex) * (profile.networkVariation ?? 0.15);
    const send = rounded(profile.sendMiB * traffic);
    const recv = rounded(profile.recvMiB * traffic);
    return [
      {
        n: profile.name,
        c: rounded(profile.cpuBase * activity),
        m: rounded(profile.memMiB * (1 + wave(time, 37, profileIndex) * 0.04)),
        ns: send,
        nr: recv,
        b: [send * MEBIBYTE, recv * MEBIBYTE] as [number, number],
      },
    ];
  });
}

function buildTimeSeries<T>(
  systemId: string,
  count: number,
  intervalMinutes: number,
  type: string,
  sample: (time: number) => T,
) {
  const end = sampleTime();
  return Array.from({ length: count }, (_, index) => {
    const time = end - index * intervalMinutes * 60_000;
    const timestamp = new Date(time).toISOString();
    return {
      id: `mock-stat-${systemId}-${type}-${time}`,
      system: systemId,
      type,
      created: timestamp,
      updated: timestamp,
      stats: sample(time),
    };
  });
}

export class BeszelMockService {
  public async getSystemsAsync(): Promise<BeszelSystem[]> {
    const now = sampleTime();
    return mockSystems.map((sys, index) => {
      const stats = systemSample(sys, now);
      return {
        id: `mock-sys-${index + 1}`,
        name: sys.name,
        host: sys.host,
        port: "45876",
        status: statusByIndex[index] ?? "up",
        info: {
          h: sys.name,
          cpu: stats.cpu,
          c: sys.cores,
          ct: sys.threads,
          m: sys.cpu,
          la: stats.la,
          o: sys.os,
          u: Math.floor((now % DAY_MS) / 1000) + sys.uptimeDays * 86400,
          mp: stats.mp,
          dp: stats.dp,
          efs: Object.fromEntries(sys.filesystems.map((filesystem) => [filesystem.path, filesystem.usage])),
          bb: (stats.b?.[0] ?? 0) + (stats.b?.[1] ?? 0),
          v: "0.8.2",
          g: Object.values(stats.g ?? {}).reduce((total, gpu) => total + gpu.u, 0),
          t: stats.t?.cpu,
          dt: stats.t?.nvme,
          sv: [18 + sys.containers.length, 20 + sys.containers.length] as [number, number],
        },
        users: [],
        created: new Date(now - 45 * DAY_MS).toISOString(),
        updated: new Date(now).toISOString(),
      };
    });
  }

  public async getSystemDetailsAsync(systemId: string): Promise<BeszelSystemDetails> {
    const sys = resolveSystem(systemId);
    return {
      id: systemId,
      system: systemId,
      hostname: sys.name,
      kernel: "6.8.0-40-generic",
      cores: sys.cores,
      threads: sys.threads,
      cpu: sys.cpu,
      os: 1,
      os_name: sys.os,
      arch: sys.arch,
      memory: sys.mem,
      podman: false,
      updated: new Date(sampleTime()).toISOString(),
    };
  }

  public async getSystemStatsAsync(
    systemId: string,
    type: string,
    perPage: number,
  ): Promise<BeszelSystemStatsRecord[]> {
    const sys = resolveSystem(systemId);
    return buildTimeSeries(systemId, perPage, typeToMinutes[type] ?? 1, type, (time) => systemSample(sys, time));
  }

  public async getContainerStatsAsync(
    systemId: string,
    type: string,
    perPage: number,
  ): Promise<BeszelContainerStatsRecord[]> {
    const sys = resolveSystem(systemId);
    return buildTimeSeries(systemId, perPage, typeToMinutes[type] ?? 1, type, (time) => containerSample(sys, time));
  }

  public async getAlertsAsync(): Promise<BeszelAlert[]> {
    return [
      { id: "mock-alert-1", user: "mock-user", system: "mock-sys-1", name: "CPU", triggered: false, value: 90, min: 5 },
      {
        id: "mock-alert-2",
        user: "mock-user",
        system: "mock-sys-2",
        name: "Memory",
        triggered: false,
        value: 80,
        min: 10,
      },
      {
        id: "mock-alert-3",
        user: "mock-user",
        system: "mock-sys-1",
        name: "Disk",
        triggered: false,
        value: 85,
        min: 15,
      },
      {
        id: "mock-alert-4",
        user: "mock-user",
        system: "mock-sys-4",
        name: "Temperature",
        triggered: false,
        value: 75,
        min: 3,
      },
    ];
  }

  public async subscribeRealtimeMetrics(
    systemId: string,
    onMessage: (event: LiveStatsEvent) => void,
    signal: AbortSignal,
  ): Promise<void> {
    if (signal.aborted) return;
    const sys = resolveSystem(systemId);
    const emit = () => {
      if (signal.aborted) return;
      const time = sampleTime();
      const timestamp = new Date(time).toISOString();
      const common = { system: systemId, type: "1m", created: timestamp, updated: timestamp };
      onMessage({
        type: "system_stats",
        record: { ...common, id: `mock-rt-${systemId}-${time}`, stats: systemSample(sys, time) },
      });
      onMessage({
        type: "container_stats",
        record: { ...common, id: `mock-container-rt-${systemId}-${time}`, stats: containerSample(sys, time) },
      });
    };
    await new Promise<void>((resolve) => {
      const interval = setInterval(emit, 1000);
      const stop = () => {
        clearInterval(interval);
        resolve();
      };
      signal.addEventListener("abort", stop, { once: true });
      if (signal.aborted) stop();
      else emit();
    });
  }

  public async getAlertHistoryAsync(_systemId?: string, _perPage = 10): Promise<BeszelAlertHistory[]> {
    return [];
  }
}
