import type { WidgetKind } from "@homarr/definitions";

const BESZEL_OPTION_PROPERTIES = new Set([
  "statusFilter",
  "showCpu",
  "showMemory",
  "showDisk",
  "showGpu",
  "showLoadAvg",
  "showNet",
  "showTemp",
  "showBattery",
  "showServices",
  "showUptime",
  "showAgent",
]);

const TABLE_OPTION_PROPERTIES = new Set(["columnOrder", "columnWidths", "columns"]);

const LAYOUT_WIDGET_KINDS = new Set(["app", "bookmarks", "wud", "dnsHoleSummary"]);

const PATCHMON_SHARED_WARNING_PROPERTIES = new Set([
  "hostsNeedingUpdatesWarningAt",
  "securityUpdatesWarningAt",
  "hostsWithSecurityUpdatesWarningAt",
  "totalOutdatedPackagesWarningAt",
]);

const PATCHMON_SHARED_CRITICAL_PROPERTIES = new Set([
  "hostsNeedingUpdatesCriticalAt",
  "securityUpdatesCriticalAt",
  "hostsWithSecurityUpdatesCriticalAt",
  "totalOutdatedPackagesCriticalAt",
]);

export const getWidgetOptionTranslationNamespace = (kind: WidgetKind, property: string): string => {
  const sharedNamespace = getSharedOptionNamespace(kind, property);
  const sharedProperty = getSharedOptionProperty(kind, property);
  return `${sharedNamespace ?? `widget.${kind}.option`}.${sharedProperty}`;
};

export const getWidgetOptionDescriptionTranslationNamespace = (
  kind: WidgetKind,
  property: string,
): string | undefined => {
  if (kind !== "patchmon") return undefined;
  if (PATCHMON_SHARED_WARNING_PROPERTIES.has(property)) return "widget.patchmon.option.threshold.warningAt";
  if (PATCHMON_SHARED_CRITICAL_PROPERTIES.has(property)) return "widget.patchmon.option.threshold.criticalAt";
  return undefined;
};

const getSharedOptionProperty = (kind: WidgetKind, property: string): string => {
  if (property === "descendingDefaultSort") return "invertSorting";
  if (kind === "bookmarks" && property === "openNewTab") return "openInNewTab";
  if (kind === "clock" && property === "customTitle") return "title";
  if (kind === "weather" && property === "location") return "weatherLocation";
  return property;
};

const getSharedOptionNamespace = (kind: WidgetKind, property: string): string | undefined => {
  if ((kind === "beszelSystemTable" || kind === "beszelSystemGrid") && BESZEL_OPTION_PROPERTIES.has(property)) {
    return "widget.beszel.options";
  }

  if (["dockerContainers", "downloads", "beszelSystemTable"].includes(kind) && TABLE_OPTION_PROPERTIES.has(property)) {
    return "widget.common.tableOptions";
  }

  if (["dockerContainers", "downloads"].includes(kind)) {
    if (property === "enableRowSorting" || property === "defaultSort" || property === "descendingDefaultSort") {
      return "widget.common.tableOptions";
    }
  }

  if (kind === "weather" && property === "dateFormat") return "widget.common";
  if ((kind === "healthMonitoring" || kind === "systemDisks") && property === "visibleStorageVolumes") {
    return "widget.common";
  }

  if (property === "layout" && LAYOUT_WIDGET_KINDS.has(kind)) return "widget.common";
  if (
    (kind === "bookmarks" && property === "title") ||
    (kind === "clock" && property === "customTitle") ||
    (kind === "minecraftServerStatus" && property === "title") ||
    (kind === "app" && property === "openInNewTab") ||
    (kind === "bookmarks" && property === "openNewTab") ||
    (kind === "wud" && property === "showTitle") ||
    (kind === "anchorNote" && property === "showTitle") ||
    (kind === "clock" && property === "weatherLocation") ||
    (kind === "weather" && property === "location")
  ) {
    return "widget.common";
  }

  return undefined;
};
