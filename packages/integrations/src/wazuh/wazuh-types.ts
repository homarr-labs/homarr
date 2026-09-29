export type WazuhDataSource = "api" | "indexer";

export type WazuhAgentStatus = "active" | "disconnected" | "never_connected" | "pending";

export type WazuhSeverity = "low" | "medium" | "high" | "critical";

export const wazuhTimeRanges = ["1h", "24h", "7d", "30d"] as const;
export type WazuhTimeRange = (typeof wazuhTimeRanges)[number];

export const wazuhTimelineIntervals = ["auto", "1m", "5m", "15m", "30m", "1h", "3h", "6h", "12h", "1d"] as const;
export type WazuhTimelineInterval = (typeof wazuhTimelineIntervals)[number];

export const wazuhTopListKinds = ["rules", "agents", "sourceIps", "mitreTactics", "mitreTechniques"] as const;
export type WazuhTopListKind = (typeof wazuhTopListKinds)[number];

export const wazuhFimEvents = ["all", "added", "modified", "deleted"] as const;
export type WazuhFimEventFilter = (typeof wazuhFimEvents)[number];
export type WazuhFimEvent = Exclude<WazuhFimEventFilter, "all">;

export const wazuhCveOrders = ["score", "agents"] as const;
export type WazuhCveOrder = (typeof wazuhCveOrders)[number];

export interface WazuhAgentCounts {
  total: number;
  active: number;
  disconnected: number;
  neverConnected: number;
  pending: number;
}

export interface WazuhAgent {
  id: string;
  name: string;
  status: WazuhAgentStatus | "unknown";
  ip: string | null;
  osName: string | null;
  osVersion: string | null;
  /** Lower-case platform identifier (ubuntu, windows, darwin, debian, ...) used to pick an icon. */
  osPlatform: string | null;
  version: string | null;
  lastKeepAlive: string | null;
  groups: string[];
}

export interface WazuhAgentsOverview {
  source: WazuhDataSource;
  /** When the data was taken. Indexer snapshots (wazuh-monitoring-*) can lag behind the manager. */
  asOf: string;
  counts: WazuhAgentCounts;
  agents: WazuhAgent[];
}

export interface WazuhMitre {
  ids: string[];
  tactics: string[];
  techniques: string[];
}

export interface WazuhAlert {
  id: string;
  /** The Wazuh alert id ("1790466949.5285465"), used for dashboard deep links. */
  alertId: string | null;
  timestamp: string;
  level: number;
  ruleId: string | null;
  description: string;
  agentId: string | null;
  agentName: string | null;
  sourceIp: string | null;
  groups: string[];
  mitre: WazuhMitre;
}

export interface WazuhAlertSeverityCounts {
  total: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface WazuhVulnerabilityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  unscored: number;
}

export interface WazuhSecuritySummary {
  range: WazuhTimeRange;
  alerts: WazuhAlertSeverityCounts | null;
  previousAlerts: WazuhAlertSeverityCounts | null;
  /** Highest rule level seen in the current period. */
  maxLevel: number | null;
  managerVersion: string | null;
  indexerHealth: "green" | "yellow" | "red" | null;
}

export interface WazuhTimelinePoint {
  timestamp: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface WazuhAlertTimeline {
  range: WazuhTimeRange;
  intervalMs: number;
  totals: WazuhAlertSeverityCounts;
  points: WazuhTimelinePoint[];
}

export interface WazuhTopListEntry {
  key: string;
  label: string;
  /** Secondary information: rule id / agent id / MITRE technique id. */
  detail: string | null;
  count: number;
  /** Highest rule level seen for this entry, when meaningful. */
  maxLevel: number | null;
  /** Number of distinct agents involved, when meaningful. */
  agents: number | null;
}

export interface WazuhTopList {
  kind: WazuhTopListKind;
  range: WazuhTimeRange;
  total: number;
  others: number;
  entries: WazuhTopListEntry[];
}

export interface WazuhCve {
  id: string;
  severity: string;
  score: number | null;
  agents: number;
  packages: string[];
  reference: string | null;
}

export interface WazuhVulnerableAgent {
  id: string;
  name: string;
  total: number;
  critical: number;
  high: number;
}

export interface WazuhVulnerabilityOverview {
  counts: WazuhVulnerabilityCounts;
  total: number;
  affectedAgents: number;
  topCves: WazuhCve[];
  topAgents: WazuhVulnerableAgent[];
}

export interface WazuhFimEntry {
  id: string;
  alertId: string | null;
  timestamp: string;
  event: WazuhFimEvent | "unknown";
  path: string;
  /** Registry value name on Windows. */
  valueName: string | null;
  isRegistry: boolean;
  agentId: string | null;
  agentName: string | null;
  level: number;
  description: string;
  user: string | null;
}

export interface WazuhFimOverview {
  range: WazuhTimeRange;
  counts: Record<WazuhFimEvent, number>;
  entries: WazuhFimEntry[];
}

export interface WazuhAuthFailureAgent {
  agentId: string | null;
  agentName: string;
  failed: number;
  bruteForce: number;
  total: number;
  /** Hourly counts (oldest first) for the sparkline. */
  series: number[];
  topSourceIps: { ip: string; count: number }[];
  lastSeen: string | null;
}

export interface WazuhAuthFailures {
  hours: number;
  totals: { failed: number; bruteForce: number; total: number; sourceIps: number };
  series: number[];
  agents: WazuhAuthFailureAgent[];
}

/** Levels follow the Wazuh dashboard buckets: low 0-6, medium 7-11, high 12-14, critical 15+. */
export const getWazuhSeverityForLevel = (level: number): WazuhSeverity => {
  if (level >= 15) return "critical";
  if (level >= 12) return "high";
  if (level >= 7) return "medium";
  return "low";
};

/** Raw shapes returned by the Wazuh server API and indexer. Only the fields we read are listed. */
export interface WazuhApiResponse<TData> {
  data: TData;
  error?: number;
  message?: string;
}

export interface WazuhApiAgentsSummaryStatus {
  connection?: Partial<Record<WazuhAgentStatus | "total", number>>;
}

export interface WazuhApiItems<TItem> {
  affected_items: TItem[];
  total_affected_items: number;
}

export interface WazuhApiAgent {
  id: string;
  name?: string;
  ip?: string;
  status?: string;
  version?: string;
  lastKeepAlive?: string;
  group?: string[];
  os?: { name?: string; version?: string; platform?: string };
}

export interface WazuhIndexerHit<TSource> {
  _id: string;
  _index?: string;
  _source: TSource;
}

export interface WazuhIndexerSearchResponse<TSource, TAggregations = undefined> {
  hits: {
    total?: { value: number; relation: string } | number;
    hits: WazuhIndexerHit<TSource>[];
  };
  aggregations?: TAggregations;
}

export interface WazuhIndexerMonitoringSource {
  id?: string;
  name?: string;
  ip?: string;
  status?: string;
  version?: string;
  lastKeepAlive?: string;
  timestamp?: string;
  group?: string[] | string;
  os?: { name?: string; version?: string; platform?: string };
}

export interface WazuhIndexerAlertSource {
  id?: string;
  timestamp?: string;
  rule?: {
    id?: string;
    level?: number;
    description?: string;
    groups?: string[];
    mitre?: { id?: string[]; tactic?: string[]; technique?: string[] };
  };
  agent?: { id?: string; name?: string; ip?: string };
  data?: { srcip?: string; dstuser?: string };
  syscheck?: {
    path?: string;
    event?: string;
    value_name?: string;
    uname_after?: string;
    audit?: { effective_user?: { name?: string }; user?: { name?: string } };
  };
}
