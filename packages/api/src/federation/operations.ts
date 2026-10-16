import { mediaRequestStatusConfiguration } from "@homarr/integrations/types";

/** Explicit result contracts for native operations accepting more than one integration. */
export type FederationMerge = "array" | "void" | "mediaReleases" | "requests" | "requestStats" | "first";

export const federationManyOperations: Readonly<Record<string, FederationMerge>> = {
  "widget.speedtestTracker.getDashboard": "array",
  "widget.networkController.summary": "array",
  "widget.notifications.getNotifications": "array",
  "widget.releases.getServiceVersions": "array",
  "widget.mediaOrganizer.getData": "array",
  "widget.umami.getVisitorStats": "array",
  "widget.uptimeKuma.getDashboard": "array",
  "widget.healthMonitoring.getSystemHealthStatus": "array",
  "widget.indexerManager.getIndexersStatus": "array",
  "widget.indexerManager.testAllIndexers": "void",
  "widget.dnsHole.summary": "array",
  "widget.mediaRelease.getMediaReleases": "mediaReleases",
  "widget.vpn.getSummaries": "array",
  "widget.mediaRequests.getLatestRequests": "requests",
  "widget.mediaRequests.getStats": "requestStats",
  "widget.calendar.findAllEvents": "array",
  "widget.tracearr.getDashboard": "array",
  "widget.coolify.getInstancesInfo": "array",
  "widget.traefik.getDashboard": "array",
  "widget.mediaServer.getCurrentStreams": "array",
  "widget.downloads.getJobsAndStatuses": "array",
  "widget.downloads.pause": "void",
  "widget.downloads.pauseItem": "void",
  "widget.downloads.resume": "void",
  "widget.downloads.resumeItem": "void",
  "widget.downloads.deleteItem": "void",
  "widget.beszel.getSystems": "array",
  "widget.beszel.getAlerts": "array",
  "widget.beszel.getSystemStats": "first",
  "widget.beszel.subscribeSystemStats": "first",
  "widget.ups.getSummaries": "array",
  "widget.firewall.getFirewallCpuStatus": "array",
  "widget.firewall.getFirewallInterfacesStatus": "array",
  "widget.firewall.getFirewallVersionStatus": "array",
  "widget.firewall.getFirewallMemoryStatus": "array",
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid federation result");
  return value as Record<string, unknown>;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Invalid federation result");
  return value;
}

/** Remap only fields declared to identify integrations, never arbitrary upstream `id` fields. */
export function remapIntegrationResult(
  resultValue: unknown,
  identities: ReadonlyMap<string, string>,
  merge?: FederationMerge,
) {
  const descriptor = (value: unknown) => {
    const result = { ...record(value) };
    if (typeof result.id === "string" && identities.has(result.id)) result.id = identities.get(result.id);
    return result;
  };
  const row = (value: unknown) => {
    const result = { ...record(value) };
    if (typeof result.integrationId === "string" && identities.has(result.integrationId))
      result.integrationId = identities.get(result.integrationId);
    if (result.integration && typeof result.integration === "object")
      result.integration = descriptor(result.integration);
    return result;
  };
  if (merge === "array") return array(resultValue).map(row);
  if (merge === "void") return resultValue;
  if (merge === "first") {
    if (resultValue && typeof resultValue === "object" && Symbol.asyncIterator in resultValue) return resultValue;
    return row(resultValue);
  }
  if (merge === "mediaReleases" || merge === "requests" || merge === "requestStats") {
    const result = { ...record(resultValue) };
    if (Array.isArray(result.failedIntegrations)) result.failedIntegrations = result.failedIntegrations.map(row);
    if (merge === "mediaReleases") result.releases = array(result.releases).map(row);
    if (merge === "requests") result.requests = array(result.requests).map(row);
    if (merge === "requestStats") {
      result.users = array(result.users).map(row);
      result.integrations = array(result.integrations).map(descriptor);
    }
    return result;
  }
  // Single-integration native results mostly contain upstream data. Only the documented
  // generic HTTP wrapper's integration descriptor is a reference belonging to Homarr.
  return resultValue;
}

export function mergeFederationResults(strategy: FederationMerge, values: unknown[]): unknown {
  if (strategy === "void") return undefined;
  if (strategy === "first") return values[0];
  if (strategy === "array") return values.flatMap(array);
  const objects = values.map(record);
  const failedIntegrations = objects.flatMap((value) => array(value.failedIntegrations));
  if (strategy === "mediaReleases")
    return { releases: objects.flatMap((value) => array(value.releases)), failedIntegrations };
  if (strategy === "requests") {
    const requests = objects
      .flatMap((value) => array(value.requests))
      .toSorted((left, right) => {
        const a = record(left);
        const b = record(right);
        if (a.status === b.status) return timestamp(b.createdAt) - timestamp(a.createdAt);
        const statuses = mediaRequestStatusConfiguration as Record<string, { position: number }>;
        return (statuses[String(a.status)]?.position ?? 0) - (statuses[String(b.status)]?.position ?? 0);
      });
    return { requests, failedIntegrations };
  }
  return {
    stats: objects.flatMap((value) => array(value.stats)),
    users: objects
      .flatMap((value) => array(value.users))
      .toSorted((a, b) => Number(record(b).requestCount) - Number(record(a).requestCount)),
    integrations: objects.flatMap((value) => array(value.integrations)),
    failedIntegrations,
  };
}

function timestamp(value: unknown) {
  if (value instanceof Date) return value.getTime();
  return new Date(String(value)).getTime();
}

interface FailedTarget {
  id: string;
  name: string;
  kind: string;
}

/** Mirrors each native route's failure contract rather than fabricating a union of payloads. */
export function federationFailureResult(path: string, strategy: FederationMerge, targets: FailedTarget[]): unknown {
  const error = "INTEGRATION_REQUEST_FAILED";
  const failedIntegrations = targets.map((target) => ({
    integrationId: target.id,
    integrationName: target.name,
    error,
  }));
  if (strategy === "mediaReleases") return { releases: [], failedIntegrations };
  if (strategy === "requests") return { requests: [], failedIntegrations };
  if (strategy === "requestStats") return { stats: [], users: [], integrations: [], failedIntegrations };
  if (path === "widget.umami.getVisitorStats") return [];
  return targets.map((target) => {
    const reference = { integrationId: target.id, integrationName: target.name };
    const integration = { id: target.id, name: target.name, kind: target.kind };
    const dated = { ...reference, integrationUrl: "", updatedAt: new Date(0), error };
    switch (path) {
      case "widget.speedtestTracker.getDashboard":
      case "widget.uptimeKuma.getDashboard":
      case "widget.tracearr.getDashboard":
      case "widget.traefik.getDashboard":
        return { ...dated, dashboard: null };
      case "widget.coolify.getInstancesInfo":
        return { ...dated, instanceInfo: null };
      case "widget.ups.getSummaries":
        return { ...dated, summaries: [] };
      case "widget.networkController.summary":
      case "widget.dnsHole.summary":
        return { ...reference, integration, summary: null, error };
      case "widget.notifications.getNotifications":
        return { integration: { ...integration, updatedAt: new Date(0) }, data: [], error };
      case "widget.releases.getServiceVersions":
        return { ...reference, integrationKind: target.kind, version: null, updatedAt: new Date(0), error };
      case "widget.mediaOrganizer.getData":
        return { ...reference, missing: [], missingCount: 0, queued: [], queuedCount: 0, error };
      case "widget.healthMonitoring.getSystemHealthStatus":
        return { ...reference, healthInfo: null, error };
      case "widget.indexerManager.getIndexersStatus":
        return { ...reference, indexers: [], error };
      case "widget.vpn.getSummaries":
        return { integration: { ...integration, updatedAt: new Date(0) }, summary: null, error };
      case "widget.calendar.findAllEvents":
        return { integration, events: [], error };
      case "widget.mediaServer.getCurrentStreams":
        return { ...reference, integrationKind: target.kind, sessions: [], error };
      case "widget.downloads.getJobsAndStatuses":
        return { ...reference, integration, data: null, error };
      case "widget.beszel.getSystems":
        return { ...reference, systems: [], updatedAt: new Date(0), error };
      case "widget.beszel.getAlerts":
        return { ...reference, alerts: [], history: [], systemNameMap: {}, updatedAt: new Date(0), error };
      case "widget.firewall.getFirewallCpuStatus":
        return { integration: { ...integration, updatedAt: new Date(0) }, summary: { total: 0 }, error };
      case "widget.firewall.getFirewallInterfacesStatus":
        return { integration: { ...integration, updatedAt: new Date(0) }, summary: [], error };
      case "widget.firewall.getFirewallVersionStatus":
        return { integration: { ...integration, updatedAt: new Date(0) }, summary: { version: "Unknown" }, error };
      case "widget.firewall.getFirewallMemoryStatus":
        return {
          integration: { ...integration, updatedAt: new Date(0) },
          summary: { used: 0, total: 0, percent: 0 },
          error,
        };
      default:
        throw new Error("Operation has no federation failure contract");
    }
  });
}
