import type { MantineColor } from "@mantine/core";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconHelpCircle,
  IconPlayerPause,
  IconTool,
} from "@tabler/icons-react";

import type {
  UptimeKumaIncidentStyle,
  UptimeKumaMonitorStatus,
  UptimeKumaOverallStatus,
  UptimeKumaSummary,
} from "@homarr/integrations/types";
import type { TablerIcon } from "@homarr/ui";

export const monitorStatusColors: Record<UptimeKumaMonitorStatus, MantineColor> = {
  up: "green",
  down: "red",
  pending: "orange",
  maintenance: "blue",
  paused: "gray",
  unknown: "gray",
};

export const overallStatusColors: Record<UptimeKumaOverallStatus, MantineColor> = {
  operational: "green",
  degraded: "orange",
  outage: "red",
  maintenance: "blue",
  paused: "gray",
  unknown: "gray",
};

export const overallStatusIcons: Record<UptimeKumaOverallStatus, TablerIcon> = {
  operational: IconCircleCheck,
  degraded: IconAlertTriangle,
  outage: IconCircleX,
  maintenance: IconTool,
  paused: IconPlayerPause,
  unknown: IconHelpCircle,
};

export const incidentStyleColors: Record<UptimeKumaIncidentStyle, MantineColor> = {
  info: "cyan",
  warning: "yellow",
  danger: "red",
  primary: "green",
  light: "gray",
  dark: "dark",
};

type MonitorTypeTranslationKey =
  | "http"
  | "keyword"
  | "jsonQuery"
  | "port"
  | "ping"
  | "dns"
  | "docker"
  | "push"
  | "group"
  | "realBrowser";

const monitorTypeTranslationKeys = new Map<string, MonitorTypeTranslationKey>([
  ["http", "http"],
  ["keyword", "keyword"],
  ["json-query", "jsonQuery"],
  ["port", "port"],
  ["ping", "ping"],
  ["dns", "dns"],
  ["docker", "docker"],
  ["push", "push"],
  ["group", "group"],
  ["real-browser", "realBrowser"],
]);

export const getMonitorTypeTranslationKey = (type: string) => monitorTypeTranslationKeys.get(type) ?? null;

const displayedStatusOrder = ["up", "down", "pending", "maintenance", "paused", "unknown"] as const;

export const presentStatuses = (summary: UptimeKumaSummary) =>
  displayedStatusOrder.filter((status) => summary.counts[status] > 0);

const uptimeColorThresholds = [
  { minimum: 99, color: "green" },
  { minimum: 95, color: "yellow" },
  { minimum: 0, color: "red" },
] as const satisfies { minimum: number; color: MantineColor }[];

export const getUptimeColor = (uptime: number): MantineColor =>
  uptimeColorThresholds.find(({ minimum }) => uptime >= minimum)?.color ?? "red";

export const formatUptime = (uptime: number) => {
  if (uptime >= 100) return "100%";
  if (uptime >= 99) return `${(Math.floor(uptime * 100) / 100).toFixed(2)}%`;
  return `${(Math.floor(uptime * 10) / 10).toFixed(1)}%`;
};

export const certificateWarningDays = 14;
