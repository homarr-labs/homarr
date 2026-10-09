import { parse, stringify } from "superjson";

import { eq } from "../..";
import type { Database } from "../..";
import type { WidgetKind } from "@homarr/definitions";
import { items } from "../../schema";

type LegacyOptions = Record<string, unknown>;

interface LegacyWazuhWidget {
  view: string;
  /** Legacy option key to the option key of the combined widget. */
  options: Record<string, string>;
}

const legacyWazuhWidgets: Record<string, LegacyWazuhWidget> = {
  wazuhSummary: { view: "overview", options: { range: "range", showTrend: "showTrend", showFooter: "showFooter" } },
  wazuhAlerts: {
    view: "alerts",
    options: {
      minLevel: "alertsMinLevel",
      limit: "alertsLimit",
      showMitre: "showMitre",
      showAgent: "showAgent",
      showSourceIp: "showSourceIp",
      showRuleId: "showRuleId",
    },
  },
  wazuhTimeline: {
    view: "timeline",
    options: {
      range: "range",
      interval: "interval",
      chartType: "chartType",
      yScale: "yScale",
      minLevel: "minLevel",
      showLegend: "showLegend",
    },
  },
  wazuhTopList: {
    view: "top",
    options: { kind: "topKind", range: "range", limit: "topLimit", minLevel: "minLevel", showBars: "showBars" },
  },
  wazuhAgents: {
    view: "agents",
    options: {
      statusFilter: "agentStatusFilter",
      sortBy: "agentSortBy",
      showVersion: "showVersion",
      showGroups: "showGroups",
    },
  },
  wazuhVulnerabilities: {
    view: "vulnerabilities",
    options: {
      cveOrder: "cveOrder",
      minSeverity: "minSeverity",
      cveLimit: "cveLimit",
      agentLimit: "agentLimit",
      showAgents: "showAgents",
    },
  },
  wazuhFim: {
    view: "fim",
    options: { range: "range", event: "fimEvent", limit: "fimLimit", includeRegistry: "includeRegistry" },
  },
  wazuhAuthFailures: { view: "authFailures", options: { limit: "authLimit", showSourceIps: "showSourceIps" } },
};

const hoursToRange = (hours: unknown) => {
  if (typeof hours !== "number") return undefined;
  if (hours <= 1) return "1h";
  if (hours <= 24) return "24h";
  if (hours <= 168) return "7d";
  return "30d";
};

export const convertLegacyWazuhOptions = (kind: string, options: LegacyOptions): LegacyOptions | null => {
  const legacy = legacyWazuhWidgets[kind];
  if (!legacy) return null;

  const converted: LegacyOptions = {};
  for (const [legacyKey, key] of Object.entries(legacy.options)) {
    if (options[legacyKey] !== undefined) converted[key] = options[legacyKey];
  }
  if (kind === "wazuhAuthFailures" || kind === "wazuhAlerts") {
    const range = hoursToRange(options.hours);
    if (range) converted.range = range;
  }
  // Pin the widget to its former view, so existing boards look the same until the user enables more tabs.
  return { ...converted, view: legacy.view, visibleViews: [legacy.view] };
};

/** The eight Wazuh widgets were merged into one tabbed "wazuh" widget. */
export async function migrateWazuhWidgetsAsync(db: Database) {
  const legacyKinds = Object.keys(legacyWazuhWidgets) as WidgetKind[];
  const legacyItems = await db.query.items.findMany({
    where: (table, { inArray }) => inArray(table.kind, legacyKinds),
    columns: { id: true, kind: true, options: true },
  });
  if (legacyItems.length === 0) return;

  console.log(`Migrating legacy Wazuh widgets count=${legacyItems.length}`);

  for (const item of legacyItems) {
    const options = convertLegacyWazuhOptions(item.kind, parse<LegacyOptions>(item.options) ?? {});
    if (!options) continue;
    await db
      .update(items)
      .set({ kind: "wazuh", options: stringify(options) })
      .where(eq(items.id, item.id));
  }

  console.log(`Migrated legacy Wazuh widgets count=${legacyItems.length}`);
}
