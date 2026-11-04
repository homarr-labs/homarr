import { uptimeKumaMaxHeartbeats as heartbeatCount } from "./uptime-kuma-types";
import type {
  UptimeKumaHeartbeat,
  UptimeKumaMonitor,
  UptimeKumaMonitorStatus,
  UptimeKumaStatusPage,
} from "./uptime-kuma-types";

const heartbeatIntervalMs = 60_000;

interface MockMonitor {
  id: number;
  name: string;
  type: string;
  basePing: number;
  uptime24h: number;
  certificateDaysRemaining?: number;
  statusAt: (index: number) => UptimeKumaMonitorStatus;
}

const steady = (): UptimeKumaMonitorStatus => "up";
const failingFrom =
  (start: number): MockMonitor["statusAt"] =>
  (index) =>
    index >= start ? "down" : "up";
const blipsAt =
  (indices: readonly number[], status: UptimeKumaMonitorStatus): MockMonitor["statusAt"] =>
  (index) =>
    indices.includes(index) ? status : "up";

const groups: { id: number; name: string; monitors: MockMonitor[] }[] = [
  {
    id: 1,
    name: "Services",
    monitors: [
      {
        id: 1,
        name: "Homarr",
        type: "http",
        basePing: 42,
        uptime24h: 100,
        certificateDaysRemaining: 61,
        statusAt: steady,
      },
      {
        id: 2,
        name: "Media server",
        type: "http",
        basePing: 118,
        uptime24h: 99.98,
        statusAt: blipsAt([17], "pending"),
      },
      {
        id: 3,
        name: "Home cloud",
        type: "keyword",
        basePing: 236,
        uptime24h: 99.91,
        certificateDaysRemaining: 9,
        statusAt: blipsAt([31, 32], "down"),
      },
      {
        id: 4,
        name: "Backups",
        type: "push",
        basePing: 12,
        uptime24h: 99.62,
        statusAt: blipsAt([heartbeatCount - 1], "pending"),
      },
    ],
  },
  {
    id: 2,
    name: "Network",
    monitors: [
      { id: 5, name: "VPN", type: "port", basePing: 21, uptime24h: 99.8, statusAt: steady },
      { id: 6, name: "DNS resolver", type: "dns", basePing: 8, uptime24h: 100, statusAt: steady },
      {
        id: 7,
        name: "Lab service",
        type: "ping",
        basePing: 64,
        uptime24h: 98.99,
        statusAt: failingFrom(heartbeatCount - 6),
      },
    ],
  },
];

export const createUptimeKumaMockStatusPage = (now: number): UptimeKumaStatusPage => ({
  title: "Homelab",
  url: "https://status.homarr.dev/status/homelab",
  incidents: [
    {
      id: 1,
      title: "Lab service unreachable",
      content: "The lab host is being re-cabled.",
      style: "warning",
      createdAt: now - 6 * heartbeatIntervalMs,
      updatedAt: null,
    },
  ],
  maintenances: [],
  groups: groups.map((group) => ({
    id: group.id,
    name: group.name,
    monitors: group.monitors.map((monitor) => createMockMonitor(monitor, now)),
  })),
});

const createMockMonitor = (monitor: MockMonitor, now: number): UptimeKumaMonitor => {
  const heartbeats: UptimeKumaHeartbeat[] = Array.from({ length: heartbeatCount }, (_, index) => {
    const status = monitor.statusAt(index);
    return {
      status,
      time: now - (heartbeatCount - 1 - index) * heartbeatIntervalMs,
      ping: status === "down" ? null : monitor.basePing + ((index * 37) % 23),
    };
  });
  const latest = heartbeats.at(-1);
  const firstOfStreak = heartbeats.findLastIndex((heartbeat) => heartbeat.status !== latest?.status) + 1;

  return {
    id: monitor.id,
    name: monitor.name,
    type: monitor.type,
    url: null,
    status: latest?.status ?? "unknown",
    uptime24h: monitor.uptime24h,
    ping: latest?.ping ?? null,
    lastCheckAt: latest?.time ?? null,
    statusSince: firstOfStreak === 0 ? null : (heartbeats[firstOfStreak]?.time ?? null),
    certificateDaysRemaining: monitor.certificateDaysRemaining ?? null,
    tags: [],
    heartbeats,
  };
};
