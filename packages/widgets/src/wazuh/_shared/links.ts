/**
 * Deep links into the Wazuh dashboard (4.9+ application routes). The base URL comes from the integration's optional
 * "Dashboard URL" field or its linked app.
 */
const kuery = (query: string) =>
  encodeURIComponent(
    `(filters:!(),query:(language:kuery,query:'${query.replaceAll("!", "!!").replaceAll("'", "!'")}'))`,
  );

const timeWindow = (from: string, to: string) => encodeURIComponent(`(time:(from:'${from}',to:'${to}'))`);

const withAgent = (agentId?: string | null) => (agentId ? `&agentId=${encodeURIComponent(agentId)}` : "");

export interface WazuhDashboardLinks {
  home: string;
  events: (options?: { agentId?: string | null; query?: string; from?: string; to?: string }) => string;
  alert: (alert: { alertId: string | null; timestamp: string; agentId?: string | null }) => string;
  rule: (ruleId: string) => string;
  agents: string;
  agent: (agentId: string) => string;
  vulnerabilities: (options?: { agentId?: string | null; cve?: string }) => string;
  fim: (agentId?: string | null) => string;
  mitre: string;
}

export const createWazuhDashboardLinks = (baseUrl: string | null | undefined): WazuhDashboardLinks | null => {
  if (!baseUrl) return null;
  const base = baseUrl.replace(/\/+$/, "");

  const events: WazuhDashboardLinks["events"] = (options = {}) => {
    let url = `${base}/app/threat-hunting#/overview/?tab=general&tabView=events${withAgent(options.agentId)}`;
    if (options.query) url += `&_q=${kuery(options.query)}`;
    url += `&_g=${timeWindow(options.from ?? "now-24h", options.to ?? "now")}`;
    return url;
  };

  return {
    home: `${base}/app/wz-home`,
    events,
    alert: ({ alertId, timestamp, agentId }) => {
      const time = new Date(timestamp).getTime();
      const window = 5 * 60 * 1000;
      return events({
        agentId,
        query: alertId ? `id:"${alertId}"` : undefined,
        from: new Date(time - window).toISOString(),
        to: new Date(time + window).toISOString(),
      });
    },
    rule: (ruleId) => events({ query: `rule.id:${ruleId}` }),
    agents: `${base}/app/endpoints-summary#/agents-preview`,
    agent: (agentId) => `${base}/app/endpoints-summary#/agents?tab=welcome&agent=${encodeURIComponent(agentId)}`,
    vulnerabilities: ({ agentId, cve } = {}) =>
      `${base}/app/vulnerability-detection#/overview/?tab=vuls&tabView=inventory${withAgent(agentId)}${
        cve ? `&_q=${kuery(`vulnerability.id:${cve}`)}` : ""
      }`,
    fim: (agentId) => `${base}/app/fim#/overview/?tab=fim&tabView=events${withAgent(agentId)}`,
    mitre: `${base}/app/mitre-attack#/overview/?tab=mitre&tabView=dashboard`,
  };
};
