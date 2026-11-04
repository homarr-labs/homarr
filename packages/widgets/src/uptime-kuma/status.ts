import type { MantineColor } from "@mantine/core";
import { IconAlertTriangle, IconCircleCheck, IconCircleX, IconHelpCircle, IconTool } from "@tabler/icons-react";
import type { useFormatter } from "next-intl";

import type {
  UptimeKumaIncidentStyle,
  UptimeKumaMonitorStatus,
  UptimeKumaOverallStatus,
  UptimeKumaSummary,
} from "@homarr/integrations/types";
import { isInactiveUptimeKumaStatus } from "@homarr/integrations/types";
import type { TablerIcon } from "@homarr/ui";

export const monitorStatusColors: Record<UptimeKumaMonitorStatus, MantineColor> = {
  up: "green",
  down: "red",
  pending: "orange",
  maintenance: "blue",
  stale: "gray",
  unknown: "gray",
};

export const overallStatusColors: Record<UptimeKumaOverallStatus, MantineColor> = {
  operational: "green",
  degraded: "orange",
  outage: "red",
  maintenance: "blue",
  unknown: "gray",
};

export const overallStatusIcons: Record<UptimeKumaOverallStatus, TablerIcon> = {
  operational: IconCircleCheck,
  degraded: IconAlertTriangle,
  outage: IconCircleX,
  maintenance: IconTool,
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

const displayedStatusOrder = ["up", "down", "pending", "maintenance", "stale", "unknown"] as const;

export const presentStatuses = (summary: UptimeKumaSummary) =>
  displayedStatusOrder.filter((status) => summary.counts[status] > 0);

type UptimeTone = "healthy" | "warning" | "critical" | "inactive";

export const getUptimeTone = (status: UptimeKumaMonitorStatus, uptime: number | null): UptimeTone => {
  if (uptime === null || isInactiveUptimeKumaStatus(status)) return "inactive";
  if (uptime >= 99) return "healthy";
  if (uptime >= 95) return "warning";
  return "critical";
};

export const formatUptime = (uptime: number) => {
  if (uptime >= 100) return "100%";
  if (uptime >= 99) return `${(Math.floor(uptime * 100) / 100).toFixed(2)}%`;
  return `${(Math.floor(uptime * 10) / 10).toFixed(1)}%`;
};

export const certificateWarningDays = 14;

export const formatRelativeTime = (
  formatter: ReturnType<typeof useFormatter>,
  time: number | null,
  now: Date | null,
) => {
  if (time === null || now === null) return null;
  return formatter.relativeTime(time, { now, style: "narrow" });
};
