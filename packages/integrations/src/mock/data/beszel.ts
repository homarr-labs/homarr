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

const GB = 1024 * 1024 * 1024;
const KB = 1024;

interface MockSystemDef {
  name: string;
  host: string;
  os: string;
  cpu: string;
  cores: number;
  mem: number;
  arch: string;
  baseCpu: number;
  baseMem: number;
  baseDisk: number;
  containers: number[];
}

const mockSystems: MockSystemDef[] = [
  {
    name: "web-server",
    host: "192.168.1.10",
    os: "Ubuntu 24.04",
    cpu: "AMD Ryzen 9 7950X",
    cores: 16,
    mem: 64 * GB,
    arch: "amd64",
    baseCpu: 35,
    baseMem: 55,
    baseDisk: 42,
    containers: [0, 1, 2, 3, 5],
  },
  {
    name: "nas-01",
    host: "192.168.1.20",
    os: "Debian 12",
    cpu: "Intel Xeon E-2388G",
    cores: 8,
    mem: 32 * GB,
    arch: "amd64",
    baseCpu: 12,
    baseMem: 70,
    baseDisk: 68,
    containers: [1, 2, 6],
  },
  {
    name: "pi-cluster-1",
    host: "192.168.1.30",
    os: "Raspberry Pi OS",
    cpu: "ARM Cortex-A76",
    cores: 4,
    mem: 8 * GB,
    arch: "aarch64",
    baseCpu: 45,
    baseMem: 82,
    baseDisk: 35,
    containers: [0, 2, 7],
  },
  {
    name: "media-server",
    host: "192.168.1.40",
    os: "Proxmox VE 8.2",
    cpu: "Intel i7-13700K",
    cores: 16,
    mem: 128 * GB,
    arch: "amd64",
    baseCpu: 22,
    baseMem: 48,
    baseDisk: 55,
    containers: [0, 1, 2, 3, 4, 5, 6, 7],
  },
  {
    name: "backup-node",
    host: "192.168.1.50",
    os: "TrueNAS SCALE",
    cpu: "Intel Xeon E5-2680",
    cores: 12,
    mem: 48 * GB,
    arch: "amd64",
    baseCpu: 8,
    baseMem: 30,
    baseDisk: 78,
    containers: [1, 6],
  },
];

const containerProfiles: { name: string; cpuBase: number; memMB: number; netKB: number }[] = [
  { name: "nginx", cpuBase: 2, memMB: 120, netKB: 800 },
  { name: "postgres", cpuBase: 8, memMB: 450, netKB: 200 },
  { name: "redis", cpuBase: 3, memMB: 180, netKB: 500 },
  { name: "grafana", cpuBase: 5, memMB: 280, netKB: 150 },
  { name: "prometheus", cpuBase: 6, memMB: 350, netKB: 300 },
  { name: "traefik", cpuBase: 4, memMB: 90, netKB: 1200 },
  { name: "minio", cpuBase: 3, memMB: 200, netKB: 600 },
  { name: "gitea", cpuBase: 4, memMB: 250, netKB: 100 },
];

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function smoothWalk(base: number, amplitude: number, steps: number, lo: number, hi: number): number[] {
  const values: number[] = [];
  let current = base + rand(-amplitude * 0.3, amplitude * 0.3);
  for (let i = 0; i < steps; i++) {
    const spike = Math.random() < 0.08 ? rand(-amplitude * 2, amplitude * 3) : 0;
    current += rand(-amplitude, amplitude) + spike;
    current = clamp(current, lo, hi);
    values.push(current);
  }
  return values;
}

function resolveSystem(systemId: string): MockSystemDef {
  const idx = Number(systemId.replace("mock-sys-", "")) - 1;
  return mockSystems[idx] ?? mockSystems[0] ?? (mockSystems.find(Boolean) as MockSystemDef);
}

const typeToMinutes: Record<string, number> = {
  "1m": 1,
  "10m": 10,
  "20m": 20,
  "120m": 120,
  "480m": 480,
};

function generateSystemStatsSeries(count: number, sys: MockSystemDef): BeszelSystemStats[] {
  const cpuWalk = smoothWalk(sys.baseCpu, 3, count, 1, 98);
  const memPctWalk = smoothWalk(sys.baseMem, 1.5, count, 10, 95);
  const diskPctWalk = smoothWalk(sys.baseDisk, 0.2, count, 5, 95);
  const diskReadWalk = smoothWalk(5, 3, count, 0, 80);
  const diskWriteWalk = smoothWalk(3, 2, count, 0, 50);
  const netSendWalk = smoothWalk(500, 200, count, 10, 8000);
  const netRecvWalk = smoothWalk(800, 300, count, 10, 12000);

  const diskTotal = rand(200, 2000) * GB;

  return cpuWalk.map((cpu, i) => {
    const memPct = memPctWalk[i] ?? sys.baseMem;
    const diskPct = diskPctWalk[i] ?? sys.baseDisk;
    const memTotalGB = sys.mem / GB;
    const diskTotalGB = diskTotal / GB;
    return {
      cpu,
      la: [cpu / 20 + rand(0, 0.5), cpu / 25 + rand(0, 0.3), cpu / 30 + rand(0, 0.2)] as [number, number, number],
      m: memTotalGB,
      mu: (memTotalGB * memPct) / 100,
      mp: memPct,
      mb: rand(0.5, 4),
      s: 4,
      su: rand(0, 2),
      d: diskTotalGB,
      du: (diskTotalGB * diskPct) / 100,
      dp: diskPct,
      dr: diskReadWalk[i] ?? 5,
      dw: diskWriteWalk[i] ?? 3,
      ns: (netSendWalk[i] ?? 500) * KB,
      nr: (netRecvWalk[i] ?? 800) * KB,
      b: [(netSendWalk[i] ?? 500) * KB * 0.7, (netRecvWalk[i] ?? 800) * KB * 0.7] as [number, number],
    };
  });
}

function generateContainerStatsSeries(count: number, profiles: typeof containerProfiles): BeszelContainerStats[][] {
  const walks = profiles.map((p) => ({
    profile: p,
    cpuWalk: smoothWalk(p.cpuBase, 1.5, count, 0, 50),
    memWalk: smoothWalk(p.memMB, p.memMB * 0.1, count, p.memMB * 0.5, p.memMB * 2),
    netWalk: smoothWalk(p.netKB, p.netKB * 0.3, count, 0, p.netKB * 4),
  }));

  return Array.from({ length: count }, (_, i) =>
    walks.map(({ profile, cpuWalk, memWalk, netWalk }) => ({
      n: profile.name,
      c: cpuWalk[i] ?? profile.cpuBase,
      m: memWalk[i] ?? profile.memMB,
      b: [(netWalk[i] ?? profile.netKB) * KB * 0.4, (netWalk[i] ?? profile.netKB) * KB * 0.6] as [number, number],
    })),
  );
}

function buildTimeSeries<T>(
  systemId: string,
  count: number,
  intervalMinutes: number,
  type: string,
  dataPoints: T[],
): (T & { id: string; system: string; type: string; created: string; updated: string })[] {
  const now = Date.now();
  const items = dataPoints.slice(0, count).map((data, i) => {
    const ts = new Date(now - (count - i) * intervalMinutes * 60_000).toISOString();
    return { id: `mock-stat-${i}`, system: systemId, type, created: ts, updated: ts, ...data };
  });
  return items.toReversed();
}

const statusByIndex: Record<number, "up" | "paused" | "down"> = { 2: "paused", 4: "down" };

export class BeszelMockService {
  public async getSystemsAsync(): Promise<BeszelSystem[]> {
    return mockSystems.map((sys, i) => ({
      id: `mock-sys-${i + 1}`,
      name: sys.name,
      host: sys.host,
      port: "45876",
      status: statusByIndex[i] ?? "up",
      info: {
        h: sys.name,
        cpu: clamp(sys.baseCpu + rand(-5, 10), 0, 100),
        c: sys.cores,
        ct: sys.cores * 2,
        m: sys.cpu,
        la: [sys.baseCpu / 20, sys.baseCpu / 25, sys.baseCpu / 30] as [number, number, number],
        o: sys.os,
        u: randInt(86400, 2_000_000),
        mp: clamp(sys.baseMem + rand(-5, 5), 0, 100),
        dp: clamp(sys.baseDisk + rand(-2, 2), 0, 100),
        bb: rand(200, 3000) * KB,
        v: "0.8.2",
        g: i === 3 ? rand(15, 45) : 0,
        dt: rand(32, 58),
        sv: [randInt(8, 25), randInt(25, 40)] as [number, number],
      },
      users: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }));
  }

  public async getSystemDetailsAsync(systemId: string): Promise<BeszelSystemDetails> {
    const sys = resolveSystem(systemId);
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
      arch: sys.arch,
      memory: sys.mem,
      podman: false,
      updated: new Date().toISOString(),
    };
  }

  public async getSystemStatsAsync(
    systemId: string,
    type: string,
    perPage: number,
  ): Promise<BeszelSystemStatsRecord[]> {
    const sys = resolveSystem(systemId);
    const intervalMinutes = typeToMinutes[type] ?? 1;
    const statsSeries = generateSystemStatsSeries(perPage, sys);
    const result = buildTimeSeries(
      systemId,
      perPage,
      intervalMinutes,
      type,
      statsSeries.map((stats) => ({ stats })),
    );

    return result;
  }

  public async getContainerStatsAsync(
    systemId: string,
    type: string,
    perPage: number,
  ): Promise<BeszelContainerStatsRecord[]> {
    const sys = resolveSystem(systemId);
    const intervalMinutes = typeToMinutes[type] ?? 1;
    const selectedProfiles = sys.containers
      .map((i) => containerProfiles[i])
      .filter(Boolean) as typeof containerProfiles;
    const series = generateContainerStatsSeries(perPage, selectedProfiles);
    const result = buildTimeSeries(
      systemId,
      perPage,
      intervalMinutes,
      type,
      series.map((stats) => ({ stats })),
    );

    return result;
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

  public async subscribeRealtimeMetrics(
    systemId: string,
    onMessage: (data: { stats: BeszelSystemStatsRecord; containerStats: BeszelContainerStatsRecord | null }) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const sys = resolveSystem(systemId);
    const emit = () => {
      if (signal.aborted) return;
      const [stats] = generateSystemStatsSeries(1, sys);
      if (!stats) return;
      const record: BeszelSystemStatsRecord = {
        id: `mock-rt-${Date.now()}`,
        system: systemId,
        stats,
        type: "1m",
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };
      onMessage({ stats: record, containerStats: null });
    };
    if (signal.aborted) return;
    await new Promise<void>((resolve) => {
      const interval = setInterval(emit, 1000);
      signal.addEventListener(
        "abort",
        () => {
          clearInterval(interval);
          resolve();
        },
        { once: true },
      );
    });
  }

  public async getAlertHistoryAsync(_systemId?: string, perPage = 10): Promise<BeszelAlertHistory[]> {
    const now = Date.now();
    const names = ["CPU", "Memory", "Disk", "Temperature", "Bandwidth"];
    return Array.from({ length: Math.min(perPage, 5) }, (_, i) => ({
      id: `mock-history-${i}`,
      alert: `mock-alert-${(i % 4) + 1}`,
      user: "mock-user",
      system: `mock-sys-${(i % 5) + 1}`,
      name: names[i % names.length] ?? "CPU",
      val: rand(60, 95),
      created: new Date(now - (i + 1) * 3_600_000).toISOString(),
      resolved: (i % 2 === 0 && new Date(now - i * 1_800_000).toISOString()) || null,
    }));
  }
}
