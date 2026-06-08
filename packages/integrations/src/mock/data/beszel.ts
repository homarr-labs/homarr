import type {
  BeszelAlert,
  BeszelAlertHistory,
  BeszelContainerStats,
  BeszelContainerStatsRecord,
  BeszelSystem,
  BeszelSystemDetails,
  BeszelSystemStats,
  BeszelSystemStatsRecord,
} from "../../beszel/beszel-types";

const mockSystems: { name: string; host: string; os: string; cpu: string; cores: number; mem: number }[] = [
  {
    name: "web-server",
    host: "192.168.1.10",
    os: "Ubuntu 24.04",
    cpu: "AMD Ryzen 9 7950X",
    cores: 16,
    mem: 64 * 1024 * 1024 * 1024,
  },
  {
    name: "nas-01",
    host: "192.168.1.20",
    os: "Debian 12",
    cpu: "Intel Xeon E-2388G",
    cores: 8,
    mem: 32 * 1024 * 1024 * 1024,
  },
  {
    name: "pi-cluster-1",
    host: "192.168.1.30",
    os: "Raspberry Pi OS",
    cpu: "ARM Cortex-A76",
    cores: 4,
    mem: 8 * 1024 * 1024 * 1024,
  },
  {
    name: "media-server",
    host: "192.168.1.40",
    os: "Proxmox VE 8.2",
    cpu: "Intel i7-13700K",
    cores: 16,
    mem: 128 * 1024 * 1024 * 1024,
  },
  {
    name: "backup-node",
    host: "192.168.1.50",
    os: "TrueNAS SCALE",
    cpu: "Intel Xeon E5-2680",
    cores: 12,
    mem: 48 * 1024 * 1024 * 1024,
  },
];

const containerNames = ["nginx", "postgres", "redis", "grafana", "prometheus", "traefik", "minio", "gitea"];

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max));

const BYTES_GB = 1024 * 1024 * 1024;
const BYTES_MB = 1024 * 1024;

function generateSystemStats(baseLoad: number): BeszelSystemStats {
  const cpuJitter = rand(-5, 5);
  const memTotal = rand(8, 128) * BYTES_GB;
  const memUsed = memTotal * rand(0.3, 0.85);
  const diskTotal = rand(200, 2000) * BYTES_GB;
  const diskUsed = diskTotal * rand(0.2, 0.7);

  return {
    cpu: Math.max(0, Math.min(100, baseLoad + cpuJitter)),
    la: [rand(0.1, 4), rand(0.1, 3), rand(0.1, 2)],
    m: memTotal,
    mu: memUsed,
    mp: (memUsed / memTotal) * 100,
    mb: rand(0.5, 4) * BYTES_GB,
    s: 4 * BYTES_GB,
    su: rand(0, 2) * BYTES_GB,
    d: diskTotal,
    du: diskUsed,
    dp: (diskUsed / diskTotal) * 100,
    dr: rand(0, 50) * BYTES_MB,
    dw: rand(0, 30) * BYTES_MB,
    ns: rand(100, 5000) * 1024,
    nr: rand(100, 8000) * 1024,
    b: [rand(50, 3000) * 1024, rand(100, 5000) * 1024],
  };
}

function generateContainerStats(names: string[]): BeszelContainerStats[] {
  return names.map((n) => ({
    n,
    c: rand(0, 25),
    m: rand(50, 500) * BYTES_MB,
    b: [rand(0, 500) * 1024, rand(0, 800) * 1024],
  }));
}

function generateTimeSeries<T>(
  count: number,
  intervalMinutes: number,
  generator: () => T,
): (T & { id: string; system: string; type: string; created: string; updated: string })[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    id: `mock-stat-${i}`,
    system: "mock-sys-1",
    type: `${intervalMinutes}m`,
    created: new Date(now - (count - i) * intervalMinutes * 60_000).toISOString(),
    updated: new Date(now - (count - i) * intervalMinutes * 60_000).toISOString(),
    ...generator(),
  }));
}

export class BeszelMockService {
  public async getSystemsAsync(): Promise<BeszelSystem[]> {
    return mockSystems.map((sys, i) => ({
      id: `mock-sys-${i + 1}`,
      name: sys.name,
      host: sys.host,
      port: "45876",
      status: i === 2 ? ("paused" as const) : ("up" as const),
      info: {
        h: sys.name,
        cpu: rand(5, 85),
        c: sys.cores,
        ct: sys.cores * 2,
        m: sys.cpu,
        la: [rand(0.1, 4), rand(0.1, 3), rand(0.1, 2)] as [number, number, number],
        o: sys.os,
        u: randInt(3600, 2_000_000),
        mp: rand(20, 85),
        dp: rand(15, 70),
        bb: rand(100, 5000) * 1024,
        v: "0.8.2",
        g: i === 3 ? rand(10, 60) : 0,
        dt: rand(30, 65),
        sv: [randInt(5, 30), randInt(30, 50)] as [number, number],
      },
      users: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }));
  }

  public async getSystemDetailsAsync(systemId: string): Promise<BeszelSystemDetails> {
    const idx = Number(systemId.replace("mock-sys-", "")) - 1;
    const sys = mockSystems[idx] ?? mockSystems[0]!;
    return {
      id: systemId,
      system: systemId,
      hostname: sys.name,
      kernel: "6.8.0-40-generic",
      cores: sys.cores,
      threads: sys.cores * 2,
      cpu: sys.cpu,
      os: 1,
      os_name: sys.os,
      arch: "amd64",
      memory: sys.mem,
      podman: false,
      updated: new Date().toISOString(),
    };
  }

  public async getSystemStatsAsync(
    _systemId: string,
    _type: string,
    perPage: number,
  ): Promise<BeszelSystemStatsRecord[]> {
    const baseLoad = rand(10, 60);
    return generateTimeSeries(perPage, 1, () => ({ stats: generateSystemStats(baseLoad) }));
  }

  public async getContainerStatsAsync(
    _systemId: string,
    _type: string,
    perPage: number,
  ): Promise<BeszelContainerStatsRecord[]> {
    const names = containerNames.slice(0, randInt(3, containerNames.length));
    return generateTimeSeries(perPage, 1, () => ({ stats: generateContainerStats(names) }));
  }

  public async getAlertsAsync(): Promise<BeszelAlert[]> {
    return [
      { id: "mock-alert-1", user: "mock-user", system: "mock-sys-1", name: "CPU", triggered: true, value: 90, min: 5 },
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
        triggered: true,
        value: 75,
        min: 3,
      },
    ];
  }

  public async getAlertHistoryAsync(_systemId?: string, perPage = 10): Promise<BeszelAlertHistory[]> {
    const now = Date.now();
    return Array.from({ length: Math.min(perPage, 5) }, (_, i) => ({
      id: `mock-history-${i}`,
      alert: `mock-alert-${(i % 4) + 1}`,
      user: "mock-user",
      system: `mock-sys-${(i % 5) + 1}`,
      name: ["CPU", "Memory", "Disk", "Temperature", "Bandwidth"][i % 5]!,
      val: rand(60, 95),
      created: new Date(now - (i + 1) * 3_600_000).toISOString(),
      resolved: i % 2 === 0 ? new Date(now - i * 1_800_000).toISOString() : null,
    }));
  }
}
