export interface BeszelAuthResponse {
  token: string;
  record: {
    id: string;
    email: string;
    username: string;
    verified: boolean;
  };
}

export type BeszelSystemStatus = "up" | "down" | "paused" | "pending";

/**
 * Real-time system info snapshot from Beszel agent.
 * Returned as `system.info` on each BeszelSystem record.
 * All resource values are percentages or already-scaled summaries.
 */
export interface BeszelSystemInfo {
  /** hostname */
  h?: string;
  /** CPU usage (%) */
  cpu: number;
  /** temperature (°C), overall */
  t?: number;
  /** CPU core count */
  c?: number;
  /** CPU thread count */
  ct?: number;
  /** CPU model string */
  m?: string;
  /** load average [1m, 5m, 15m] */
  la?: [number, number, number];
  /** OS identifier string */
  o?: string;
  /** uptime (seconds) */
  u: number;
  /** memory usage (%) */
  mp: number;
  /** disk usage (%) */
  dp: number;
  /** battery [level%, charging state] */
  bat?: [number, number];
  /** bandwidth — public interface (MiB/s, legacy). Use bb when available */
  b?: number;
  /** bandwidth — public interface (bytes/s, newer format). Preferred over b */
  bb?: number;
  /** agent version */
  v: string;
  /** podman mode */
  p?: boolean;
  /** GPU usage (%) */
  g?: number;
  /** disk temperature (°C) */
  dt?: number;
  /** OS type identifier */
  os?: number;
  /** extra filesystem usage (%) keyed by mount path */
  efs?: Record<string, number>;
  /** systemd services [running, total] */
  sv?: [number, number];
}

export interface BeszelSystem {
  id: string;
  name: string;
  host: string;
  port: string;
  status: BeszelSystemStatus;
  info: BeszelSystemInfo;
  users?: string[];
  created: string;
  updated: string;
}

export interface BeszelSystemDetails {
  id: string;
  system: string;
  hostname: string;
  kernel: string;
  cores: number;
  threads: number;
  cpu: string;
  os: number;
  os_name: string;
  arch: string;
  memory: number;
  podman: boolean;
  updated: string;
}

/**
 * Historical system stats record from Beszel PocketBase.
 * Stored per-interval (1m, 10m, 20m, 120m, 480m depending on time range).
 *
 * Units:
 * - CPU/GPU/memory/disk percentages: 0–100
 * - Memory/disk absolute values (mu, du, m, d, etc.): GiB
 * - Disk I/O (dr, dw): MiB/s
 * - Legacy network (ns, nr): MiB/s — all interfaces (including loopback, docker bridges)
 * - Bandwidth (b): bytes/s [sent, recv] — public interfaces only. Prefer b over ns/nr for user-facing charts
 */
export interface BeszelSystemStats {
  /** CPU usage (%) */
  cpu: number;
  /** CPU usage max (%) */
  cpum?: number;
  /** per-core busy (%) */
  cpub?: number[];
  /** per-core speed (MHz) */
  cpus?: number[];
  /** load average [1m, 5m, 15m] */
  la?: [number, number, number];
  /** total memory (GiB) */
  m: number;
  /** memory used (GiB) */
  mu: number;
  /** memory usage (%) */
  mp: number;
  /** memory buffer/cache (GiB) */
  mb: number;
  /** memory max used (GiB) */
  mm?: number;
  /** memory zfs arc (GiB) */
  mz?: number;
  /** total swap (GiB) */
  s: number;
  /** swap used (GiB) */
  su: number;
  /** total disk (GiB) */
  d: number;
  /** disk used (GiB) */
  du: number;
  /** disk usage (%) */
  dp: number;
  /** disk read (MiB/s) */
  dr?: number;
  /** disk write (MiB/s) */
  dw?: number;
  /** disk read max (MiB/s) */
  drm?: number;
  /** disk write max (MiB/s) */
  dwm?: number;
  /** disk IOPS [read, write] */
  dio?: [number, number];
  /** disk IOPS max [read, write] */
  diom?: [number, number];
  /** legacy network sent — all interfaces (MiB/s) */
  ns?: number;
  /** legacy network received — all interfaces (MiB/s) */
  nr?: number;
  /** bandwidth — public interfaces only (bytes/s) [sent, recv]. Prefer over ns/nr */
  b?: [number, number];
  /** legacy network sent max (MiB/s) */
  nsm?: number;
  /** legacy network received max (MiB/s) */
  nrm?: number;
  /** bandwidth max [sent, recv] (bytes/s) */
  bm?: [number, number];
  /** temperatures keyed by sensor name (°C) */
  t?: Record<string, number>;
  /** extra filesystem stats keyed by mount path */
  efs?: Record<string, BeszelExtraFsStats>;
  /** GPU stats keyed by device id */
  g?: Record<string, BeszelGPUData>;
  /** battery [level%, charging state] */
  bat?: [number, number];
  /** network interfaces [rx bytes/s, tx bytes/s, rx max, tx max] */
  ni?: Record<string, [number, number, number, number]>;
}

export interface BeszelExtraFsStats {
  /** total disk (GiB) */
  d: number;
  /** disk used (GiB) */
  du: number;
  /** read (bytes/s) */
  r: number;
  /** write (bytes/s) */
  w: number;
  /** read max (bytes/s) */
  rm?: number;
  /** write max (bytes/s) */
  wm?: number;
  /** read (IOPS) */
  rb?: number;
  /** write (IOPS) */
  wb?: number;
  /** read max (IOPS) */
  rbm?: number;
  /** write max (IOPS) */
  wbm?: number;
}

export interface BeszelGPUData {
  /** GPU name/model */
  n: string;
  /** memory used (bytes) */
  mu?: number;
  /** memory total (bytes) */
  mt?: number;
  /** GPU utilization (%) */
  u: number;
  /** power draw (W) */
  p?: number;
  /** power peak (W) */
  pp?: number;
  /** encoder utilization keyed by engine name (%) */
  e?: Record<string, number>;
}

export interface BeszelSystemStatsRecord {
  id: string;
  system: string;
  stats: BeszelSystemStats;
  type: string;
  created: string;
  updated: string;
}

export interface BeszelContainer {
  id: string;
  system: string;
  name: string;
  image: string;
  status: string;
  health: number;
  cpu: number;
  memory: number;
  net: number;
  ports?: string;
  updated: number;
}

/**
 * Per-container resource stats from Beszel agent.
 * One entry per container in a BeszelContainerStatsRecord.
 *
 * Network fields: b (bandwidth) is preferred when available; fall back to ns/nr.
 * Units: m/ns/nr = MiB or MiB/s, c = %, b = bytes/s
 */
export interface BeszelContainerStats {
  /** container name */
  n: string;
  /** CPU usage (%) */
  c: number;
  /** memory usage (MiB) */
  m: number;
  /** network sent (MiB/s) — legacy, use b when available */
  ns?: number;
  /** network received (MiB/s) — legacy, use b when available */
  nr?: number;
  /** network bandwidth [sent, recv] (bytes/s) — preferred over ns/nr */
  b?: [number, number];
}

export interface BeszelContainerStatsRecord {
  id: string;
  system: string;
  stats: BeszelContainerStats[];
  type: string;
  created: string;
  updated: string;
}

export interface BeszelSmartDevice {
  id: string;
  system: string;
  name: string;
  model: string;
  state: string;
  capacity: number;
  temp: number;
  firmware: string;
  serial: string;
  type: string;
  hours: number;
  cycles: number;
  attributes: BeszelSmartAttribute[];
  updated: string;
}

export interface BeszelSmartAttribute {
  /** attribute ID */
  id?: number;
  /** attribute name */
  n: string;
  /** current value */
  v: number;
  /** worst value */
  w?: number;
  /** threshold */
  t?: number;
  /** raw value (numeric) */
  rv?: number;
  /** raw value (string) */
  rs?: string;
  /** when failed */
  wf?: string;
}

export interface BeszelSystemdService {
  id: string;
  system: string;
  name: string;
  state: number;
  sub: number;
  cpu: number;
  cpuPeak: number;
  memory: number;
  memPeak: number;
  updated: number;
}

export interface BeszelAlert {
  id: string;
  user: string;
  system: string;
  name: string;
  triggered: boolean;
  value: number;
  min: number;
}

export interface BeszelAlertHistory {
  id: string;
  alert: string;
  user: string;
  system: string;
  name: string;
  val: number;
  created: string;
  resolved?: string | null;
}

export interface CreateAlertInput {
  name: string;
  value: number;
  min?: number;
}

export interface UpdateAlertInput {
  value?: number;
  min?: number;
}

/**
 * Live SSE subscription event types for real-time Beszel metrics.
 * Discriminated union — clients accumulate each type into its own buffer.
 */
export interface LiveSystemStatsEvent {
  type: "system_stats";
  record: BeszelSystemStatsRecord;
}

export interface LiveContainerStatsEvent {
  type: "container_stats";
  record: BeszelContainerStatsRecord;
}

export type LiveStatsEvent = LiveSystemStatsEvent | LiveContainerStatsEvent;

export interface PocketBaseListResponse<T> {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: T[];
}

/**
 * Normalized view model for a Beszel-monitored system.
 * Constructed by mapToSystemRow() in request-handler from BeszelSystem + BeszelSystemDetails.
 * This is the shape consumed by grid/table widgets — all values are pre-scaled for display.
 */
export interface BeszelSystemRow {
  id: string;
  name: string;
  status: BeszelSystemStatus;
  /** CPU usage (%) */
  cpu: number;
  /** memory usage (%) */
  memory: number;
  /** disk usage (%) */
  disk: number;
  /** extra filesystem usage (%) keyed by mount path */
  extraFilesystems: Record<string, number>;
  /** GPU usage (%) */
  gpu: number;
  /** load average [1m, 5m, 15m] */
  loadAvg: [number, number, number] | null;
  /** public interface bandwidth (bytes/s). From info.bb or legacy info.b normalized from MiB/s */
  netBytes: number;
  /** temperature (°C) */
  temp: number | null;
  /** battery [level%, charging state] */
  battery: [number, number] | null;
  /** running systemd services count */
  services: number;
  /** uptime (seconds) */
  uptime: number;
  agentVersion: string;
  hostname: string;
  cpuModel: string;
  cores: number;
  /** total memory (bytes) */
  memoryTotal: number;
  osName: string;
}
