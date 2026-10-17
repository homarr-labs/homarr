"use client";

import { Progress, rem, RingProgress, Text, Tooltip } from "@mantine/core";

import type { UptimeKumaSummary } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";

import classes from "./component.module.css";
import { formatUptime, monitorStatusColors, overallStatusColors, overallStatusIcons, presentStatuses } from "./status";

interface SummaryProps {
  summary: UptimeKumaSummary;
}

export const SummaryRing = ({ summary, size }: SummaryProps & { size: number }) => {
  const t = useI18n("widget.uptimeKuma");
  const sections = presentStatuses(summary).map((status) => ({
    value: (summary.counts[status] / summary.total) * 100,
    color: monitorStatusColors[status],
    tooltip: t("summary.statusCount", { count: summary.counts[status], status: t(`status.${status}`) }),
  }));

  return (
    <RingProgress
      size={size}
      thickness={Math.max(4, Math.round(size / 11))}
      rootColor="var(--mantine-color-default-border)"
      sections={sections}
      label={
        <div className={classes.ringLabel} style={{ fontSize: rem(Math.max(12, Math.round(size / 4.2))) }}>
          <span className={classes.ringValue}>{summary.counts.up}</span>
          <span className={classes.ringTotal}>/{summary.total}</span>
        </div>
      }
      aria-label={t("summary.upRatio", { up: summary.counts.up, total: summary.total })}
    />
  );
};

export const OverallStatus = ({
  summary,
  short = false,
  size = "md",
}: SummaryProps & { short?: boolean; size?: "sm" | "md" | "lg" }) => {
  const t = useI18n("widget.uptimeKuma");
  const Icon = overallStatusIcons[summary.overallStatus];
  const color = overallStatusColors[summary.overallStatus];
  const label = short ? getShortLabel(summary, t) : t(`overall.${summary.overallStatus}`);

  return (
    <div className={classes.overallStatus} data-size={size}>
      <Icon className={classes.overallStatusIcon} color={`var(--mantine-color-${color}-6)`} aria-hidden />
      <Text component="span" fw={700} size={size} truncate title={label} c={`${color}.6`}>
        {label}
      </Text>
    </div>
  );
};

export const StatusBreakdown = ({ summary }: SummaryProps) => {
  const t = useI18n("widget.uptimeKuma");

  return (
    <div className={classes.breakdown}>
      {presentStatuses(summary).map((status) => (
        <span key={status} className={classes.breakdownItem}>
          <span className={classes.dot} data-status={status} />
          <span className={classes.breakdownValue}>{summary.counts[status]}</span>
          <span className={classes.breakdownLabel}>{t(`status.${status}`)}</span>
        </span>
      ))}
    </div>
  );
};

export const DistributionBar = ({ summary }: SummaryProps) => {
  const t = useI18n("widget.uptimeKuma");

  return (
    <Progress.Root size="sm" className={classes.distribution}>
      {presentStatuses(summary).map((status) => (
        <Tooltip
          key={status}
          label={t("summary.statusCount", { count: summary.counts[status], status: t(`status.${status}`) })}
          withArrow
        >
          <Progress.Section
            value={(summary.counts[status] / summary.total) * 100}
            color={monitorStatusColors[status]}
          />
        </Tooltip>
      ))}
    </Progress.Root>
  );
};

export const SummaryMetrics = ({
  summary,
  showUptime,
  showResponseTime,
  compact = false,
}: SummaryProps & { showUptime: boolean; showResponseTime: boolean; compact?: boolean }) => {
  const t = useI18n("widget.uptimeKuma");
  const metrics: { key: string; label: string; value: string }[] = [];
  if (showUptime && summary.averageUptime24h !== null) {
    metrics.push({ key: "uptime", label: t("summary.averageUptime"), value: formatUptime(summary.averageUptime24h) });
  }
  if (showResponseTime && summary.averagePing !== null) {
    metrics.push({
      key: "ping",
      label: t("summary.averageResponseTime"),
      value: t("unit.milliseconds", { value: Math.round(summary.averagePing) }),
    });
  }

  if (metrics.length === 0) return null;

  return (
    <div className={classes.metrics}>
      {metrics.map((metric) => (
        <span key={metric.key} className={classes.metric} title={compact ? metric.label : undefined}>
          <span className={classes.metricValue}>{metric.value}</span>
          {!compact && <span className={classes.metricLabel}>{metric.label}</span>}
        </span>
      ))}
    </div>
  );
};

const getShortLabel = (summary: UptimeKumaSummary, t: ReturnType<typeof useI18n<"widget.uptimeKuma">>) => {
  if (summary.counts.down > 0) return t("short.down", { count: summary.counts.down });
  if (summary.counts.pending > 0) return t("short.pending", { count: summary.counts.pending });
  if (summary.overallStatus === "maintenance") return t("short.maintenance");
  if (summary.overallStatus === "operational") return t("short.operational");
  if (summary.overallStatus === "paused") return t("short.paused");
  return t("short.unknown");
};
