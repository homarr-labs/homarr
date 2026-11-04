"use client";

import { Anchor, Badge, Text, VisuallyHidden } from "@mantine/core";
import { useFormatter } from "next-intl";

import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "@homarr/common";
import type { UptimeKumaTag } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";

import classes from "./component.module.css";
import { HeartbeatBar } from "./heartbeat-bar";
import type { MonitorEntry } from "./monitors";
import {
  certificateWarningDays,
  formatRelativeTime,
  formatUptime,
  getMonitorTypeTranslationKey,
  getUptimeTone,
} from "./status";

export interface MonitorRowVisibility {
  heartbeatBar: boolean;
  uptime: boolean;
  responseTime: boolean;
  certificateExpiry: boolean;
  statusDetail: boolean;
  tags: boolean;
}

type MonitorRowVariant = "inline" | "stacked";

interface MonitorRowProps {
  monitor: MonitorEntry;
  variant: MonitorRowVariant;
  visibility: MonitorRowVisibility;
  showDetails: boolean;
  now: Date | null;
}

type Translate = ReturnType<typeof useI18n<"widget.uptimeKuma">>;

export const getMonitorRowTemplate = (variant: MonitorRowVariant, visibility: MonitorRowVisibility) => {
  if (variant === "stacked") return "minmax(0, 1fr)";
  return [
    "minmax(0, 2fr)",
    visibility.heartbeatBar && "minmax(0, 1fr)",
    visibility.responseTime && "4.25em",
    visibility.uptime && "3.75em",
  ]
    .filter(Boolean)
    .join(" ");
};

export const MonitorRow = ({ monitor, variant, visibility, showDetails, now }: MonitorRowProps) => {
  const t = useI18n("widget.uptimeKuma");
  const formatter = useFormatter();
  const href = getSafeApplicationUrl(monitor.url);
  const isStacked = variant === "stacked";
  const relative = (time: number | null) => formatRelativeTime(formatter, time, now);

  const statusDetail = getStatusDetail(monitor, visibility.statusDetail, relative(monitor.statusSince), t);
  const certificate = getCertificateDetail(monitor.certificateDaysRemaining, visibility, showDetails, t);
  const extraDetails = showDetails ? getExtraDetails(monitor, relative(monitor.lastCheckAt), t) : [];
  const orderedDetails = certificate?.isWarning
    ? [certificate.text, ...extraDetails]
    : [...extraDetails, certificate?.text];
  const details = orderedDetails.filter(Boolean).join(" · ");
  const metrics = (
    <>
      {visibility.responseTime && !(isStacked && monitor.ping === null) && (
        <span className={classes.ping}>
          {monitor.ping !== null && t("unit.milliseconds", { value: Math.round(monitor.ping) })}
        </span>
      )}
      {visibility.uptime && (
        <span className={classes.uptime} data-tone={getUptimeTone(monitor.status, monitor.uptime24h)}>
          {monitor.uptime24h !== null && formatUptime(monitor.uptime24h)}
        </span>
      )}
    </>
  );

  return (
    <div className={classes.monitorRow} data-variant={variant} data-status={monitor.status}>
      <div className={classes.monitorMain}>
        <div className={classes.monitorTitle}>
          <span className={classes.dot} data-status={monitor.status} aria-hidden />
          {href ? (
            <Anchor href={href} target="_blank" rel={SAFE_NEW_TAB_REL} c="inherit" className={classes.monitorName}>
              {monitor.name}
            </Anchor>
          ) : (
            <Text component="span" className={classes.monitorName}>
              {monitor.name}
            </Text>
          )}
          {statusDetail ? (
            <span className={classes.monitorStatus}>{statusDetail}</span>
          ) : (
            <VisuallyHidden>{t(`status.${monitor.status}`)}</VisuallyHidden>
          )}
          {visibility.tags && monitor.tags.length > 0 && <MonitorTags tags={monitor.tags} />}
        </div>
        {details && (
          <span className={classes.monitorDetails} data-warning={certificate?.isWarning || undefined}>
            {details}
          </span>
        )}
      </div>
      {!isStacked && visibility.heartbeatBar && <HeartbeatBar heartbeats={monitor.heartbeats} />}
      {!isStacked && metrics}
      {isStacked && (visibility.heartbeatBar || visibility.responseTime || visibility.uptime) && (
        <div className={classes.stackedFooter}>
          {visibility.heartbeatBar && <HeartbeatBar heartbeats={monitor.heartbeats} size="sm" />}
          {metrics}
        </div>
      )}
    </div>
  );
};

const MonitorTags = ({ tags }: { tags: readonly UptimeKumaTag[] }) => (
  <span className={classes.tags}>
    {tags.map((tag) => {
      const label = [tag.name, tag.value].filter(Boolean).join(": ");
      return (
        <Badge key={label} size="xs" variant="light" radius="sm" color={tag.color ?? "gray"} tt="none">
          {label}
        </Badge>
      );
    })}
  </span>
);

const getStatusDetail = (monitor: MonitorEntry, visible: boolean, since: string | null, t: Translate) => {
  if (!visible || monitor.status === "up") return null;
  return [t(`status.${monitor.status}`), since].filter(Boolean).join(" · ");
};

const getExtraDetails = (monitor: MonitorEntry, lastChecked: string | null, t: Translate) => {
  const typeKey = monitor.type === null ? null : getMonitorTypeTranslationKey(monitor.type);
  return [
    typeKey ? t(`monitorType.${typeKey}`) : monitor.type,
    lastChecked && t("detail.checked", { time: lastChecked }),
  ];
};

const getCertificateDetail = (
  daysRemaining: number | null,
  visibility: MonitorRowVisibility,
  showDetails: boolean,
  t: Translate,
) => {
  if (daysRemaining === null) return null;
  const isWarning = daysRemaining <= certificateWarningDays;
  if (!showDetails && !(visibility.certificateExpiry && isWarning)) return null;
  return { text: t("detail.certificate", { count: daysRemaining }), isWarning };
};
