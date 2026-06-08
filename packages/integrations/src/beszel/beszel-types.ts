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

export interface BeszelSystemInfo {
  h?: string;
  cpu: number;
  t?: number;
  c?: number;
  ct?: number;
  m?: string;
  la?: [number, number, number];
  o?: string;
  u: number;
  mp: number;
  dp: number;
  bat?: [number, number];
  b?: number;
  bb?: number;
  v: string;
  p?: boolean;
  g?: number;
  dt?: number;
  os?: number;
  efs?: Record<string, number>;
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

export interface BeszelSystemStats {
  cpu: number;
  cpum?: number;
  cpub?: number[];
  cpus?: number[];
  la?: [number, number, number];
  m: number;
  mu: number;
  mp: number;
  mb: number;
  mm?: number;
  mz?: number;
  s: number;
  su: number;
  d: number;
  du: number;
  dp: number;
  dr: number;
  dw: number;
  drm?: number;
  dwm?: number;
  dio?: [number, number];
  diom?: [number, number];
  ns: number;
  nr: number;
  b?: [number, number];
  nsm?: number;
  nrm?: number;
  bm?: [number, number];
  t?: Record<string, number>;
  efs?: Record<string, BeszelExtraFsStats>;
  g?: Record<string, BeszelGPUData>;
  bat?: [number, number];
  ni?: Record<string, [number, number, number, number]>;
}

export interface BeszelExtraFsStats {
  d: number;
  du: number;
  r: number;
  w: number;
  rm: number;
  wm: number;
  rb: number;
  wb: number;
  rbm: number;
  wbm: number;
}

export interface BeszelGPUData {
  n: string;
  mu?: number;
  mt?: number;
  u: number;
  p?: number;
  pp?: number;
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

export interface BeszelContainerStats {
  n: string;
  c: number;
  m: number;
  ns?: number;
  nr?: number;
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
  id?: number;
  n: string;
  v: number;
  w?: number;
  t?: number;
  rv?: number;
  rs?: string;
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

export interface BeszelSystemRow {
  id: string;
  name: string;
  status: BeszelSystemStatus;
  cpu: number;
  memory: number;
  disk: number;
  gpu: number;
  loadAvg: [number, number, number] | null;
  netBytes: number;
  temp: number | null;
  battery: [number, number] | null;
  services: number;
  uptime: number;
  agentVersion: string;
  hostname: string;
  cpuModel: string;
  cores: number;
  memoryTotal: number;
  osName: string;
}
