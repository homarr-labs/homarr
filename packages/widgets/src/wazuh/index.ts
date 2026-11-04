import { IconServerOff, IconShieldHalfFilled } from "@tabler/icons-react";
import { z } from "zod/v4";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { wazuhTimeRangeOptions } from "./_shared/options";
import type { WazuhView } from "./views";
import { wazuhViews } from "./views";

const hidden = { shouldHide: () => true };

export const { definition, componentLoader } = createWidgetDefinition("wazuh", {
  icon: IconShieldHalfFilled,
  ...getWidgetIntegrationConfig("wazuh"),
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        visibleViews: factory.multiSelect({
          withDescription: true,
          options: wazuhViews.map((value) => ({ value, label: (t) => t(`widget.wazuh.view.${value}`) })),
          defaultValue: [...wazuhViews],
        }),
        range: factory.select({ defaultValue: "24h", options: [...wazuhTimeRangeOptions] }),
        minLevel: factory.number({ defaultValue: 0, step: 1, validate: z.number().int().min(0).max(16) }),

        // Severity tab
        showTrend: factory.switch({ defaultValue: true }),
        showFooter: factory.switch({ defaultValue: true }),

        // Alerts tab
        alertsMinLevel: factory.number({
          defaultValue: 7,
          step: 1,
          withDescription: true,
          validate: z.number().int().min(0).max(16),
        }),
        alertsLimit: factory.number({ defaultValue: 25, step: 1, validate: z.number().int().min(1).max(100) }),
        showMitre: factory.switch({ defaultValue: true }),
        showAgent: factory.switch({ defaultValue: true }),
        showSourceIp: factory.switch({ defaultValue: true }),
        showRuleId: factory.switch({ defaultValue: false }),

        // Timeline tab
        interval: factory.select({
          defaultValue: "auto",
          options: [
            { value: "auto", label: "Automatic" },
            { value: "1m", label: "1 minute" },
            { value: "5m", label: "5 minutes" },
            { value: "15m", label: "15 minutes" },
            { value: "30m", label: "30 minutes" },
            { value: "1h", label: "1 hour" },
            { value: "3h", label: "3 hours" },
            { value: "6h", label: "6 hours" },
            { value: "12h", label: "12 hours" },
            { value: "1d", label: "1 day" },
          ],
        }),
        chartType: factory.select({
          defaultValue: "area",
          options: [
            { value: "area", label: "Stacked area" },
            { value: "bar", label: "Stacked bars" },
          ],
        }),
        yScale: factory.select({
          defaultValue: "linear",
          withDescription: true,
          options: [
            { value: "linear", label: "Linear" },
            { value: "sqrt", label: "Square root (makes rare severities visible)" },
          ],
        }),
        showLegend: factory.switch({ defaultValue: true }),

        // Top lists tab
        topKind: factory.select({
          defaultValue: "rules",
          options: [
            { value: "rules", label: "Top rules" },
            { value: "agents", label: "Top agents by alerts" },
            { value: "sourceIps", label: "Top source IPs" },
            { value: "mitreTactics", label: "Top MITRE ATT&CK tactics" },
            { value: "mitreTechniques", label: "Top MITRE ATT&CK techniques" },
          ],
        }),
        topLimit: factory.number({ defaultValue: 8, step: 1, validate: z.number().int().min(1).max(50) }),
        showBars: factory.switch({ defaultValue: true }),

        // Agents tab
        agentStatusFilter: factory.select({
          defaultValue: "all",
          options: [
            { value: "all", label: "All agents" },
            { value: "active", label: "Active" },
            { value: "disconnected", label: "Disconnected" },
            { value: "inactive", label: "Not active (disconnected, never connected, pending)" },
          ],
        }),
        agentSortBy: factory.select({
          defaultValue: "status",
          options: [
            { value: "status", label: "Status" },
            { value: "name", label: "Name" },
            { value: "ip", label: "IP address" },
            { value: "os", label: "Operating system" },
            { value: "version", label: "Wazuh version" },
            { value: "lastKeepAlive", label: "Last keepalive" },
          ],
        }),
        showVersion: factory.switch({ defaultValue: true }),
        showGroups: factory.switch({ defaultValue: true }),

        // Vulnerabilities tab
        cveOrder: factory.select({
          defaultValue: "score",
          options: [
            { value: "score", label: "Highest score" },
            { value: "agents", label: "Most affected agents" },
          ],
        }),
        minSeverity: factory.select({
          defaultValue: "all",
          options: [
            { value: "all", label: "All severities" },
            { value: "medium", label: "Medium and above" },
            { value: "high", label: "High and above" },
            { value: "critical", label: "Critical only" },
          ],
        }),
        cveLimit: factory.number({ defaultValue: 8, step: 1, validate: z.number().int().min(1).max(50) }),
        agentLimit: factory.number({ defaultValue: 5, step: 1, validate: z.number().int().min(1).max(50) }),
        showAgents: factory.switch({ defaultValue: true }),

        // File integrity tab
        fimEvent: factory.select({
          defaultValue: "all",
          options: [
            { value: "all", label: "All events" },
            { value: "added", label: "Added" },
            { value: "modified", label: "Modified" },
            { value: "deleted", label: "Deleted" },
          ],
        }),
        fimLimit: factory.number({ defaultValue: 20, step: 1, validate: z.number().int().min(1).max(100) }),
        includeRegistry: factory.switch({ defaultValue: true }),

        // Authentication failures tab
        authLimit: factory.number({ defaultValue: 6, step: 1, validate: z.number().int().min(1).max(25) }),
        showSourceIps: factory.switch({ defaultValue: true }),

        // Saved from the widget itself, like the qBittorrent table layout
        view: factory.internal<WazuhView>({ defaultValue: "overview" }),
        // Agents table layout
        columnOrder: factory.text({ defaultValue: "" }),
        columnWidths: factory.text({ defaultValue: "" }),
      }),
      {
        columnOrder: hidden,
        columnWidths: hidden,
      },
    );
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.wazuh.error.unknown.title", { target: "Wazuh" }),
    },
  },
}).withDynamicImport(() => import("./component"));
