"use client";

import { Anchor, Badge, Text, VisuallyHidden } from "@mantine/core";
import { useFormatter } from "next-intl";

import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import classes from "./component.module.css";
import { HeartbeatBar } from "./heartbeat-bar";
import type { MonitorEntry } from "./monitors";
import { certificateWarningDays, formatUptime, getUptimeColor, monitorStatusColors } from "./status";

export interface MonitorRowVisibility {
  heartbeatBar: boolean;
  uptime: boolean;
  responseTime: boolean;
  certificateExpiry: boolean;
}

interface MonitorRowProps {
  monitor: MonitorEntry;
  variant: "inline" | "stacked";
  visibility: MonitorRowVisibility;
  showDetails: boolean;
  now: Date | null;
}

const monitorTypeLabels: Record<string, string> = {
  http: "HTTP",
  keyword: "HTTP keyword",
  "json-query": "HTTP JSON",
  port: "TCP",
  ping: "Ping",
  dns: "DNS",
  docker: "Docker",
  push: "Push",
  group: "Group",
  "real-browser": "Browser",
};

export const getMonitorRowTemplate = (variant: MonitorRowProps["variant"], visibility: MonitorRowVisibility) => {
  if (variant === "stacked") return "auto minmax(0, 1fr)";
  return [
    "auto",
    "minmax(0, 1fr)",
    visibility.heartbeatBar && "minmax(0, 1.25fr)",
    visibility.responseTime && "4.25em",
    visibility.uptime && "4.75em",
  ]
    .filter(Boolean)
    .join(" ");
};

export const MonitorRow = ({ monitor, variant, visibility, showDetails, now }: MonitorRowProps) => {
  const t = useI18n("widget.uptimeKuma");
  const formatter = useFormatter();
  const href = getSafeApplicationUrl(monitor.url);
  const relative = (time: number | null) =>
    time !== null && now ? formatter.relativeTime(time, { now, style: "narrow" }) : null;

  const statusDetail =
    monitor.status === "up"
      ? null
      : [t(`status.${monitor.status}`), relative(monitor.statusSince)].filter(Boolean).join(" · ");
  const certificateDetail = getCertificateDetail(monitor.certificateDaysRemaining, visibility, showDetails, t);
  const extraDetails = showDetails
    ? [
        monitor.type ? (monitorTypeLabels[monitor.type] ?? monitor.type) : null,
        monitor.lastCheckAt !== null ? t("detail.checked", { time: relative(monitor.lastCheckAt) ?? "" }) : null,
        monitor.averagePing !== null
          ? t("detail.averagePing", { value: t("unit.milliseconds", { value: Math.round(monitor.averagePing) }) })
          : null,
      ]
    : [];
  const details = [certificateDetail?.text, ...extraDetails].filter(Boolean).join(" · ");

  const isStacked = variant === "stacked";
  const metrics = (
    <>
      {visibility.responseTime && !(isStacked && monitor.ping === null) && (
        <span className={classes.ping}>
          {monitor.ping === null ? "–" : t("unit.milliseconds", { value: Math.round(monitor.ping) })}
        </span>
      )}
      {visibility.uptime && <UptimeValue uptime={monitor.uptime24h} plain={isStacked} />}
    </>
  );
  const hasStackedFooter = visibility.heartbeatBar || visibility.responseTime || visibility.uptime;

  const name = href ? (
    <Anchor href={href} target="_blank" rel={SAFE_NEW_TAB_REL} c="inherit" truncate className={classes.monitorName}>
      {monitor.name}
    </Anchor>
  ) : (
    <Text component="span" truncate className={classes.monitorName}>
      {monitor.name}
    </Text>
  );

  return (
    <div className={classes.monitorRow} data-variant={variant} data-status={monitor.status}>
      <span className={classes.dot} data-status={monitor.status} aria-hidden />
      <div className={classes.monitorMain}>
        {name}
        {!statusDetail && <VisuallyHidden>{t(`status.${monitor.status}`)}</VisuallyHidden>}
        {(statusDetail || details) && (
          <div className={classes.monitorDetails}>
            {statusDetail && (
              <Text component="span" c={`${monitorStatusColors[monitor.status]}.6`} inherit>
                {statusDetail}
              </Text>
            )}
            {details && (
              <Text component="span" c={certificateDetail?.isWarning ? "orange.6" : "dimmed"} inherit truncate>
                {statusDetail ? ` · ${details}` : details}
              </Text>
            )}
          </div>
        )}
      </div>
      {variant === "inline" ? (
        <>
          {visibility.heartbeatBar && <HeartbeatBar heartbeats={monitor.heartbeats} />}
          {metrics}
        </>
      ) : (
        hasStackedFooter && (
          <div className={classes.stackedFooter}>
            {visibility.heartbeatBar && <HeartbeatBar heartbeats={monitor.heartbeats} size="sm" />}
            {metrics}
          </div>
        )
      )}
    </div>
  );
};

const UptimeValue = ({ uptime, plain }: { uptime: number | null; plain: boolean }) => {
  if (uptime === null) {
    return (
      <Text component="span" c="dimmed" className={classes.uptime}>
        –
      </Text>
    );
  }

  if (plain) {
    return (
      <Text component="span" fw={600} c={`${getUptimeColor(uptime)}.6`} className={classes.uptime}>
        {formatUptime(uptime)}
      </Text>
    );
  }

  return (
    <span className={classes.uptime}>
      <Badge variant="light" size="sm" radius="xl" color={getUptimeColor(uptime)} className={classes.uptimeBadge}>
        {formatUptime(uptime)}
      </Badge>
    </span>
  );
};

const getCertificateDetail = (
  daysRemaining: number | null,
  visibility: MonitorRowVisibility,
  showDetails: boolean,
  t: ReturnType<typeof useI18n<"widget.uptimeKuma">>,
) => {
  if (daysRemaining === null) return null;
  const isWarning = daysRemaining <= certificateWarningDays;
  if (!showDetails && !(visibility.certificateExpiry && isWarning)) return null;
  return { text: t("detail.certificate", { count: daysRemaining }), isWarning };
};
