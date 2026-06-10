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
  /** bandwidth — public interface (Mbps, legacy). Use bb when available */
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
 * - Memory/disk absolute values (mu, du, etc.): bytes
 * - Disk I/O (dr, dw): bytes/s
 * - Network (ns, nr): bytes/s — all interfaces (including loopback, docker bridges)
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
  /** total memory (bytes) */
  m: number;
  /** memory used (bytes) */
  mu: number;
  /** memory usage (%) */
  mp: number;
  /** memory buffer/cache (bytes) */
  mb: number;
  /** memory max used (bytes) */
  mm?: number;
  /** memory zfs arc (bytes) */
  mz?: number;
  /** total swap (bytes) */
  s: number;
  /** swap used (bytes) */
  su: number;
  /** total disk (bytes) */
  d: number;
  /** disk used (bytes) */
  du: number;
  /** disk usage (%) */
  dp: number;
  /** disk read (bytes/s) */
  dr: number;
  /** disk write (bytes/s) */
  dw: number;
  /** disk read max (bytes/s) */
  drm?: number;
  /** disk write max (bytes/s) */
  dwm?: number;
  /** disk IOPS [read, write] */
  dio?: [number, number];
  /** disk IOPS max [read, write] */
  diom?: [number, number];
  /** network sent — all interfaces (bytes/s) */
  ns: number;
  /** network received — all interfaces (bytes/s) */
  nr: number;
  /** bandwidth — public interfaces only (bytes/s) [sent, recv]. Prefer over ns/nr */
  b?: [number, number];
  /** network sent max (bytes/s) */
  nsm?: number;
  /** network received max (bytes/s) */
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
  /** total disk (bytes) */
  d: number;
  /** disk used (bytes) */
  du: number;
  /** read (bytes/s) */
  r: number;
  /** write (bytes/s) */
  w: number;
  /** read max (bytes/s) */
  rm: number;
  /** write max (bytes/s) */
  wm: number;
  /** read (IOPS) */
  rb: number;
  /** write (IOPS) */
  wb: number;
  /** read max (IOPS) */
  rbm: number;
  /** write max (IOPS) */
  wbm: number;
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
 */
export interface BeszelContainerStats {
  /** container name */
  n: string;
  /** CPU usage (%) */
  c: number;
  /** memory usage (bytes) */
  m: number;
  /** network sent (bytes/s) — legacy, use b when available */
  ns?: number;
  /** network received (bytes/s) — legacy, use b when available */
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
  /** GPU usage (%) */
  gpu: number;
  /** load average [1m, 5m, 15m] */
  loadAvg: [number, number, number] | null;
  /** public interface bandwidth (bytes/s). From info.bb or info.b * 1M */
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
