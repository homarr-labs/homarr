"use client";

import { Progress, rem, RingProgress, Text, Tooltip } from "@mantine/core";

import type { UptimeKumaSummary } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";

import classes from "./component.module.css";
import type { BreakdownLayout } from "./layout";
import { estimateSmallTextWidth, getBreakdownLayout, summaryGap } from "./layout";
import { formatUptime, monitorStatusColors, overallStatusColors, overallStatusIcons, presentStatuses } from "./status";

interface SummaryProps {
  summary: UptimeKumaSummary;
}

export const SummaryRing = ({ summary, size }: SummaryProps & { size: number }) => {
  const t = useI18n("widget.uptimeKuma");
  const sections = presentStatuses(summary).map((status) => ({
    value: (summary.counts[status] / summary.total) * 100,
    color: `${monitorStatusColors[status]}.6`,
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
}: SummaryProps & { short?: boolean; size?: "sm" | "md" }) => {
  const t = useI18n("widget.uptimeKuma");
  const Icon = overallStatusIcons[summary.overallStatus];
  const color = overallStatusColors[summary.overallStatus];
  const label = short ? getShortStatusLabel(summary, t) : getOverallStatusLabel(summary, t);

  return (
    <div className={classes.overallStatus} data-size={size}>
      <Icon className={classes.overallStatusIcon} color={`var(--mantine-color-${color}-6)`} aria-hidden />
      <Text component="span" fw={700} size={size} truncate title={label}>
        {label}
      </Text>
    </div>
  );
};

export const useBreakdownLayout = (summary: UptimeKumaSummary, availableWidth: number) => {
  const t = useI18n("widget.uptimeKuma");
  const items = presentStatuses(summary).map((status) => `${summary.counts[status]} ${t(`status.${status}`)}`);
  return getBreakdownLayout(items, availableWidth);
};

export const StatusBreakdown = ({ summary, layout }: SummaryProps & { layout: BreakdownLayout["kind"] }) => {
  const t = useI18n("widget.uptimeKuma");

  return (
    <div className={classes.breakdown} data-layout={layout}>
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

export const SummaryLine = ({ summary, showUptime, width }: SummaryProps & { showUptime: boolean; width: number }) => {
  const t = useI18n("widget.uptimeKuma");
  const uptime = showUptime ? getAverageUptimeText(summary) : null;
  const uptimeWidth = uptime ? estimateSmallTextWidth(`${uptime} ${t("summary.averageUptime")}`) + summaryGap : 0;
  const breakdown = useBreakdownLayout(summary, width - uptimeWidth);
  const counts = { up: summary.counts.up, total: summary.total };
  const ratio = t("summary.upRatio", counts);
  const fittingRatio = estimateSmallTextWidth(ratio) + uptimeWidth <= width ? ratio : t("summary.upRatioShort", counts);

  return (
    <div className={classes.summaryLine}>
      {breakdown.kind === "inline" ? (
        <StatusBreakdown summary={summary} layout="inline" />
      ) : (
        <Text component="span" size="xs" c="dimmed" truncate title={ratio} className={classes.summaryRatio}>
          {fittingRatio}
        </Text>
      )}
      {uptime && <AverageUptime value={uptime} />}
    </div>
  );
};

export const AverageUptime = ({ value }: { value: string }) => {
  const t = useI18n("widget.uptimeKuma");

  return (
    <span className={classes.metric}>
      <span className={classes.metricValue}>{value}</span>
      <span className={classes.metricLabel}>{t("summary.averageUptime")}</span>
    </span>
  );
};

export const getAverageUptimeText = (summary: UptimeKumaSummary) =>
  summary.averageUptime24h === null ? null : formatUptime(summary.averageUptime24h);

export const DistributionBar = ({ summary }: SummaryProps) => {
  const t = useI18n("widget.uptimeKuma");

  return (
    <Progress.Root size="sm" radius="xs" className={classes.distribution}>
      {presentStatuses(summary).map((status) => (
        <Tooltip
          key={status}
          label={t("summary.statusCount", { count: summary.counts[status], status: t(`status.${status}`) })}
          withArrow
        >
          <Progress.Section
            value={(summary.counts[status] / summary.total) * 100}
            color={`${monitorStatusColors[status]}.6`}
          />
        </Tooltip>
      ))}
    </Progress.Root>
  );
};

export const getOverallStatusLabel = (
  summary: UptimeKumaSummary,
  t: ReturnType<typeof useI18n<"widget.uptimeKuma">>,
) => {
  if (summary.overallStatus !== "unknown") return t(`overall.${summary.overallStatus}`);
  if (summary.counts.up > 0) return t("summary.upRatio", { up: summary.counts.up, total: summary.total });
  if (summary.counts.stale > 0) return t("status.stale");
  return t("overall.unknown");
};

export const getShortStatusLabel = (summary: UptimeKumaSummary, t: ReturnType<typeof useI18n<"widget.uptimeKuma">>) => {
  if (summary.counts.down > 0) return t("short.down", { count: summary.counts.down });
  if (summary.counts.pending > 0) return t("short.pending", { count: summary.counts.pending });
  if (summary.overallStatus === "maintenance") return t("short.maintenance");
  if (summary.overallStatus === "operational") return t("short.operational");
  if (summary.counts.up > 0) return t("summary.upRatioShort", { up: summary.counts.up, total: summary.total });
  if (summary.counts.stale > 0) return t("status.stale");
  return t("short.unknown");
};
