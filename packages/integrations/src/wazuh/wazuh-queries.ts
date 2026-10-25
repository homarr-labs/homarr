import type {
  WazuhAgentStatus,
  WazuhAlert,
  WazuhAlertSeverityCounts,
  WazuhIndexerAlertSource,
  WazuhIndexerHit,
  WazuhTimelineInterval,
  WazuhTimeRange,
} from "./wazuh-types";

export const timeRangeMs: Record<WazuhTimeRange, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const intervalMs: Record<Exclude<WazuhTimelineInterval, "auto">, number> = {
  "1m": 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "3h": 3 * 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
};

const autoInterval: Record<WazuhTimeRange, Exclude<WazuhTimelineInterval, "auto">> = {
  "1h": "1m",
  "24h": "30m",
  "7d": "3h",
  "30d": "12h",
};

/** Upper bound for histogram buckets so a small interval on a long range cannot overload the indexer. */
const MAX_TIMELINE_BUCKETS = 400;

export const resolveTimelineIntervalMs = (range: WazuhTimeRange, interval: WazuhTimelineInterval) => {
  const requested = intervalMs[interval === "auto" ? autoInterval[range] : interval];
  const minimum = Math.ceil(timeRangeMs[range] / MAX_TIMELINE_BUCKETS);
  if (requested >= minimum) return requested;
  // Pick the smallest predefined interval that keeps the bucket count in bounds.
  return Object.values(intervalMs).find((value) => value >= minimum) ?? intervalMs["1d"];
};

/** Rule level buckets used by the Wazuh dashboard. */
export const severityRangeAggregation = {
  range: {
    field: "rule.level",
    keyed: false,
    ranges: [
      { key: "low", to: 7 },
      { key: "medium", from: 7, to: 12 },
      { key: "high", from: 12, to: 15 },
      { key: "critical", from: 15 },
    ],
  },
} as const;

export interface KeyedBucket<TKey = string> {
  key: TKey;
  doc_count: number;
}

export type SeverityRangeResult = { buckets: KeyedBucket[] } | undefined;

export const toSeverityCounts = (result: SeverityRangeResult, total: number): WazuhAlertSeverityCounts => {
  const bucketCount = (key: string) => result?.buckets.find((bucket) => bucket.key === key)?.doc_count ?? 0;
  return {
    total,
    low: bucketCount("low"),
    medium: bucketCount("medium"),
    high: bucketCount("high"),
    critical: bucketCount("critical"),
  };
};

export const getTotalHits = (total: { value: number } | number | undefined) =>
  typeof total === "number" ? total : (total?.value ?? 0);

/** Auth failure groups. Brute force = Wazuh correlation rules (authentication_failures) or MITRE T1110. */
export const authFailureQuery = {
  bool: {
    should: [
      { terms: { "rule.groups": ["authentication_failed", "authentication_failures", "invalid_login"] } },
      { term: { "rule.mitre.id": "T1110" } },
    ],
    minimum_should_match: 1,
  },
} as const;

export const bruteForceQuery = {
  bool: {
    should: [{ term: { "rule.groups": "authentication_failures" } }, { term: { "rule.mitre.id": "T1110" } }],
    minimum_should_match: 1,
  },
} as const;

export const alertSourceFields = [
  "id",
  "timestamp",
  "rule.id",
  "rule.level",
  "rule.description",
  "rule.groups",
  "rule.mitre.id",
  "rule.mitre.tactic",
  "rule.mitre.technique",
  "agent.id",
  "agent.name",
  "data.srcip",
];

const asArray = (value: string[] | string | undefined): string[] => {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

export const mapAlertHit = (hit: WazuhIndexerHit<WazuhIndexerAlertSource>) => {
  const source = hit._source;
  return {
    id: hit._id,
    alertId: source.id ?? null,
    timestamp: source.timestamp ?? new Date(0).toISOString(),
    level: source.rule?.level ?? 0,
    ruleId: source.rule?.id ?? null,
    description: source.rule?.description ?? "",
    agentId: source.agent?.id ?? null,
    agentName: source.agent?.name ?? null,
    sourceIp: source.data?.srcip ?? null,
    groups: asArray(source.rule?.groups),
    mitre: {
      ids: asArray(source.rule?.mitre?.id),
      tactics: asArray(source.rule?.mitre?.tactic),
      techniques: asArray(source.rule?.mitre?.technique),
    },
  };
};

export const normalizeAgentStatus = (status: string | undefined): WazuhAgentStatus | "unknown" => {
  if (status === "active" || status === "disconnected" || status === "never_connected" || status === "pending") {
    return status;
  }
  return "unknown";
};

export const normalizeGroups = (group: string[] | string | undefined) => asArray(group);

export const normalizeVersion = (version: string | undefined) => version?.replace(/^Wazuh\s+/i, "") ?? null;

/** Plain text body of a Wazuh alert in the notifications widget. */
export const formatAlertNotificationBody = (alert: WazuhAlert) => {
  const lines = [`Level ${alert.level}${alert.ruleId ? ` · Rule ${alert.ruleId}` : ""}`];
  if (alert.agentName ?? alert.agentId) {
    lines.push(
      `Agent: ${alert.agentName ?? alert.agentId}${alert.agentName && alert.agentId ? ` (${alert.agentId})` : ""}`,
    );
  }
  if (alert.sourceIp) lines.push(`Source IP: ${alert.sourceIp}`);
  if (alert.mitre.ids.length > 0) lines.push(`MITRE ATT&CK: ${alert.mitre.ids.join(", ")}`);
  return lines.join("\n");
};

const kuery = (query: string) =>
  encodeURIComponent(
    `(filters:!(),query:(language:kuery,query:'${query.replaceAll("!", "!!").replaceAll("'", "!'")}'))`,
  );

/**
 * Link to an alert in the Wazuh dashboard (4.9+ routes). Mirrors the alert link of the Wazuh widgets: the events view
 * filtered by the alert id within five minutes of the alert.
 */
export const createAlertDashboardUrl = (dashboardUrl: string, alert: WazuhAlert) => {
  const time = new Date(alert.timestamp).getTime();
  const window = 5 * 60 * 1000;
  const from = new Date(time - window).toISOString();
  const to = new Date(time + window).toISOString();
  let url = `${dashboardUrl.replace(/\/+$/, "")}/app/threat-hunting#/overview/?tab=general&tabView=events`;
  if (alert.agentId) url += `&agentId=${encodeURIComponent(alert.agentId)}`;
  if (alert.alertId) url += `&_q=${kuery(`id:"${alert.alertId}"`)}`;
  url += `&_g=${encodeURIComponent(`(time:(from:'${from}',to:'${to}'))`)}`;
  return url;
};
