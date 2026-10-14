import type {
  KubernetesContextMetadata as KubernetesContext,
  KubernetesContextsMetadata as KubernetesContexts,
  KubernetesDisplayInventory as KubernetesInventory,
} from "../../source-ui/kubernetes/contracts";

export interface KubernetesTableRow {
  key: string;
  cells: string[];
}

export interface KubernetesTableModel {
  title: string;
  scope: "context" | "cluster" | "all-namespaces";
  headings: string[];
  rows: KubernetesTableRow[];
  statusColumn?: number;
}

export function selectKubernetesContext(
  result: KubernetesContexts,
  requestedContextId?: string | null,
  storedContextId?: string | null,
): KubernetesContext | undefined {
  return (
    result.contexts.find(({ contextId }) => contextId === requestedContextId) ??
    result.contexts.find(({ contextId }) => contextId === storedContextId) ??
    result.contexts.find(({ contextId }) => contextId === result.defaultContextId) ??
    result.contexts[0]
  );
}

function reported(value: string | undefined): string {
  return value || "Not reported";
}

export function kubernetesNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : "Not reported";
}

function percentage(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "Metrics unavailable" : `${value}%`;
}

function created(value: Date | undefined): string {
  return value && Number.isFinite(value.getTime()) ? value.toISOString() : "Not reported";
}

function row(
  resource: { name: string; namespace?: string; creationTimestamp?: Date },
  cells: string[],
  index: number,
): KubernetesTableRow {
  return {
    key: JSON.stringify([resource.namespace, resource.name, index]),
    cells: [...cells, created(resource.creationTimestamp)],
  };
}

export function createKubernetesContextsModel(result: KubernetesContexts): KubernetesTableModel {
  return {
    title: "Contexts",
    scope: "context",
    headings: ["Name", "Context ID", "Availability", "Metrics", "Default"],
    statusColumn: 2,
    rows: result.contexts.map((context) => ({
      key: context.contextId,
      cells: [context.name, context.contextId, context.status, context.metricsStatus, context.isDefault ? "Yes" : "No"],
    })),
  };
}

export function createKubernetesInventoryModel(inventory: KubernetesInventory): KubernetesTableModel {
  const base = ["Name", "Namespace"];
  switch (inventory.kind) {
    case "nodes":
      return {
        title: "Nodes",
        scope: "cluster",
        headings: [
          "State",
          "Name",
          "CPU usage / allocatable",
          "Memory usage / allocatable",
          "OS",
          "Pod capacity",
          "Architecture",
          "Kubernetes version",
          "Created (UTC)",
        ],
        statusColumn: 0,
        rows: inventory.items.map((item, index) =>
          row(
            item,
            [
              item.status,
              reported(item.name),
              percentage(item.allocatableCpuPercentage),
              percentage(item.allocatableRamPercentage),
              reported(item.operatingSystem),
              kubernetesNumber(item.podsCount),
              reported(item.architecture),
              reported(item.kubernetesVersion),
            ],
            index,
          ),
        ),
      };
    case "namespaces":
      return {
        title: "Namespaces",
        scope: "cluster",
        headings: ["Phase", "Name", "Created (UTC)"],
        statusColumn: 0,
        rows: inventory.items.map((item, index) => row(item, [reported(item.status), reported(item.name)], index)),
      };
    case "pods":
      return {
        title: "Pods",
        scope: "all-namespaces",
        headings: [...base, "Images", "Workload type", "Status", "Created (UTC)"],
        statusColumn: 4,
        rows: inventory.items.map((item, index) =>
          row(
            item,
            [
              reported(item.name),
              reported(item.namespace),
              reported(item.image),
              reported(item.applicationType),
              reported(item.status),
            ],
            index,
          ),
        ),
      };
    case "services":
      return {
        title: "Services",
        scope: "all-namespaces",
        headings: [...base, "Type", "Ports", "Target ports", "Cluster IP", "Created (UTC)"],
        rows: inventory.items.map((item, index) =>
          row(
            item,
            [
              reported(item.name),
              reported(item.namespace),
              reported(item.type),
              reported(item.ports?.join(", ")),
              reported(item.targetPorts?.join(", ")),
              reported(item.clusterIP),
            ],
            index,
          ),
        ),
      };
    case "ingresses":
      return {
        title: "Ingresses",
        scope: "all-namespaces",
        headings: [...base, "Class", "Hosts and backends", "Created (UTC)"],
        rows: inventory.items.map((item, index) =>
          row(
            item,
            [
              reported(item.name),
              reported(item.namespace),
              reported(item.className),
              reported(
                item.rulesAndPaths
                  .map(
                    (rule) =>
                      `${reported(rule.host)} → ${rule.paths.map((path) => `${reported(path.serviceName)}:${path.port}`).join(", ") || "Not reported"}`,
                  )
                  .join("\n"),
              ),
            ],
            index,
          ),
        ),
      };
    case "secrets":
      return {
        title: "Secrets",
        scope: "all-namespaces",
        headings: [...base, "Type", "Created (UTC)"],
        rows: inventory.items.map((item, index) =>
          row(item, [reported(item.name), reported(item.namespace), reported(item.type)], index),
        ),
      };
    case "configMaps":
      return {
        title: "ConfigMaps",
        scope: "all-namespaces",
        headings: [...base, "Created (UTC)"],
        rows: inventory.items.map((item, index) => row(item, [reported(item.name), reported(item.namespace)], index)),
      };
    case "volumes":
      return {
        title: "Volumes",
        scope: "all-namespaces",
        headings: [
          "Status",
          ...base,
          "Storage",
          "Storage class",
          "Volume mode",
          "Volume name",
          "Access modes",
          "Created (UTC)",
        ],
        statusColumn: 0,
        rows: inventory.items.map((item, index) =>
          row(
            item,
            [
              reported(item.status),
              reported(item.name),
              reported(item.namespace),
              reported(item.storage),
              reported(item.storageClassName),
              reported(item.volumeMode),
              reported(item.volumeName),
              reported(item.accessModes.join(", ")),
            ],
            index,
          ),
        ),
      };
  }
}

export function filterKubernetesRows(rows: KubernetesTableRow[], search: string): KubernetesTableRow[] {
  const terms = search.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return rows.filter(({ cells }) => {
    const text = cells.join(" ").toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  });
}

export function kubernetesStatusColor(status: string): string {
  if (["Ready", "Active", "Running", "Bound", "Succeeded", "available"].includes(status)) return "green";
  if (["NotReady", "Failed", "Lost", "unavailable"].includes(status)) return "red";
  if (["Terminating", "Pending", "Released", "degraded"].includes(status)) return "yellow";
  return "gray";
}

export function kubernetesCapacityColor(percentageValue: number): string {
  if (percentageValue >= 65) return "red";
  if (percentageValue > 50) return "yellow";
  return "blue";
}
